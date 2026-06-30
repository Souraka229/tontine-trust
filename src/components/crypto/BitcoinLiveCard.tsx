import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc, formatUsd, fcfaToBtc } from "@/lib/bitcoin";
import { formatFCFA } from "@/lib/bitcoinWallet";
import { Bitcoin, RefreshCw, TrendingDown, TrendingUp, WifiOff } from "lucide-react";

interface BitcoinLiveCardProps {
  fcfaAmount?: number;
  compact?: boolean;
}

export default function BitcoinLiveCard({ fcfaAmount, compact }: BitcoinLiveCardProps) {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useBitcoinPrice();

  const market = data;
  const isFallback = market?.source === "fallback";
  const isStale = market?.source === "cache";

  if (isLoading && !market) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/60 p-4 animate-pulse">
        <div className="h-4 w-24 bg-amber-200/40 rounded mb-2" />
        <div className="h-8 w-40 bg-amber-200/40 rounded" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Cours Bitcoin indisponible
        </p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-xs font-semibold underline">
          Réessayer
        </button>
      </div>
    );
  }

  const up = market.change24h >= 0;
  const btcEquiv = fcfaAmount ? fcfaToBtc(fcfaAmount, market.priceXof) : null;

  return (
    <div className={`rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-50 border border-amber-200/80 ${compact ? "p-4" : "p-5"}`}>
      {(isError || isFallback) && (
        <p className="text-[10px] font-medium text-amber-800/90 mb-2 flex items-center gap-1">
          <WifiOff className="w-3 h-3" />
          {isFallback ? "Cours estimé (hors ligne)" : "Erreur réseau — données de secours"}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Bitcoin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-amber-800/80 uppercase tracking-wide">Bitcoin · en ligne</p>
            <p className="text-lg font-extrabold text-slate-900">{formatUsd(market.priceUsd)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-1.5 rounded-lg hover:bg-amber-100/80 text-amber-700"
          aria-label="Actualiser"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="text-xs font-semibold text-slate-700">{formatFCFA(market.priceXof)} / BTC</span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? "+" : ""}{market.change24h.toFixed(2)}% (24h)
        </span>
        <span className="text-[9px] text-slate-400">
          {market.source === "coingecko" ? "CoinGecko" : isStale ? "cache" : "estimé"} ·{" "}
          {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {btcEquiv != null && fcfaAmount != null && (
        <div className="mt-3 pt-3 border-t border-amber-200/60">
          <p className="text-[10px] text-slate-500">Équivalent Bitcoin de {formatFCFA(fcfaAmount)}</p>
          <p className="text-sm font-bold text-amber-800">{formatBtc(btcEquiv)}</p>
        </div>
      )}
    </div>
  );
}
