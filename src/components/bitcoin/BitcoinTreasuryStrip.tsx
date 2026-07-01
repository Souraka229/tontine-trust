import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bitcoin, ChevronRight } from "lucide-react";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc, fcfaToBtc } from "@/lib/bitcoin";
import { fetchBtcPool, fetchBtcWallet } from "@/lib/bitcoinRepository";
import { formatFCFA } from "@/lib/bitcoinWallet";

interface Props {
  profileId?: string;
  variant?: "hero" | "card";
}

/** Bandeau trésor Bitcoin — cœur produit visible sur l'accueil. */
export default function BitcoinTreasuryStrip({ profileId, variant = "card" }: Props) {
  const navigate = useNavigate();
  const { data: market } = useBitcoinPrice();
  const [tvlFcfa, setTvlFcfa] = useState(0);
  const [mySats, setMySats] = useState<number | null>(null);

  useEffect(() => {
    fetchBtcPool()
      .then((p) => setTvlFcfa(p.tvlFcfa))
      .catch(() => setTvlFcfa(0));
    if (profileId) {
      fetchBtcWallet(profileId)
        .then((w) => setMySats(w ? w.sats + w.stakedSats : 0))
        .catch(() => setMySats(null));
    }
  }, [profileId]);

  const btcEquiv = market?.priceXof && tvlFcfa > 0 ? formatBtc(fcfaToBtc(tvlFcfa, market.priceXof)) : null;

  const isHero = variant === "hero";

  return (
    <button
      type="button"
      onClick={() => navigate("/crypto")}
      className={
        isHero
          ? "w-full mt-2 rounded-2xl bg-gradient-to-r from-amber-500/25 to-orange-500/20 border border-amber-300/40 px-4 py-3 text-left backdrop-blur-sm hover:from-amber-500/35 transition-all active:scale-[0.99]"
          : "w-full rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-left hover:border-amber-300 transition-colors"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              isHero ? "bg-amber-400/30" : "bg-amber-100"
            }`}
          >
            <Bitcoin className={`w-4 h-4 ${isHero ? "text-amber-100" : "text-amber-700"}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wide ${isHero ? "text-amber-100/90" : "text-amber-800"}`}>
              Trésor Bitcoin · on-chain + registre
            </p>
            <p className={`text-sm font-bold truncate ${isHero ? "text-white" : "text-amber-950"}`}>
              {tvlFcfa > 0 ? formatFCFA(tvlFcfa) : "Registre collectif"}
              {btcEquiv ? ` · ${btcEquiv}` : ""}
            </p>
            {mySats !== null && (
              <p className={`text-[10px] ${isHero ? "text-white/70" : "text-amber-800/80"}`}>
                Vos sats : {mySats.toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 ${isHero ? "text-white/70" : "text-amber-600"}`} />
      </div>
    </button>
  );
}
