import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLnbitsInvoice, isLnbitsConfigured } from "../_shared/lnbits/client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isLnbitsConfigured()) {
    return new Response(
      JSON.stringify({ ok: false, error: "LNbits non configuré (LNBITS_URL + LNBITS_TREASURY_INVOICE_KEY)" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: {
    amount_sats?: number;
    memo?: string;
    purpose?: string;
    profile_id?: string;
    group_id?: string;
  } = {};

  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    /* ignore */
  }

  const amountSats = Math.floor(Number(body.amount_sats ?? 0));
  if (!amountSats || amountSats < 1) {
    return new Response(
      JSON.stringify({ ok: false, error: "amount_sats requis (min 1)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (amountSats > 10_000_000) {
    return new Response(
      JSON.stringify({ ok: false, error: "Montant max 10 000 000 sats" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const memo = body.memo?.trim() || "TontineChain trésor Lightning";
  const purpose = body.purpose ?? "treasury_deposit";

  try {
    const invoice = await createLnbitsInvoice(amountSats, memo);
    const bolt11 = invoice.payment_request ?? invoice.bolt11;
    const paymentHash = invoice.payment_hash;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("btc_ln_payments").upsert(
      {
        payment_hash: paymentHash,
        bolt11,
        amount_msat: amountSats * 1000,
        sats: amountSats,
        status: "pending",
        purpose,
        profile_id: body.profile_id ?? null,
        group_id: body.group_id ?? null,
        memo,
      },
      { onConflict: "payment_hash" },
    );

    return new Response(
      JSON.stringify({
        ok: true,
        payment_hash: paymentHash,
        bolt11,
        amount_sats: amountSats,
        lnurl_pay: bolt11,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Erreur LNbits" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
