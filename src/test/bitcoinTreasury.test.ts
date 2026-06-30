import { describe, expect, it } from "vitest";
import {
  reconcileTreasury,
  formatDeltaSats,
  describeTreasuryRole,
  getTreasuryExplorerUrl,
} from "@/lib/bitcoinTreasury";
import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";
import type { OnChainTreasury } from "@/lib/bitcoinTreasury";
import { fcfaToSatsRate } from "@/lib/bitcoinWallet";
import {
  generateCommitmentText,
  hashCommitment,
  signCommitment,
  verifyStoredCommitment,
} from "@/lib/bitcoinProof";

const book: BtcLiquidityPool = {
  tvlFcfa: 24_800_000,
  btcReserve: 0.42,
  satsLiquid: 12_500_000,
  apy: 8.4,
  contributors: 1284,
  lastUpdated: new Date().toISOString(),
};

const onChain: OnChainTreasury = {
  address: "bc1qtest",
  balanceSats: 41_000_000,
  balanceBtc: 0.41,
  txCount: 12,
  fundedSats: 50_000_000,
  spentSats: 9_000_000,
  syncedAt: new Date().toISOString(),
  source: "mempool.space",
};

describe("bitcoinTreasury", () => {
  it("calcule l'écart registre vs on-chain", () => {
    const recon = reconcileTreasury(book, onChain, 58_500_000);
    expect(recon.deltaSats).toBe(1_000_000);
    expect(recon.onChainFcfa).toBe(Math.round(0.41 * 58_500_000));
  });

  it("formate le delta en sats signé", () => {
    expect(formatDeltaSats(1_000_000)).toMatch(/\+/);
    expect(formatDeltaSats(-500)).toMatch(/-/);
  });

  it("génère une URL mempool.space", () => {
    expect(getTreasuryExplorerUrl("bc1qabc")).toContain("mempool.space");
    expect(getTreasuryExplorerUrl("bc1qabc")).toContain("bc1qabc");
  });

  it("décrit le rôle du trésor sans promesses multisig", () => {
    const text = describeTreasuryRole();
    expect(text).toMatch(/mempool\.space/);
    expect(text).toMatch(/secp256k1/);
    expect(text).not.toMatch(/multisig/i);
  });
});

describe("bitcoinWallet rates", () => {
  it("convertit le cours XOF en sats par FCFA", () => {
    const rate = fcfaToSatsRate(58_500_000);
    expect(rate).toBeCloseTo(1.709, 2);
  });
});

describe("bitcoinProof secp256k1", () => {
  it("signe et vérifie un engagement", async () => {
    const text = generateCommitmentText("g1", "Alice", 50_000);
    const hash = hashCommitment(text);
    const { signature, pubkeyHint } = await signCommitment(hash);
    const ok = await verifyStoredCommitment(hash, signature, pubkeyHint);
    expect(ok).toBe(true);
  });

  it("rejette une signature invalide", async () => {
    const text = generateCommitmentText("g1", "Bob", 10_000);
    const hash = hashCommitment(text);
    const ok = await verifyStoredCommitment(hash, "0xdead", "0xbeef");
    expect(ok).toBe(false);
  });
});
