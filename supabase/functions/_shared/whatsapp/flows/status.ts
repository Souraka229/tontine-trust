import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppCommandResult } from "../types.ts";
import { formatFCFA, FREQ_LABELS } from "../utils.ts";

type GroupRow = {
  id: string;
  name: string;
  status: string;
  invite_code: string | null;
  current_round: number;
  total_rounds: number;
  contribution_amount: number;
  members_count: number;
  max_members: number;
  frequency: string;
  cotisation_deadline_at: string | null;
};

async function getPrimaryGroup(supabase: SupabaseClient, profileId: string): Promise<GroupRow | null> {
  const { data } = await supabase
    .from("group_members")
    .select(
      "joined_at, groups(id, name, status, invite_code, current_round, total_rounds, contribution_amount, members_count, max_members, frequency, cotisation_deadline_at)",
    )
    .eq("profile_id", profileId)
    .order("joined_at", { ascending: false });

  if (!data?.length) return null;
  const row = data.find((r) => {
    const g = r.groups as { status: string };
    return g.status !== "completed" && g.status !== "cancelled";
  });
  if (!row) return null;
  return row.groups as GroupRow;
}

export async function handleTontine(supabase: SupabaseClient, profileId: string): Promise<WhatsAppCommandResult> {
  const group = await getPrimaryGroup(supabase, profileId);
  if (!group) {
    return {
      success: true,
      reply: "❌ Aucune tontine active.\nTapez *CREER* ou *REJOINDRE CODE* pour commencer.",
    };
  }

  const freq = FREQ_LABELS[group.frequency as keyof typeof FREQ_LABELS] ?? group.frequency;
  const code = group.invite_code ? `\n🔑 Code : *${group.invite_code}*` : "";
  const deadline = group.cotisation_deadline_at
    ? `\n⏰ Échéance : ${new Date(group.cotisation_deadline_at).toLocaleString("fr-FR")}`
    : "";

  if (group.status === "pending") {
    return {
      success: true,
      reply: [
        `📋 *${group.name}* (en attente)${code}`,
        `👥 ${group.members_count}/${group.max_members} membres`,
        `💰 ${formatFCFA(group.contribution_amount)}/tour`,
        `🔁 ${freq}`,
        "",
        "En attente que tous les membres rejoignent…",
      ].join("\n"),
    };
  }

  const { count: paid } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id)
    .eq("status", "paid");

  const { count: total } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id)
    .neq("status", "excluded");

  return {
    success: true,
    reply: [
      `⚡ *${group.name}*`,
      `📊 Tour *${group.current_round}/${group.total_rounds}*`,
      `💰 ${formatFCFA(group.contribution_amount)}/membre`,
      `✅ Payés : *${paid ?? 0}/${total ?? 0}*${deadline}`,
      `🔁 ${freq}`,
    ].join("\n"),
  };
}

export async function handleMembres(supabase: SupabaseClient, profileId: string): Promise<WhatsAppCommandResult> {
  const group = await getPrimaryGroup(supabase, profileId);
  if (!group) {
    return { success: true, reply: "❌ Aucune tontine active." };
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("turn_order, status, profiles(name)")
    .eq("group_id", group.id)
    .neq("status", "excluded")
    .order("turn_order", { ascending: true });

  if (!members?.length) return { success: true, reply: "Aucun membre trouvé." };

  const lines = members.map((m) => {
    const name = (m.profiles as { name: string } | null)?.name ?? "Membre";
    const star = m.status === "paid" ? " ✓" : "";
    return `Tour ${m.turn_order} → *${name}* (${m.status})${star}`;
  });

  return {
    success: true,
    reply: [`👥 *Membres — ${group.name}*`, "", ...lines].join("\n"),
  };
}

export async function handleHistorique(
  supabase: SupabaseClient,
  profileId: string,
): Promise<WhatsAppCommandResult> {
  const group = await getPrimaryGroup(supabase, profileId);
  if (!group) {
    return { success: true, reply: "❌ Aucune tontine active." };
  }

  const { data: txs } = await supabase
    .from("transactions")
    .select("name, amount, type, created_at")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!txs?.length) {
    return { success: true, reply: `📜 *${group.name}*\nAucune transaction enregistrée pour l'instant.` };
  }

  const lines = txs.map((t) => {
    const date = new Date(t.created_at).toLocaleDateString("fr-FR");
    const sign = Number(t.amount) >= 0 ? "+" : "";
    return `• ${date} — ${t.name} : ${sign}${formatFCFA(Number(t.amount))}`;
  });

  return {
    success: true,
    reply: [`📜 *Historique — ${group.name}*`, "", ...lines].join("\n"),
  };
}
