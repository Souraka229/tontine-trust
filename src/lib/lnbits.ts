import { supabase } from "@/lib/supabase";

export interface LnInvoiceResult {
  payment_hash: string;
  bolt11: string;
  amount_sats: number;
}

export interface LnCheckResult {
  paid: boolean;
  ingested?: boolean;
  duplicate?: boolean;
  sats?: number;
}

export function isLnbitsEnabled(): boolean {
  return import.meta.env.VITE_LNBITS_ENABLED !== "false";
}

export function getLnbitsPublicUrl(): string {
  return (import.meta.env.VITE_LNBITS_URL as string | undefined)?.trim() ?? "";
}

export async function createLnInvoice(
  amountSats: number,
  opts?: { memo?: string; profileId?: string; groupId?: string },
): Promise<LnInvoiceResult> {
  const { data, error } = await supabase.functions.invoke("lnbits-create-invoice", {
    body: {
      amount_sats: amountSats,
      memo: opts?.memo ?? "TontineChain trésor",
      profile_id: opts?.profileId ?? null,
      group_id: opts?.groupId ?? null,
    },
  });

  if (error) throw new Error(error.message);
  const payload = data as { ok?: boolean; error?: string; payment_hash?: string; bolt11?: string; amount_sats?: number };
  if (!payload?.ok || !payload.payment_hash || !payload.bolt11) {
    throw new Error(payload?.error ?? "Échec création facture LN");
  }

  return {
    payment_hash: payload.payment_hash,
    bolt11: payload.bolt11,
    amount_sats: payload.amount_sats ?? amountSats,
  };
}

export async function checkLnPayment(paymentHash: string, priceXof?: number): Promise<LnCheckResult> {
  const { data, error } = await supabase.functions.invoke("lnbits-check-payment", {
    body: { payment_hash: paymentHash, price_xof: priceXof ?? null },
  });

  if (error) throw new Error(error.message);
  const payload = data as { ok?: boolean; paid?: boolean; ingested?: boolean; duplicate?: boolean; sats?: number; error?: string };
  if (!payload?.ok) throw new Error(payload?.error ?? "Vérification LN échouée");

  return {
    paid: Boolean(payload.paid),
    ingested: payload.ingested,
    duplicate: payload.duplicate,
    sats: payload.sats,
  };
}

export function lnQrImageUrl(bolt11: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(bolt11)}`;
}

export interface LnPaymentRow {
  id: string;
  payment_hash: string;
  bolt11: string;
  sats: number;
  status: string;
  memo: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function fetchLnPayments(limit = 10): Promise<LnPaymentRow[]> {
  const { data, error } = await supabase
    .from("btc_ln_payments")
    .select("id, payment_hash, bolt11, sats, status, memo, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LnPaymentRow[];
}
