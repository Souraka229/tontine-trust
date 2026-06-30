import { ArrowRight } from "lucide-react";

interface LandingHeroProps {
  email: string;
  onEmailChange: (v: string) => void;
  onGetStarted: () => void;
}

export default function LandingHero({ email, onEmailChange, onGetStarted }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f7f5fc] via-[#faf9fd] to-white">
      {/* Formes décoratives type Letspay */}
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-10 bottom-32 h-48 w-48 rounded-full bg-blue-100/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 rotate-12 rounded-3xl border border-violet-100/80 bg-white/40" aria-hidden />
      <div className="pointer-events-none absolute right-[18%] top-[28%] text-[120px] font-black text-violet-100/50 select-none leading-none" aria-hidden>
        ₣
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Colonne gauche — copy */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.05] tracking-tight text-slate-900">
              Cotisez vite.
              <br />
              Épargnez malin.
            </h1>
            <p className="mt-4 text-xl sm:text-2xl font-bold text-slate-800">
              Avec{" "}
              <span className="text-[hsl(266_62%_33%)]">TONTINECHAIN</span>
            </p>
            <p className="mt-5 text-sm sm:text-base text-slate-500 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Le portefeuille digital tout-en-un pour vos tontines : cotisez en FCFA,
              sécurisez en Bitcoin et pilotez tout depuis WhatsApp.
            </p>

            <form
              className="mt-8 flex flex-col sm:flex-row gap-0 max-w-md mx-auto lg:mx-0 rounded-full bg-white border border-slate-200 shadow-[0_8px_30px_rgba(64,25,109,0.08)] p-1.5 sm:p-1"
              onSubmit={(e) => {
                e.preventDefault();
                onGetStarted();
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Votre e-mail"
                className="flex-1 min-w-0 px-4 sm:px-5 py-3 sm:py-3.5 text-sm bg-transparent outline-none placeholder:text-slate-400 rounded-full"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 shrink-0 px-6 py-3 sm:py-3.5 rounded-full text-sm font-bold text-white tc-gradient-brand tc-shadow-green hover:opacity-95 transition-opacity"
              >
                Commencer <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 sm:gap-8 opacity-70">
              <img src="/logos/kkiapay.svg" alt="Kkiapay" className="h-7 sm:h-8 object-contain" />
              <img src="/logos/bitcoin.svg" alt="Bitcoin" className="h-8 sm:h-9 object-contain" />
              <img src="/logos/whatsapp.svg" alt="WhatsApp" className="h-8 sm:h-9 object-contain" />
            </div>
          </div>

          {/* Colonne droite — visuel 3D */}
          <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] lg:max-w-none">
              <img
                src="/images/hero-3d.png"
                alt="Application TontineChain sur mobile avec Bitcoin et WhatsApp"
                className="w-full h-auto max-h-[480px] object-contain object-center drop-shadow-[0_30px_60px_rgba(64,25,109,0.15)]"
                width={640}
                height={640}
                fetchPriority="high"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
