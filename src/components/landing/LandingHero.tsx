import { useNavigate } from "react-router-dom";
import { ArrowRight, Bitcoin, MessageCircle, Search } from "lucide-react";
interface Stat {
  value: string;
  label: string;
}

interface Props {
  stats: Stat[];
}

export default function LandingHero({ stats }: Props) {
  const navigate = useNavigate();

  return (
    <section className="tc-mesh-hero relative overflow-hidden">
      <div className="absolute inset-0 tc-grid-fine opacity-[0.35] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[hsl(var(--tc-violet)/0.12)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[hsl(var(--tc-bitcoin)/0.1)] blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <span className="tc-badge tc-badge-btc mb-6">
            <Bitcoin className="w-3.5 h-3.5" />
            Tontine indexée Bitcoin · Bénin · UEMOA
          </span>

          <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.05] tracking-[-0.04em] text-[hsl(var(--tc-ink))]">
            La tontine
            <br />
            <span className="tc-text-gradient">indexée sur Bitcoin</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[hsl(var(--tc-muted))] max-w-xl mx-auto leading-relaxed">
            Cotisations FCFA via Mobile Money, trésor collectif en satoshis, registre PostgreSQL
            vérifiable — explorez librement, inscrivez-vous pour cotiser.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => navigate("/rechercher")} className="tc-btn-primary gap-2">
              <Search className="w-4 h-4" />
              Explorer les groupes
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => navigate("/crypto")} className="tc-btn-bitcoin gap-2">
              <Bitcoin className="w-5 h-5" />
              Voir le trésor
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/whatsapp?open=1&msg=AIDE")}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#128C7E] hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Bot WhatsApp (optionnel)
          </button>
        </div>

        <dl className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="tc-card-elevated px-4 py-4 text-center">
              <p className="text-lg sm:text-xl font-bold tracking-tight text-[hsl(var(--tc-ink))] truncate">
                {s.value}
              </p>
              <p className="text-[10px] sm:text-xs font-medium text-[hsl(var(--tc-muted))] mt-1 uppercase tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </dl>

        <p className="text-center text-[11px] text-[hsl(var(--tc-muted))] mt-4 max-w-md mx-auto">
          Stats live Supabase · cours CoinGecko · pas de données fictives
        </p>
      </div>
    </section>
  );
}
