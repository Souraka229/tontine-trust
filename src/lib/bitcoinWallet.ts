/** Types et formatters Bitcoin — pas de persistance locale (Supabase uniquement). */

export interface BtcLiquidityPool {
  tvlFcfa: number;
  btcReserve: number;
  satsLiquid: number;
  apy: number;
  contributors: number;
  lastUpdated: string;
  onChainSats?: number;
  internalSats?: number;
  lnSats?: number;
  treasuryAddress?: string;
  btcPriceXof?: number;
}

export interface BtcWallet {
  address: string;
  sats: number;
  stakedSats: number;
  linkedAt: string;
}

export interface BtcLedgerEntry {
  id: string;
  entry_type: string;
  sats_delta: number;
  fcfa_amount: number | null;
  btc_price_xof: number | null;
  created_at: string;
}

export function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

export function shortenBtcAddress(addr: string) {
  if (addr.startsWith("registre:")) return "Registre interne";
  return addr.slice(0, 8) + "..." + addr.slice(-6);
}

export function fcfaToSatsRate(priceXofPerBtc: number): number {
  if (!priceXofPerBtc) return 0;
  return 1e8 / priceXofPerBtc;
}

export function emptyPool(): BtcLiquidityPool {
  return {
    tvlFcfa: 0,
    btcReserve: 0,
    satsLiquid: 0,
    apy: 0,
    contributors: 0,
    lastUpdated: new Date().toISOString(),
  };
}
