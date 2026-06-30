import { describe, expect, it } from "vitest";
import { computeScoreBreakdown } from "@/lib/scoreBreakdown";
import { fcfaToBtc, formatBtc, getBitcoinFallback } from "@/lib/bitcoin";

describe("scoreBreakdown", () => {
  it("calcule 4 dimensions entre 0 et 100", () => {
    const dims = computeScoreBreakdown({
      score: 700,
      max_score: 1000,
      groups_count: 2,
      cycles_completed: 3,
    });
    expect(dims).toHaveLength(4);
    dims.forEach((d) => {
      expect(d.value).toBeGreaterThanOrEqual(0);
      expect(d.value).toBeLessThanOrEqual(100);
    });
  });

  it("augmente participation avec groups_count", () => {
    const low = computeScoreBreakdown({ score: 500, groups_count: 0 });
    const high = computeScoreBreakdown({ score: 500, groups_count: 4 });
    expect(high[1].value).toBeGreaterThan(low[1].value);
  });
});

describe("bitcoin utils", () => {
  it("convertit FCFA en BTC", () => {
    const fb = getBitcoinFallback();
    const btc = fcfaToBtc(58_500_000, fb.priceXof);
    expect(btc).toBeCloseTo(1, 1);
  });

  it("formate les petits montants en sats", () => {
    expect(formatBtc(0.00001)).toMatch(/sats/);
  });
});
