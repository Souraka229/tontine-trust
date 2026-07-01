import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestPaidLnPayment } from "../_shared/lnbits/ingest.ts";
import { isLnbitsConfigured } from "../_shared/lnbits/client.ts";

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
      JSON.stringify({ ok: false, paid: false, error: "LNbits non configuré" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let paymentHash = "";
  let priceXof: number | null = null;

  try {
    const body = await req.json();
    paymentHash = String(body.payment_hash ?? body.paymentHash ?? "").trim();
    if (body.price_xof) priceXof = Number(body.price_xof);
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "payment_hash requis" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!paymentHash) {
    return new Response(
      JSON.stringify({ ok: false, error: "payment_hash requis" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const result = await ingestPaidLnPayment(supabase, paymentHash, priceXof);

    if (!result.ingested && !result.duplicate) {
      return new Response(
        JSON.stringify({ ok: true, paid: false, payment_hash: paymentHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        paid: true,
        ingested: result.ingested,
        duplicate: result.duplicate,
        payment_hash: paymentHash,
        sats: result.sats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "check failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
