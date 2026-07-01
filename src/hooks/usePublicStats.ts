import { useQuery } from "@tanstack/react-query";
import { fetchPublicStats, type PublicStats } from "@/lib/bitcoinRepository";
import { emptyPool, type BtcLiquidityPool } from "@/lib/bitcoinWallet";

export function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: fetchPublicStats,
    staleTime: 60_000,
  });
}

export function statsToPool(stats: PublicStats | null | undefined): BtcLiquidityPool {
  if (!stats) return emptyPool();
  return {
    tvlFcfa: Number(stats.treasury_tvl_fcfa),
    btcReserve: Number(stats.treasury_btc_reserve),
    satsLiquid: Number(stats.treasury_sats_liquid ?? 0),
    apy: Number(stats.treasury_apy),
    contributors: Number(stats.treasury_contributors),
    onChainSats: Number(stats.treasury_on_chain_sats ?? 0),
    internalSats: Number(stats.treasury_internal_sats ?? 0),
    lastUpdated: new Date().toISOString(),
  };
}
