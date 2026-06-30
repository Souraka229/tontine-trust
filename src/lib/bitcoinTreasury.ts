import { DEMO_BTC_TREASURY, fetchAddressSummary, formatBtc, satsToBtc } from "@/lib/bitcoin";
import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";

/** Adresse trésor configurable en prod (lecture seule mempool.space). */
export function getTreasuryAddress(): string {
  const fromEnv = (import.meta.env.VITE_BTC_TREASURY_ADDRESS as string | undefined)?.trim();
  return fromEnv || DEMO_BTC_TREASURY;
}

export function getTreasuryExplorerUrl(address = getTreasuryAddress()): string {
  return `https://mempool.space/fr/address/${address}`;
}

export interface OnChainTreasury {
  address: string;
  balanceSats: number;
  balanceBtc: number;
  txCount: number;
  fundedSats: number;
  spentSats: number;
  syncedAt: string;
  source: "mempool.space" | "unavailable";
}

/** Solde on-chain = UTXO nets (funded − spent) via mempool.space. */
export async function fetchOnChainTreasury(address = getTreasuryAddress()): Promise<OnChainTreasury> {
  const summary = await fetchAddressSummary(address);
  if (!summary) {
    return {
      address,
      balanceSats: 0,
      balanceBtc: 0,
      txCount: 0,
      fundedSats: 0,
      spentSats: 0,
      syncedAt: new Date().toISOString(),
      source: "unavailable",
    };
  }

  const { funded_txo_sum, spent_txo_sum, tx_count } = summary.chainStats;
  const balanceSats = Math.max(0, funded_txo_sum - spent_txo_sum);

  return {
    address,
    balanceSats,
    balanceBtc: satsToBtc(balanceSats),
    txCount: tx_count,
    fundedSats: funded_txo_sum,
    spentSats: spent_txo_sum,
    syncedAt: new Date().toISOString(),
    source: "mempool.space",
  };
}

export interface TreasuryReconciliation {
  book: BtcLiquidityPool;
  onChain: OnChainTreasury;
  /** Écart comptable vs chaîne (sats) — transparent pour le jury. */
  deltaSats: number;
  priceXof?: number;
  onChainFcfa?: number;
}

/** Compare le registre interne (Supabase/local) au solde vérifiable on-chain. */
export function reconcileTreasury(
  book: BtcLiquidityPool,
  onChain: OnChainTreasury,
  priceXof?: number,
): TreasuryReconciliation {
  const bookSats = Math.round(book.btcReserve * 1e8);
  const deltaSats = bookSats - onChain.balanceSats;
  return {
    book,
    onChain,
    deltaSats,
    priceXof,
    onChainFcfa: priceXof ? Math.round(onChain.balanceBtc * priceXof) : undefined,
  };
}

export function formatDeltaSats(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("fr-FR")} sats`;
}

export function describeTreasuryRole(): string {
  return [
    "Le trésor TontineChain indexe les cotisations FCFA sur le cours Bitcoin (CoinGecko).",
    "La réserve est vérifiable sur mempool.space ; les engagements de groupe sont signés secp256k1.",
    "Les conversions FCFA→sats et le staking alimentent le registre comptable partagé (Supabase).",
  ].join(" ");
}

export function formatOnChainBalance(onChain: OnChainTreasury): string {
  if (onChain.source === "unavailable") return "Indisponible";
  return `${formatBtc(onChain.balanceBtc)} · ${onChain.txCount.toLocaleString("fr-FR")} txs`;
}
