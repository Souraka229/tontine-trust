import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import {
  checkLnPayment,
  createLnInvoice,
  fetchLnPayments,
  isLnbitsEnabled,
  lnQrImageUrl,
  type LnPaymentRow,
} from "@/lib/lnbits";
import { formatFCFA } from "@/lib/bitcoinWallet";
import type { BtcLiquidityPool } from "@/lib/bitcoinWallet";

interface Props {
  pool: BtcLiquidityPool;
  profileId?: string;
  onPaid?: () => void;
}

export default function LightningDepositCard({ pool, profileId, onPaid }: Props) {
  const { data: market } = useBitcoinPrice();
  const [amountSats, setAmountSats] = useState("500");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [bolt11, setBolt11] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<LnPaymentRow[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchLnPayments(8));
    } catch {
      /* table peut ne pas exister en local */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadHistory]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const startPolling = (hash: string) => {
    stopPolling();
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const result = await checkLnPayment(hash, market?.priceXof);
        if (result.paid) {
          stopPolling();
          setBolt11(null);
          setPaymentHash(null);
          toast.success(
            result.ingested
              ? `Dépôt Lightning ingéré (${result.sats?.toLocaleString("fr-FR")} sats)`
              : "Paiement déjà enregistré",
          );
          await loadHistory();
          onPaid?.();
        }
      } catch {
        /* retry */
      }
    }, 4000);
  };

  const handleCreate = async () => {
    const sats = parseInt(amountSats, 10);
    if (!sats || sats < 1) {
      toast.error("Montant minimum 1 sat");
      return;
    }
    setLoading(true);
    try {
      const inv = await createLnInvoice(sats, {
        memo: "TontineChain trésor LN",
        profileId,
      });
      setBolt11(inv.bolt11);
      setPaymentHash(inv.payment_hash);
      startPolling(inv.payment_hash);
      await loadHistory();
      toast.message("Scannez la facture avec votre wallet Lightning");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "LNbits indisponible");
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    if (!paymentHash) return;
    setLoading(true);
    try {
      const result = await checkLnPayment(paymentHash, market?.priceXof);
      if (result.paid) {
        stopPolling();
        setBolt11(null);
        setPaymentHash(null);
        toast.success("Paiement Lightning confirmé");
        await loadHistory();
        onPaid?.();
      } else {
        toast.message("En attente de paiement…");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur vérification");
    } finally {
      setLoading(false);
    }
  };

  const copyBolt = () => {
    if (!bolt11) return;
    navigator.clipboard.writeText(bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLnbitsEnabled()) return null;

  const lnSats = pool.lnSats ?? 0;

  return (
    <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-indigo-50/40 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-700" />
          <p className="text-sm font-semibold text-violet-950">Trésor Lightning (LNbits)</p>
        </div>
        {polling && (
          <span className="text-[10px] font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full animate-pulse">
            En attente…
          </span>
        )}
      </div>

      <p className="text-[11px] text-violet-900/80 mb-3 leading-relaxed">
        Déposez des sats via Lightning (instantané). Complète Kkiapay (FCFA) et le trésor on-chain.
        Les cotisations MoMo restent en FCFA ; la conversion FCFA→sats utilise la liquidité LN + on-chain.
      </p>

      <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
        <div className="rounded-xl bg-white/80 border border-violet-100 p-3">
          <p className="text-[10px] text-slate-500 uppercase">LN ingérés</p>
          <p className="font-bold text-violet-900 mt-0.5">{lnSats.toLocaleString("fr-FR")} sats</p>
        </div>
        <div className="rounded-xl bg-white/80 border border-emerald-100 p-3">
          <p className="text-[10px] text-slate-500 uppercase">Liquidité totale</p>
          <p className="font-bold text-emerald-700 mt-0.5">{pool.satsLiquid.toLocaleString("fr-FR")} sats</p>
        </div>
      </div>

      {!bolt11 ? (
        <>
          <label className="text-[10px] text-slate-500 font-medium">Montant (sats)</label>
          <input
            type="number"
            value={amountSats}
            onChange={(e) => setAmountSats(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-violet-200 bg-white text-sm mb-2 mt-1"
            min={1}
          />
          {market && amountSats && (
            <p className="text-[10px] text-muted-foreground mb-2">
              ≈ {formatFCFA(Math.round((parseInt(amountSats, 10) / 1e8) * market.priceXof))}
            </p>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleCreate()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 disabled:opacity-50"
          >
            {loading ? "Génération…" : "Générer facture Lightning"}
          </button>
        </>
      ) : (
        <div className="text-center">
          <img
            src={lnQrImageUrl(bolt11)}
            alt="QR Lightning"
            className="mx-auto rounded-xl border border-violet-100 bg-white p-2 mb-3"
            width={220}
            height={220}
          />
          <button
            type="button"
            onClick={copyBolt}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-violet-800 mb-3 max-w-full truncate"
          >
            {bolt11.slice(0, 32)}…
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleManualCheck()}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-violet-100 text-violet-900"
            >
              <RefreshCw className={`w-3 h-3 inline mr-1 ${loading ? "animate-spin" : ""}`} />
              Vérifier paiement
            </button>
            <button
              type="button"
              onClick={() => {
                stopPolling();
                setBolt11(null);
                setPaymentHash(null);
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-violet-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-violet-100 pt-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Dernières factures LN</p>
          {history.map((row) => (
            <li key={row.id} className="flex justify-between text-[10px]">
              <span className="font-mono text-slate-600 truncate max-w-[55%]">
                {row.payment_hash.slice(0, 12)}…
              </span>
              <span className={row.status === "paid" ? "text-emerald-700 font-semibold" : "text-amber-700"}>
                {row.sats.toLocaleString("fr-FR")} sats · {row.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
