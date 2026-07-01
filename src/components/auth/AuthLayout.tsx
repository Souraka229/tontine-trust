import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Bitcoin, MessageCircle, PiggyBank, CheckCircle2 } from "lucide-react";

const highlights = [
  { icon: PiggyBank, text: "Cotisations MTN, Moov, Celtiis via Kkiapay" },
  { icon: Bitcoin, text: "Trésor Bitcoin et preuves secp256k1" },
  { icon: MessageCircle, text: "Bot WhatsApp : /solde, /cotiser, /groupes" },
];

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  backTo?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, backTo = "/", children, footer }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[hsl(270_33%_99%)] flex flex-col lg:flex-row">
      {/* Panneau brand — desktop */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden tc-gradient-brand text-white flex-col justify-between p-12 xl:p-14">
        <div className="absolute inset-0 tc-grid-bg opacity-[0.12] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-300/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </button>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">HACKBIT</p>
              <p className="text-xs text-white/60">Tontine digitale · Bénin 🇧🇯</p>
            </div>
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight max-w-md">
            L'épargne collective,
            <br />
            enfin traçable.
          </h1>
          <p className="mt-5 text-white/75 text-sm leading-relaxed max-w-sm">
            Créez votre tontine ROSCA, cotisez en FCFA, sécurisez une réserve en Bitcoin et gérez tout depuis WhatsApp.
          </p>
        </div>

        <ul className="relative space-y-4 mt-10">
          {highlights.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <h.icon className="w-4 h-4" />
              </div>
              {h.text}
            </li>
          ))}
        </ul>

        <div className="relative mt-10 pt-8 border-t border-white/15 flex gap-8 text-center">
          {[
            { v: "1 284+", l: "Membres" },
            { v: "24.8M", l: "FCFA trésor" },
            { v: "8.4%", l: "APY BTC" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-lg font-bold">{s.v}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-violet-100 bg-white/80 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[hsl(266_62%_33%)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg tc-gradient-brand flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-[hsl(266_62%_33%)]">HACKBIT</span>
          </div>
          <span className="w-14" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12">
          <div className="w-full max-w-[420px] animate-slide-up">
            <div className="mb-8 lg:mb-10">
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl tc-gradient-brand flex items-center justify-center tc-shadow-green">
                  <Shield className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-center lg:text-left">
                {title}
              </h2>
              <p className="mt-2 text-sm text-slate-500 text-center lg:text-left leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-violet-100/80 p-6 sm:p-8 tc-shadow-card-cw">
              {children}
            </div>

            {footer && <div className="mt-6 text-center">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold text-slate-600 mb-2 tracking-wide">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        )}
        {children}
      </div>
    </div>
  );
}

export function authInputClass(withIcon = false) {
  return `w-full ${withIcon ? "pl-10" : "px-4"} pr-4 py-3.5 rounded-xl border border-violet-100 bg-[hsl(270_33%_99%)] text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[hsl(266_62%_33%)] focus:ring-2 focus:ring-[hsl(266_62%_33%)]/15 focus:bg-white`;
}

export function AuthSubmitButton({
  loading,
  disabled,
  children,
  onClick,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 rounded-2xl text-sm font-bold text-white tc-gradient-brand tc-shadow-green disabled:opacity-50 disabled:shadow-none hover:scale-[1.01] active:scale-[0.99] transition-transform mt-2"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Chargement…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function SupabaseAlert() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-900 leading-relaxed"
    >
      <strong className="font-semibold">Configuration requise.</strong> Ajoutez{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px]">VITE_SUPABASE_URL</code> et{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px]">VITE_SUPABASE_ANON_KEY</code> dans{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px]">.env</code>.
    </div>
  );
}

export function AuthTrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-violet-50">
      {["Gratuit", "Sans carte bancaire", "MoMo accepté"].map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {t}
        </span>
      ))}
    </div>
  );
}
