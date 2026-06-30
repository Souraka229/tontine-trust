import { useEffect, useState } from "react";
import { ExternalLink, Link2, RefreshCw } from "lucide-react";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc } from "@/lib/bitcoin";
import { formatFCFA } from "@/lib/bitcoinWallet";
import {
  fetchOnChainTreasury,
  formatDeltaSats,
  formatOnChainBalance,
  getTreasuryExplorerUrl,
  reconcileTreasury,
  type OnChainTreasury,
} from "@/lib/bitcoinTreasury";
import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";

interface Props {
  pool: BtcLiquidityPool;
  onSynced?: (onChain: OnChainTreasury) => void;
}

export default function BitcoinTreasuryOnChain({ pool, onSynced }: Props) {
  const { data: market } = useBitcoinPrice();
  const [onChain, setOnChain] = useState<OnChainTreasury | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const chain = await fetchOnChainTreasury();
      setOnChain(chain);
      onSynced?.(chain);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const recon =
    onChain && market
      ? reconcileTreasury(pool, onChain, market.priceXof)
      : onChain
        ? reconcileTreasury(pool, onChain)
        : null;

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-700" />
          <p className="text-sm font-semibold text-amber-950">Réserve vérifiable on-chain</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-amber-100/80 text-amber-800"
          aria-label="Synchroniser mempool.space"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {onChain ? (
        <>
          <p className="text-[10px] font-mono text-slate-600 break-all mb-2">{onChain.address}</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/80 border border-amber-100 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Solde blockchain</p>
              <p className="font-bold text-amber-900 mt-0.5">{formatOnChainBalance(onChain)}</p>
              {recon?.onChainFcfa != null && (
                <p className="text-[10px] text-slate-500 mt-1">≈ {formatFCFA(recon.onChainFcfa)}</p>
              )}
            </div>
            <div className="rounded-xl bg-white/80 border border-violet-100 p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Registre comptable</p>
              <p className="font-bold text-[hsl(266_62%_33%)] mt-0.5">{formatBtc(pool.btcReserve)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{formatFCFA(pool.tvlFcfa)} TVL</p>
            </div>
          </div>
          {recon && onChain.source === "mempool.space" && (
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
              Écart registre / chaîne : <strong>{formatDeltaSats(recon.deltaSats)}</strong>
              {market && <> · cours actuel {formatFCFA(market.priceXof)} / BTC</>}
            </p>
          )}
          <a
            href={getTreasuryExplorerUrl(onChain.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-amber-800 hover:underline"
          >
            Vérifier sur mempool.space <ExternalLink className="w-3 h-3" />
          </a>
        </>
      ) : (
        <p className="text-xs text-slate-500">Chargement du solde on-chain…</p>
      )}
    </div>
  );
}
