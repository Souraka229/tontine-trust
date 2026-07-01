import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLnbitsPayment } from "./client.ts";

export async function ingestPaidLnPayment(
  supabase: SupabaseClient,
  paymentHash: string,
  priceXof: number | null,
): Promise<{ ingested: boolean; duplicate: boolean; sats: number }> {
  const payment = await getLnbitsPayment(paymentHash);
  if (!payment.paid) {
    return { ingested: false, duplicate: false, sats: payment.amount };
  }

  const { data: lnRow } = await supabase
    .from("btc_ln_payments")
    .select("profile_id, sats, status")
    .eq("payment_hash", paymentHash)
    .maybeSingle();

  const sats = lnRow?.sats ?? payment.amount;
  const profileId = lnRow?.profile_id ?? null;

  const { data, error } = await supabase.rpc("rpc_btc_ingest_ln_payment", {
    p_payment_hash: paymentHash,
    p_sats: sats,
    p_bolt11: payment.payment_request ?? payment.bolt11 ?? null,
    p_price_xof: priceXof,
    p_profile_id: profileId,
  });

  if (error) throw error;

  const row = data as { duplicate?: boolean };
  return {
    ingested: !row?.duplicate,
    duplicate: Boolean(row?.duplicate),
    sats,
  };
}
