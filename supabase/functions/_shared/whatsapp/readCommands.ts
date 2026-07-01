import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppCommandContext, WhatsAppCommandResult } from "./types.ts";
import { formatBtc, formatFCFA } from "./utils.ts";
import { resolveUserId, ensureProfileFromPhone, syncPhoneOnProfile } from "./profile.ts";
import { createLnbitsInvoice, isLnbitsConfigured } from "../lnbits/client.ts";

async function fetchBtcPool(supabase: SupabaseClient) {
  const fallback = { tvlFcfa: 0, btcReserve: 0, satsLiquid: 0, lnSats: 0, apy: 0 };
  const { data } = await supabase.from("btc_treasury_pool").select("*").eq("id", 1).maybeSingle();
  if (!data) return fallback;
  return {
    tvlFcfa: Number(data.tvl_fcfa),
    btcReserve: Number(data.btc_reserve),
    satsLiquid: Number(data.sats_liquid),
    lnSats: Number(data.ln_sats ?? 0),
    apy: Number(data.apy),
  };
}

async function fetchBitcoinMarket() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,xof&include_24hr_change=true",
  );
  if (!res.ok) throw new Error("CoinGecko indisponible");
  const json = await res.json();
  const btc = json.bitcoin ?? {};
  return {
    priceXof: Number(btc.xof ?? 0),
    priceUsd: Number(btc.usd ?? 0),
    change24h: Number(btc.usd_24h_change ?? 0),
  };
}

export async function handleReadCommand(
  cmd: string,
  ctx: WhatsAppCommandContext,
  userId: string,
): Promise<WhatsAppCommandResult | null> {
  const { supabase, appOrigin } = ctx;
  const origin = appOrigin ?? "https://tontinechain.app";

  if (cmd === "solde") {
    const { data } = await supabase.from("profiles").select("wallet_balance, total_locked").eq("id", userId).single();
    if (!data) return { success: false, reply: "❌ Profil introuvable." };
    return {
      success: true,
      reply: [
        "💰 *Votre portefeuille*",
        `Disponible : *${formatFCFA(Number(data.wallet_balance))}*`,
        `Verrouillé (cotisations) : *${formatFCFA(Number(data.total_locked))}*`,
      ].join("\n"),
    };
  }

  if (cmd === "score") {
    const { data } = await supabase.from("profiles").select("score, max_score, name").eq("id", userId).single();
    if (!data) return { success: false, reply: "❌ Profil introuvable." };
    return {
      success: true,
      reply: `⭐ *Score de ${data.name}*\n${data.score} / ${data.max_score} points`,
    };
  }

  if (cmd === "groupes" || cmd === "groupe") {
    const { data } = await supabase
      .from("group_members")
      .select("groups(id, name, status, current_round, total_rounds, contribution_amount, invite_code)")
      .eq("profile_id", userId);
    if (!data?.length) {
      return {
        success: true,
        reply: "📭 Aucun groupe.\nTapez *CREER* ou *REJOINDRE CODE* pour commencer.",
      };
    }
    const lines = data.map((row, i) => {
      const g = row.groups as {
        name: string;
        status: string;
        current_round: number;
        total_rounds: number;
        contribution_amount: number;
        invite_code: string | null;
      };
      const code = g.invite_code ? ` · ${g.invite_code}` : "";
      return `${i + 1}. *${g.name}*${code} — tour ${g.current_round}/${g.total_rounds} · ${formatFCFA(g.contribution_amount)} · ${g.status}`;
    });
    return { success: true, reply: ["👥 *Vos tontines*", "", ...lines].join("\n") };
  }

  if (cmd === "cotiser") {
    const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", userId).single();
    const balance = Number(profile?.wallet_balance ?? 0);

    const { data } = await supabase
      .from("group_members")
      .select("groups(id, name, contribution_amount)")
      .eq("profile_id", userId)
      .eq("status", "waiting")
      .limit(5);

    if (!data?.length) return { success: true, reply: "✅ Aucune cotisation en attente pour ce tour." };

    const lines = data.map((row) => {
      const g = row.groups as { id: string; name: string; contribution_amount: number };
      const due = Number(g.contribution_amount) + 20;
      const canWallet = balance >= due;
      const link = `${origin}/cotiser?group=${g.id}`;
      return canWallet
        ? `• *${g.name}* — ${formatFCFA(due)} (solde OK, prélèvement auto à l'échéance)`
        : `• *${g.name}* — ${formatFCFA(due)}\n  Payer : ${link}`;
    });

    return { success: true, reply: ["💳 *Cotisations dues*", "", ...lines].join("\n") };
  }

  if (cmd === "liquidity" || cmd === "crypto") {
    const pool = await fetchBtcPool(supabase);
    return {
      success: true,
      reply: [
        "₿ *Trésor TontineChain*",
        `TVL : *${formatFCFA(pool.tvlFcfa)}*`,
        `Réserve BTC : *${pool.btcReserve.toFixed(4)} BTC*`,
        `Sats liquides : *${pool.satsLiquid.toLocaleString("fr-FR")}*`,
        `Lightning (LN) : *${pool.lnSats.toLocaleString("fr-FR")}* sats`,
        `APY : *${pool.apy}%*`,
        "",
        `Dépôt LN : ${origin}/crypto`,
      ].join("\n"),
    };
  }

  if (cmd === "invoice" || cmd === "ln") {
    if (!isLnbitsConfigured()) {
      return { success: false, reply: "⚡ LNbits non configuré sur le serveur." };
    }
    const amount = Math.floor(Number(args[0] ?? "500"));
    if (!amount || amount < 1) {
      return { success: false, reply: "Usage : *INVOICE 500* (montant en sats)" };
    }
    try {
      const inv = await createLnbitsInvoice(amount, `TontineChain WhatsApp ${userId.slice(0, 8)}`);
      const bolt11 = inv.payment_request ?? inv.bolt11;
      await supabase.from("btc_ln_payments").upsert(
        {
          payment_hash: inv.payment_hash,
          bolt11,
          amount_msat: amount * 1000,
          sats: amount,
          status: "pending",
          purpose: "treasury_deposit",
          profile_id: userId,
          memo: "WhatsApp invoice",
        },
        { onConflict: "payment_hash" },
      );
      return {
        success: true,
        reply: [
          "⚡ *Facture Lightning*",
          `Montant : *${amount.toLocaleString("fr-FR")} sats*`,
          "",
          bolt11.length > 180 ? `${bolt11.slice(0, 180)}…` : bolt11,
          "",
          `Payez avec Phoenix / WoS puis ouvrez : ${origin}/crypto`,
        ].join("\n"),
      };
    } catch (e) {
      return {
        success: false,
        reply: `❌ Facture LN : ${e instanceof Error ? e.message : "erreur"}`,
      };
    }
  }

  if (cmd === "bitcoin" || cmd === "btc") {
    const m = await fetchBitcoinMarket();
    const pool = await fetchBtcPool(supabase);
    const equiv = m.priceXof > 0 ? formatBtc(pool.tvlFcfa / m.priceXof) : "—";
    return {
      success: true,
      reply: [
        "₿ *Bitcoin (live)*",
        `1 BTC = *${formatFCFA(m.priceXof)}*`,
        `≈ $${Math.round(m.priceUsd).toLocaleString("en-US")} USD`,
        `24h : *${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}%*`,
        "",
        `Trésor (${formatFCFA(pool.tvlFcfa)}) ≈ *${equiv}*`,
        "Source : CoinGecko",
      ].join("\n"),
    };
  }

  if (cmd === "notifs" || cmd === "notifications") {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId)
      .eq("is_read", false);
    return {
      success: true,
      reply: count
        ? `🔔 *${count}* notification(s) non lue(s).\nOuvrez l'app → Notifications`
        : "✅ Aucune notification en attente.",
    };
  }

  return null;
}

export async function requireUserId(ctx: WhatsAppCommandContext): Promise<string | null> {
  let userId = await resolveUserId(ctx.supabase, ctx);
  if (!userId && ctx.phone && ctx.serviceRole) {
    userId = await ensureProfileFromPhone(ctx.supabase, ctx.phone);
    if (userId && ctx.phone) {
      await syncPhoneOnProfile(ctx.supabase, userId, ctx.phone);
    }
  }
  return userId;
}
