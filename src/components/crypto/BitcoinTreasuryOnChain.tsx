import { useEffect, useState } from "react";

import { ExternalLink, Link2, RefreshCw } from "lucide-react";

import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";

import { formatFCFA } from "@/lib/bitcoinWallet";

import { syncTreasuryOnChain } from "@/lib/bitcoinSync";

import {

  fetchOnChainTreasury,

  formatDeltaSats,

  formatOnChainBalance,

  getTreasuryExplorerUrl,

  isTreasuryConfigured,

  reconcileTreasury,

  type OnChainTreasury,

} from "@/lib/bitcoinTreasury";

import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";

import { toast } from "sonner";



interface Props {

  pool: BtcLiquidityPool;

  onSynced?: () => void;

}



export default function BitcoinTreasuryOnChain({ pool, onSynced }: Props) {

  const { data: market } = useBitcoinPrice();

  const [onChain, setOnChain] = useState<OnChainTreasury | null>(null);

  const [loading, setLoading] = useState(false);



  const loadChain = async () => {

    setOnChain(await fetchOnChainTreasury(pool.treasuryAddress));

  };



  const handleSync = async () => {

    setLoading(true);

    try {

      const result = await syncTreasuryOnChain();

      await loadChain();

      onSynced?.();

      if (result.ingested > 0) toast.success(`${result.ingested} dépôt(s) on-chain ingéré(s)`);

      else if (result.errors.length) toast.error(result.errors[0]);

      else toast.message("Trésor à jour");

    } catch (e) {

      toast.error(e instanceof Error ? e.message : "Erreur sync");

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    void loadChain();

  }, [pool.treasuryAddress]);



  const recon = onChain ? reconcileTreasury(pool, onChain, market?.priceXof) : null;

  const aligned = recon?.deltaSats === 0;



  return (

    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4">

      <div className="flex items-start justify-between gap-2 mb-3">

        <div className="flex items-center gap-2">

          <Link2 className="w-4 h-4 text-amber-700" />

          <p className="text-sm font-semibold text-amber-950">Trésor on-chain (réel)</p>

        </div>

        <button

          type="button"

          onClick={() => void handleSync()}

          disabled={loading}

          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200"

        >

          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />

          Sync dépôts

        </button>

      </div>



      {!isTreasuryConfigured() && (
        <p className="text-[11px] text-amber-800 bg-amber-100/80 rounded-lg px-3 py-2 mb-3">
          Ajoutez votre adresse <strong>mainnet</strong> dans{" "}
          <code className="font-mono-tech">VITE_BTC_TREASURY_ADDRESS</code> (fichier{" "}
          <code className="font-mono-tech">.env</code>), puis redémarrez l&apos;app. Envoyez un
          petit dépôt BTC et cliquez sur <strong>Sync dépôts</strong>.
        </p>
      )}



      {onChain && onChain.address ? (

        <>

          <p className="text-[10px] font-mono-tech text-slate-600 break-all mb-3">{onChain.address}</p>

          <div className="grid sm:grid-cols-3 gap-2 text-sm">

            <div className="rounded-xl bg-white/80 border border-amber-100 p-3">

              <p className="text-[10px] text-slate-500 uppercase">Solde mempool</p>

              <p className="font-bold text-amber-900 mt-0.5">{formatOnChainBalance(onChain)}</p>

            </div>

            <div className="rounded-xl bg-white/80 border border-violet-100 p-3">

              <p className="text-[10px] text-slate-500 uppercase">Ingesté (base)</p>

              <p className="font-bold text-[hsl(var(--tc-violet))] mt-0.5">

                {(pool.onChainSats ?? 0).toLocaleString("fr-FR")} sats

              </p>

            </div>

            <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">

              <p className="text-[10px] text-slate-500 uppercase">Registre interne</p>

              <p className="font-bold text-emerald-700 mt-0.5">

                {(pool.internalSats ?? 0).toLocaleString("fr-FR")} sats

              </p>

              <p className="text-[10px] text-slate-500">{pool.satsLiquid.toLocaleString("fr-FR")} liquides</p>

            </div>

          </div>

          {recon && (

            <p className={`text-[11px] mt-3 ${aligned ? "text-emerald-700" : "text-amber-800"}`}>

              {aligned ? "✓ Base alignée avec mempool" : `Écart : ${formatDeltaSats(recon.deltaSats)}`}

            </p>

          )}

          <a

            href={getTreasuryExplorerUrl(onChain.address)}

            target="_blank"

            rel="noopener noreferrer"

            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-amber-800 hover:underline"

          >

            mempool.space <ExternalLink className="w-3 h-3" />

          </a>

        </>

      ) : !isTreasuryConfigured() ? (
        <p className="text-xs text-slate-500">Adresse trésor non configurée — en attente de votre bc1q…</p>
      ) : (
        <p className="text-xs text-slate-500">Chargement…</p>
      )}

    </div>

  );

}


