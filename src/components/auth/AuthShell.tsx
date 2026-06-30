import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bitcoin, MessageCircle, PiggyBank, Shield, ShieldCheck } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const highlights = [
  { icon: PiggyBank, text: "Cotisations MoMo via Kkiapay" },
  { icon: Bitcoin, text: "Trésor Bitcoin & preuves signées" },
  { icon: MessageCircle, text: "Bot WhatsApp intégré" },
];

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full tc-auth-bg flex flex-col lg:flex-row">
      {/* Panneau marque — desktop */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden tc-gradient-brand text-white flex-col justify-between p-12 xl:p-14">
        <div className="absolute inset-0 tc-grid-bg opacity-[0.12] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-violet-900/30 blur-3xl pointer-events-none" />

        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/25 transition-colors">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">TontineChain</span>
          </button>
        </div>

        <div className="relative space-y-8 my-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-4">
              Tontine ROSCA · Bénin 🇧🇯
            </p>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-[1.12] tracking-tight">
              L'épargne collective,
              <br />
              enfin digitale.
            </h1>
            <p className="mt-4 text-white/75 text-sm leading-relaxed max-w-sm">
              Créez votre groupe, cotisez en FCFA, recevez la cagnotte à votre tour — avec traçabilité, score de confiance et réserve Bitcoin.
            </p>
          </div>

          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-white/90">
                <div className="w-9 h-9 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0">
                  <h.icon className="w-4 h-4" />
                </div>
                {h.text}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="w-4 h-4" />
            Données sécurisées · Supabase Auth
          </div>
        </div>

        <div className="relative flex items-center gap-6 opacity-70">
          <img src="/logos/kkiapay.svg" alt="Kkiapay" className="h-6 brightness-0 invert" />
          <img src="/logos/bitcoin.svg" alt="Bitcoin" className="h-7" />
          <img src="/logos/whatsapp.svg" alt="WhatsApp" className="h-7" />
        </div>
      </aside>

      {/* Formulaire */}
      <main className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative">
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-md border-b border-violet-100/80">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[hsl(266_62%_33%)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl tc-gradient-brand flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-[hsl(266_62%_33%)]">TontineChain</span>
          </div>
          <span className="w-14" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-md animate-slide-up">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500 hover:text-[hsl(266_62%_33%)] mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>

            <div className="rounded-3xl bg-white border border-violet-100/80 p-7 sm:p-8 tc-shadow-card-cw tc-auth-card">
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>
              </div>
              {children}
            </div>

            {footer && <div className="mt-6 text-center">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
