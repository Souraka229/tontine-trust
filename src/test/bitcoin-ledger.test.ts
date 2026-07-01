import { describe, expect, it } from "vitest";
import { emptyPool, fcfaToSatsRate, formatFCFA } from "@/lib/bitcoinWallet";
import { statsToPool } from "@/hooks/usePublicStats";
import type { PublicStats } from "@/lib/bitcoinRepository";

describe("btc ledger helpers", () => {
  it("emptyPool retourne des zéros (pas de données marketing)", () => {
    const pool = emptyPool();
    expect(pool.tvlFcfa).toBe(0);
    expect(pool.btcReserve).toBe(0);
    expect(pool.contributors).toBe(0);
  });

  it("statsToPool mappe rpc_public_stats sans inventer de liquidité", () => {
    const stats: PublicStats = {
      members_count: 42,
      treasury_tvl_fcfa: 1_500_000,
      treasury_btc_reserve: 0.025,
      treasury_apy: 8.4,
      treasury_contributors: 12,
    };
    const pool = statsToPool(stats);
    expect(pool.tvlFcfa).toBe(1_500_000);
    expect(pool.satsLiquid).toBe(0);
    expect(pool.contributors).toBe(12);
  });

  it("fcfaToSatsRate convertit au cours XOF/BTC", () => {
    const rate = fcfaToSatsRate(58_500_000);
    expect(rate).toBeCloseTo(1.709, 2);
    expect(Math.floor(50_000 * rate)).toBeGreaterThan(0);
  });

  it("formatFCFA affiche en français", () => {
    expect(formatFCFA(50000)).toMatch(/50\s?000/);
    expect(formatFCFA(50000)).toContain("FCFA");
  });
});
