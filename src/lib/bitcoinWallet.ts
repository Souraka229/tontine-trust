import { DEMO_BTC_TREASURY } from "@/lib/bitcoin";

const POOL_KEY = "tc_btc_pool";
const WALLET_KEY = "tc_btc_wallet";

export interface BtcLiquidityPool {
  tvlFcfa: number;
  btcReserve: number;
  satsLiquid: number;
  apy: number;
  contributors: number;
  lastUpdated: string;
  onChainSats?: number;
  treasuryAddress?: string;
}

export interface BtcWallet {
  address: string;
  sats: number;
  stakedSats: number;
  linkedAt: string;
}

const DEFAULT_POOL: BtcLiquidityPool = {
  tvlFcfa: 24_800_000,
  btcReserve: 0.42,
  satsLiquid: 12_500_000,
  apy: 8.4,
  contributors: 1284,
  lastUpdated: new Date().toISOString(),
  treasuryAddress: DEMO_BTC_TREASURY,
};

export function getBtcPool(): BtcLiquidityPool {
  if (typeof localStorage === "undefined") return { ...DEFAULT_POOL };
  try {
    const raw = localStorage.getItem(POOL_KEY);
    return raw ? { ...DEFAULT_POOL, ...JSON.parse(raw) } : { ...DEFAULT_POOL };
  } catch {
    return { ...DEFAULT_POOL };
  }
}

export function saveBtcPool(patch: Partial<BtcLiquidityPool>) {
  const next = { ...getBtcPool(), ...patch, lastUpdated: new Date().toISOString() };
  localStorage.setItem(POOL_KEY, JSON.stringify(next));
  return next;
}

/** Portefeuille membre : adresse dérivée du profil (registre interne, pas custodial on-chain). */
export function connectBtcWallet(profileId?: string): BtcWallet {
  const existing = getBtcWallet();
  if (existing) return existing;
  const wallet: BtcWallet = {
    address: profileId
      ? `bc1qtc${profileId.replace(/-/g, "").slice(0, 34)}`
      : DEMO_BTC_TREASURY,
    sats: 0,
    stakedSats: 0,
    linkedAt: new Date().toISOString(),
  };
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return wallet;
}

export function getBtcWallet(): BtcWallet | null {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Conversion FCFA → sats au taux marché ; alimente le registre comptable du trésor. */
export function buySatsWithFcfa(
  wallet: BtcWallet,
  fcfa: number,
  satsPerFcfa: number,
  priceXofPerBtc?: number,
): BtcWallet {
  const satsOut = Math.floor(fcfa * satsPerFcfa);
  const pool = getBtcPool();
  if (pool.satsLiquid < satsOut) throw new Error("Liquidité insuffisante dans le pool");
  wallet.sats += satsOut;
  const btcAdded = satsOut / 1e8;
  saveBtcPool({
    satsLiquid: pool.satsLiquid - satsOut,
    btcReserve: pool.btcReserve + btcAdded,
    tvlFcfa: priceXofPerBtc ? pool.tvlFcfa + Math.round(fcfa) : pool.tvlFcfa,
  });
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return wallet;
}

export function stakeSats(wallet: BtcWallet, sats: number, priceXofPerBtc?: number): BtcWallet {
  if (wallet.sats < sats) throw new Error("Solde sats insuffisant");
  wallet.sats -= sats;
  wallet.stakedSats += sats;
  const pool = getBtcPool();
  const fcfaEquiv = priceXofPerBtc ? Math.round((sats / 1e8) * priceXofPerBtc) : Math.round((sats / 1e8) * 58_000_000);
  saveBtcPool({
    tvlFcfa: pool.tvlFcfa + fcfaEquiv,
    btcReserve: pool.btcReserve + sats / 1e8,
    contributors: pool.contributors + 1,
  });
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return wallet;
}

export function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

export function shortenBtcAddress(addr: string) {
  return addr.slice(0, 8) + "..." + addr.slice(-6);
}

export function fcfaToSatsRate(priceXofPerBtc: number): number {
  if (!priceXofPerBtc) return 0;
  return 1e8 / priceXofPerBtc;
}
