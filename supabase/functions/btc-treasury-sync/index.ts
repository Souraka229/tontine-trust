import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MempoolVout = { value: number; scriptpubkey_address?: string };
type MempoolTx = {
  txid: string;
  status?: { confirmed?: boolean; block_time?: number };
  vout?: MempoolVout[];
};

function treasuryAddress(): string | null {
  const addr =
    Deno.env.get("BTC_TREASURY_ADDRESS")?.trim() ||
    Deno.env.get("VITE_BTC_TREASURY_ADDRESS")?.trim();
  return addr && addr.length >= 26 ? addr : null;
}

function mempoolBase(): string {
  const net = (Deno.env.get("BTC_NETWORK") ?? Deno.env.get("VITE_BTC_NETWORK") ?? "mainnet").toLowerCase();
  return net === "testnet" ? "https://mempool.space/testnet/api" : "https://mempool.space/api";
}

function incomingSats(tx: MempoolTx, address: string): number {
  return (tx.vout ?? [])
    .filter((v) => v.scriptpubkey_address === address)
    .reduce((sum, v) => sum + v.value, 0);
}

/** Ingère les dépôts BTC confirmés vers l'adresse trésor dans Supabase. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let priceXof: number | null = null;
  try {
    const body = req.method === "POST" ? await req.json() : {};
    if (body?.price_xof) priceXof = Number(body.price_xof);
  } catch {
    /* ignore */
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const address = treasuryAddress();
  if (!address) {
    return new Response(
      JSON.stringify({
        ok: false,
        ingested: 0,
        duplicates: 0,
        address: null,
        errors: ["BTC_TREASURY_ADDRESS non configuré (secrets Supabase)"],
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const base = mempoolBase();
  const errors: string[] = [];
  let ingested = 0;
  let duplicates = 0;

  try {
    const res = await fetch(`${base}/address/${address}/txs`);
    if (!res.ok) throw new Error(`mempool.space ${res.status}`);
    const txs = (await res.json()) as MempoolTx[];

    for (const tx of txs) {
      if (!tx.status?.confirmed) continue;
      const sats = incomingSats(tx, address);
      if (sats <= 0) continue;

      const confirmedAt = tx.status.block_time
        ? new Date(tx.status.block_time * 1000).toISOString()
        : null;

      const { data, error } = await supabase.rpc("rpc_btc_ingest_on_chain_tx", {
        p_txid: tx.txid,
        p_sats: sats,
        p_confirmed_at: confirmedAt,
        p_price_xof: priceXof,
      });

      if (error) {
        errors.push(`${tx.txid}: ${error.message}`);
        continue;
      }
      const row = data as { duplicate?: boolean };
      if (row?.duplicate) duplicates += 1;
      else ingested += 1;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "sync failed");
  }

  return new Response(
    JSON.stringify({ ok: errors.length === 0, ingested, duplicates, address, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
