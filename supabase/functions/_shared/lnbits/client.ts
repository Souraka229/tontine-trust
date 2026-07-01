export interface LnbitsPayment {
  checking_id: string;
  payment_hash: string;
  payment_request: string;
  amount: number;
  fee: number;
  memo: string;
  time: number;
  bolt11: string;
  prepay_id?: string;
  paid?: boolean;
}

export function lnbitsUrl(): string {
  const url = Deno.env.get("LNBITS_URL")?.trim();
  if (!url) throw new Error("LNBITS_URL non configuré");
  return url.replace(/\/$/, "");
}

export function lnbitsInvoiceKey(): string {
  const key =
    Deno.env.get("LNBITS_TREASURY_INVOICE_KEY")?.trim() ||
    Deno.env.get("LNBITS_INVOICE_KEY")?.trim();
  if (!key) throw new Error("LNBITS_TREASURY_INVOICE_KEY non configuré");
  return key;
}

export function lnbitsAdminKey(): string {
  const key =
    Deno.env.get("LNBITS_TREASURY_ADMIN_KEY")?.trim() ||
    Deno.env.get("LNBITS_ADMIN_KEY")?.trim() ||
    lnbitsInvoiceKey();
  return key;
}

export function isLnbitsConfigured(): boolean {
  try {
    lnbitsUrl();
    lnbitsInvoiceKey();
    return true;
  } catch {
    return false;
  }
}

export async function createLnbitsInvoice(
  amountSats: number,
  memo: string,
): Promise<LnbitsPayment> {
  const res = await fetch(`${lnbitsUrl()}/api/v1/payments`, {
    method: "POST",
    headers: {
      "X-Api-Key": lnbitsInvoiceKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      out: false,
      amount: amountSats,
      memo,
      unit: "sat",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LNbits invoice ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as LnbitsPayment;
}

export async function getLnbitsPayment(paymentHash: string): Promise<LnbitsPayment> {
  const res = await fetch(`${lnbitsUrl()}/api/v1/payments/${paymentHash}`, {
    headers: { "X-Api-Key": lnbitsAdminKey() },
  });
  if (!res.ok) throw new Error(`LNbits payment ${res.status}`);
  return (await res.json()) as LnbitsPayment;
}

export async function getLnbitsWalletBalance(): Promise<number> {
  const res = await fetch(`${lnbitsUrl()}/api/v1/wallet`, {
    headers: { "X-Api-Key": lnbitsAdminKey() },
  });
  if (!res.ok) throw new Error(`LNbits wallet ${res.status}`);
  const json = (await res.json()) as { balance?: number };
  return Number(json.balance ?? 0);
}
