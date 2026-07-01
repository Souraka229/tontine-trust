import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingestPaidLnPayment } from "../_shared/lnbits/ingest.ts";
import { isLnbitsConfigured } from "../_shared/lnbits/client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lnbits-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isLnbitsConfigured()) {
    return new Response("LNbits not configured", { status: 503, headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("LNBITS_WEBHOOK_SECRET")?.trim();
  if (webhookSecret) {
    const sig = req.headers.get("x-lnbits-signature") ?? req.headers.get("authorization");
    if (sig !== webhookSecret && sig !== `Bearer ${webhookSecret}`) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const paymentHash = String(
    payload.payment_hash ?? payload.paymentHash ?? payload.hash ?? "",
  ).trim();

  if (!paymentHash) {
    return new Response("payment_hash missing", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const result = await ingestPaidLnPayment(supabase, paymentHash, null);
    return new Response(
      JSON.stringify({ ok: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "webhook failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
