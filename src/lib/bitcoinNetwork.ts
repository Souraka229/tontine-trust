/** Réseau Bitcoin + adresse trésor (configurable). */

export type BtcNetwork = "mainnet" | "testnet";

export function getBtcNetwork(): BtcNetwork {
  const raw = (import.meta.env.VITE_BTC_NETWORK as string | undefined)?.toLowerCase();
  return raw === "testnet" ? "testnet" : "mainnet";
}

/** Adresse trésor — vide tant que VITE_BTC_TREASURY_ADDRESS n'est pas défini. */
export function getTreasuryAddress(): string {
  return (import.meta.env.VITE_BTC_TREASURY_ADDRESS as string | undefined)?.trim() ?? "";
}

export function getMempoolApiBase(network = getBtcNetwork()): string {
  return network === "testnet" ? "https://mempool.space/testnet/api" : "https://mempool.space/api";
}

export function getTreasuryExplorerUrl(address = getTreasuryAddress(), network = getBtcNetwork()): string {
  const prefix = network === "testnet" ? "https://mempool.space/testnet" : "https://mempool.space";
  return `${prefix}/fr/address/${address}`;
}

export function isTreasuryConfigured(): boolean {
  const addr = getTreasuryAddress();
  return addr.length >= 26 && (addr.startsWith("bc1") || addr.startsWith("tb1") || addr.startsWith("1") || addr.startsWith("3"));
}
