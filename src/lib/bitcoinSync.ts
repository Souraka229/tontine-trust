import { supabase } from "@/lib/supabase";
import { getMempoolApiBase, getTreasuryAddress, type BtcNetwork } from "@/lib/bitcoinNetwork";
import { fetchBitcoinMarket } from "@/lib/bitcoin";

export interface OnChainTx {
  txid: string;
  sats: number;
  confirmedAt: string | null;
}

interface MempoolVout {
  value: number;
  scriptpubkey_address?: string;
}

interface MempoolTx {
  txid: string;
  status?: { confirmed?: boolean; block_time?: number };
  vout?: MempoolVout[];
}

function incomingSats(tx: MempoolTx, address: string): number {
  return (tx.vout ?? [])
    .filter((v) => v.scriptpubkey_address === address)
    .reduce((sum, v) => sum + v.value, 0);
}

/** Liste les dépôts confirmés vers l'adresse trésor (mempool.space). */
export async function fetchTreasuryDeposits(
  address = getTreasuryAddress(),
  network?: BtcNetwork,
): Promise<OnChainTx[]> {
  const base = getMempoolApiBase(network);
  try {
    const res = await fetch(`${base}/address/${address}/txs`);
    if (!res.ok) return [];
    const txs = (await res.json()) as MempoolTx[];
    return txs
      .filter((tx) => tx.status?.confirmed)
      .map((tx) => ({
        txid: tx.txid,
        sats: incomingSats(tx, address),
        confirmedAt: tx.status?.block_time
          ? new Date(tx.status.block_time * 1000).toISOString()
          : null,
      }))
      .filter((t) => t.sats > 0);
  } catch {
    return [];
  }
}

export interface SyncResult {
  ingested: number;
  duplicates: number;
  errors: string[];
}

/** Synchronise les dépôts on-chain via l'edge function Supabase. */
export async function syncTreasuryOnChain(): Promise<SyncResult> {
  const market = await fetchBitcoinMarket().catch(() => null);
  const priceXof = market?.priceXof ?? null;

  const { data, error } = await supabase.functions.invoke("btc-treasury-sync", {
    body: { price_xof: priceXof },
  });

  if (error) {
    return { ingested: 0, duplicates: 0, errors: [error.message] };
  }

  const payload = data as { ingested?: number; duplicates?: number; errors?: string[] };
  return {
    ingested: payload.ingested ?? 0,
    duplicates: payload.duplicates ?? 0,
    errors: payload.errors ?? [],
  };
}

/** Sync côté client (fallback si edge function indisponible) — lecture mempool uniquement. */
export async function previewTreasurySync(): Promise<OnChainTx[]> {
  return fetchTreasuryDeposits();
}
