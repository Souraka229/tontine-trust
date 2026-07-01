import { DEMO_BTC_TREASURY, fetchAddressSummary, formatBtc, satsToBtc } from "@/lib/bitcoin";
import {
  getTreasuryAddress,
  getTreasuryExplorerUrl,
  getBtcNetwork,
  isTreasuryConfigured,
} from "@/lib/bitcoinNetwork";
import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";

export { getTreasuryAddress, getTreasuryExplorerUrl, isTreasuryConfigured, getBtcNetwork };

/** @deprecated utilisez getTreasuryAddress depuis bitcoinNetwork */
export const LEGACY_DEMO_TREASURY = DEMO_BTC_TREASURY;

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

export async function fetchOnChainTreasury(address = getTreasuryAddress()): Promise<OnChainTreasury> {
  if (!address) {
    return {
      address: "",
      balanceSats: 0,
      balanceBtc: 0,
      txCount: 0,
      fundedSats: 0,
      spentSats: 0,
      syncedAt: new Date().toISOString(),
      source: "unavailable",
    };
  }
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
  /** Écart sats ingérés en base vs solde mempool live */
  deltaSats: number;
  priceXof?: number;
  onChainFcfa?: number;
}

export function reconcileTreasury(
  book: BtcLiquidityPool,
  onChain: OnChainTreasury,
  priceXof?: number,
): TreasuryReconciliation {
  const bookOnChainSats = book.onChainSats ?? Math.round(book.btcReserve * 1e8);
  const deltaSats = bookOnChainSats - onChain.balanceSats;
  return {
    book,
    onChain,
    deltaSats,
    priceXof,
    onChainFcfa: priceXof ? Math.round(onChain.balanceBtc * priceXof) : undefined,
  };
}

export function formatDeltaSats(delta: number): string {
  if (delta === 0) return "0 sats (aligné)";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("fr-FR")} sats`;
}

export function describeTreasuryRole(): string {
  return [
    "La tontine cotise en FCFA via Kkiapay (MoMo). Le trésor Bitcoin a trois volets :",
    "① Lightning LNbits — dépôts instantanés (facture BOLT11).",
    "② On-chain — dépôts bc1q… sync mempool.space.",
    "③ Registre interne — FCFA→sats, stake, 2 % cotisations (btc_ledger).",
    "④ Garde collective 3/5 (inspirée Bitsacco) — décaissement validé par plusieurs gardiens.",
    "Roadmap : multisig on-chain / Fedimint.",
  ].join(" ");
}

export function formatOnChainBalance(onChain: OnChainTreasury): string {
  if (onChain.source === "unavailable") return "Indisponible";
  return `${formatBtc(onChain.balanceBtc)} · ${onChain.txCount.toLocaleString("fr-FR")} txs`;
}
