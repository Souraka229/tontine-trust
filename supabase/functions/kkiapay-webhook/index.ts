import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kkiapay-signature",
};

function mapKkiapayStatus(raw: string | undefined): string {
  const s = (raw ?? "").toUpperCase();
  if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "COMPLETED") return "success";
  if (s === "FAILED" || s === "CANCELLED") return "failed";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const transactionId =
      payload?.transactionId ??
      payload?.transaction_id ??
      payload?.data?.transactionId;
    const status = mapKkiapayStatus(payload?.status ?? payload?.data?.status);

    if (!transactionId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing transactionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: tx, error: findErr } = await supabase
      .from("transactions")
      .select("id, profile_id, amount, type")
      .eq("kkiapay_transaction_id", transactionId)
      .maybeSingle();

    if (findErr) throw findErr;

    if (tx) {
      const { error: updErr } = await supabase
        .from("transactions")
        .update({
          kkiapay_status: status,
          talypay_status: status,
        })
        .eq("id", tx.id);
      if (updErr) throw updErr;
    }

    await supabase.from("payment_requests").update({ status }).eq("kkiapay_transaction_id", transactionId);

    return new Response(JSON.stringify({ ok: true, transactionId, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "webhook error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
