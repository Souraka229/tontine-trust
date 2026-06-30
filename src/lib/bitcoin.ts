/** Données marché Bitcoin via CoinGecko (API publique, sans clé). */

export interface BitcoinMarket {
  priceUsd: number;
  priceXof: number;
  change24h: number;
  lastUpdated: string;
  source: "coingecko" | "cache" | "fallback";
}

const CACHE_KEY = "tc_btc_market";
const CACHE_TTL_MS = 60_000;

const FALLBACK: BitcoinMarket = {
  priceUsd: 98_500,
  priceXof: 58_500_000,
  change24h: 1.2,
  lastUpdated: new Date().toISOString(),
  source: "fallback",
};

export function getBitcoinFallback(): BitcoinMarket {
  return { ...FALLBACK, lastUpdated: new Date().toISOString() };
}

function readCache(): BitcoinMarket | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, at } = JSON.parse(raw) as { data: BitcoinMarket; at: number };
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return { ...data, source: "cache" };
  } catch {
    return null;
  }
}

function writeCache(data: BitcoinMarket) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, at: Date.now() }));
}

export async function fetchBitcoinMarket(signal?: AbortSignal): Promise<BitcoinMarket> {
  const cached = readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const mergedSignal = signal
    ? (() => {
        signal.addEventListener("abort", () => controller.abort());
        return controller.signal;
      })()
    : controller.signal;

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,xof&include_24hr_change=true",
      { headers: { Accept: "application/json" }, signal: mergedSignal },
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const json = (await res.json()) as {
      bitcoin?: { usd?: number; xof?: number; usd_24h_change?: number };
    };
    const btc = json.bitcoin;
    if (!btc?.usd) throw new Error("Réponse invalide");

    const market: BitcoinMarket = {
      priceUsd: btc.usd,
      priceXof: btc.xof ?? btc.usd * 595,
      change24h: btc.usd_24h_change ?? 0,
      lastUpdated: new Date().toISOString(),
      source: "coingecko",
    };
    writeCache(market);
    return market;
  } catch {
    clearTimeout(timeout);
    const stale = localStorage.getItem(CACHE_KEY);
    if (stale) {
      try {
        const { data } = JSON.parse(stale) as { data: BitcoinMarket };
        return { ...data, source: "cache" };
      } catch {
        /* ignore */
      }
    }
    return FALLBACK;
  }
}

/** 1 BTC = priceXof FCFA (XOF) */
export function fcfaToBtc(fcfa: number, priceXof: number): number {
  if (!priceXof) return 0;
  return fcfa / priceXof;
}

export function btcToFcfa(btc: number, priceXof: number): number {
  return btc * priceXof;
}

export function formatBtc(btc: number, digits = 6): string {
  if (btc >= 1) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.001) return `${btc.toFixed(6)} BTC`;
  return `${(btc * 1e8).toFixed(0)} sats`;
}

export function formatUsd(usd: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd);
}

/** Adresse démo pour explorer la blockchain (lecture seule via mempool.space). */
export const DEMO_BTC_TREASURY = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

export async function fetchAddressSummary(address: string): Promise<{
  address: string;
  chainStats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
} | null> {
  try {
    const res = await fetch(`https://mempool.space/api/address/${address}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      address: string;
      chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
    };
    return {
      address: json.address,
      chainStats: json.chain_stats,
    };
  } catch {
    return null;
  }
}

export function satsToBtc(sats: number): number {
  return sats / 1e8;
}
