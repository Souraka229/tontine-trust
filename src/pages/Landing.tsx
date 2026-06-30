import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Bitcoin, Menu, MessageCircle, PiggyBank,
  Shield, X, Zap, Users, Clock,
  Wallet, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc, fcfaToBtc } from "@/lib/bitcoin";
import { getBtcPool, formatFCFA } from "@/lib/bitcoinWallet";
import BitcoinLiveCard from "@/components/crypto/BitcoinLiveCard";
import LandingMockupShowcase from "@/components/landing/LandingMockupShowcase";
import ErrorBoundary from "@/components/ErrorBoundary";

const products = [
  {
    title: "Tontine ROSCA",
    subtitle: "Créer · rejoindre · activer",
    desc: "Montant, fréquence, ordre de passage. Invitation par lien. L'admin active le groupe.",
    color: "from-violet-600 to-purple-500",
    icon: Users,
    to: "/inscription",
  },
  {
    title: "Cotisations FCFA",
    subtitle: "MTN · Moov · Celtiis · Kkiapay",
    desc: "Mobile Money ou portefeuille interne. Prélèvement auto à l'échéance.",
    color: "from-emerald-500 to-teal-500",
    icon: PiggyBank,
    to: "/inscription",
  },
  {
    title: "Trésor Bitcoin",
    subtitle: "Sats · preuves secp256k1",
    desc: "Convertissez en satoshis, stakez dans le trésor. Engagements signés par groupe.",
    color: "from-amber-500 to-orange-500",
    icon: Bitcoin,
    to: "/crypto",
  },
  {
    title: "Bot WhatsApp",
    subtitle: "Sans télécharger l'app",
    desc: "/solde, /groupes, /cotiser, /bitcoin — gérez la tontine par message.",
    color: "from-[#25D366] to-emerald-600",
    icon: MessageCircle,
    to: "/whatsapp",
  },
];

const steps = [
  { n: "01", title: "Inscrivez-vous", desc: "Email + téléphone. Portefeuille FCFA créé automatiquement." },
  { n: "02", title: "Créez ou rejoignez", desc: "Groupe paramétré ou invitation par lien. Assurance vie à la création." },
  { n: "03", title: "Activez et cotisez", desc: "MoMo via Kkiapay. Versement auto quand tout le monde a payé." },
  { n: "04", title: "Sécurisez et suivez", desc: "Score, notifications, preuves Bitcoin et commandes WhatsApp." },
];

const features = [
  { icon: Wallet, title: "Portefeuille FCFA", desc: "Dépôts MoMo, solde disponible et montants verrouillés." },
  { icon: Clock, title: "Versement automatique", desc: "Cagnotte versée dès que tous les membres ont cotisé." },
  { icon: Shield, title: "Score de confiance", desc: "Ponctualité et participation. Score ≥ 700 = groupes premium." },
  { icon: AlertTriangle, title: "Garanties & pénalités", desc: "Assurance vie obligatoire. Retard = compte suspendu." },
];

const solutionPoints = [
  { icon: Users, text: "Groupe paramétrable : fréquence, ordre aléatoire ou manuel." },
  { icon: Wallet, text: "Cotisations MTN, Moov, Celtiis via Kkiapay." },
  { icon: Clock, text: "Versement automatique à chaque tour complet." },
  { icon: Shield, text: "Retard : suspension + pénalités configurables." },
  { icon: Bitcoin, text: "Trésor Bitcoin et preuves secp256k1 par groupe." },
  { icon: MessageCircle, text: "Bot WhatsApp intégré aux mêmes données." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const pool = getBtcPool();
  const { data: btc } = useBitcoinPrice();
  const [amount, setAmount] = useState(50000);
  const [members, setMembers] = useState(8);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    if (!loading && user) navigate("/home", { replace: true });
  }, [loading, user, navigate]);

  const safeAmount = Number.isFinite(amount) && amount >= 1000 ? amount : 50000;
  const safeMembers = Number.isFinite(members) && members >= 2 && members <= 50 ? members : 8;

  const projection = useMemo(() => {
    const payoutPerTurn = safeAmount * safeMembers;
    const tcTotal = payoutPerTurn * 1.08;
    const btcEquiv = btc?.priceXof ? formatBtc(fcfaToBtc(tcTotal, btc.priceXof)) : null;
    return { payoutPerTurn, tcTotal, btcEquiv };
  }, [safeAmount, safeMembers, btc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(270_33%_99%)] animate-pulse">
        <div className="h-16 bg-white border-b border-violet-100" />
        <div className="max-w-3xl mx-auto px-6 pt-20 space-y-4">
          <div className="h-10 bg-violet-100 rounded-full w-48 mx-auto" />
          <div className="h-14 bg-violet-100 rounded-2xl w-full" />
          <div className="h-24 bg-violet-50 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  const navLinks = [
    { label: "Solution", to: "#solution" },
    { label: "Aperçus", to: "#apercus" },
    { label: "Bitcoin", to: "/crypto" },
    { label: "WhatsApp", to: "/whatsapp" },
  ];

  const handleNav = (to: string) => {
    if (to.startsWith("#")) document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
    else navigate(to);
  };

  return (
    <div className="min-h-screen bg-[hsl(270_33%_99%)] text-[hsl(260_40%_12%)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-violet-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl tc-gradient-brand flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[hsl(266_62%_33%)]">TontineChain</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {navLinks.map((l) => (
              <button key={l.label} type="button" onClick={() => handleNav(l.to)} className="hover:text-[hsl(266_62%_33%)]">
                {l.label}
              </button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <button type="button" onClick={() => navigate("/connexion")} className="text-sm font-semibold text-[hsl(266_62%_33%)]">
              Connexion
            </button>
            <button type="button" onClick={() => navigate("/inscription")} className="text-sm font-semibold text-white tc-gradient-brand px-5 py-2.5 rounded-full tc-shadow-green">
              S'inscrire
            </button>
          </div>
          <button type="button" className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-violet-100 bg-white px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <button key={l.label} type="button" className="block w-full text-left text-sm font-medium py-2" onClick={() => { setMenuOpen(false); handleNav(l.to); }}>
                {l.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => navigate("/connexion")} className="flex-1 py-2.5 rounded-full border border-violet-200 text-sm font-semibold">Connexion</button>
              <button type="button" onClick={() => navigate("/inscription")} className="flex-1 py-2.5 rounded-full tc-gradient-brand text-white text-sm font-semibold">S'inscrire</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="tc-gradient-hero-cw overflow-hidden relative">
        <div className="absolute inset-0 tc-grid-bg opacity-40 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-20 text-center relative animate-slide-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-[11px] font-bold text-[hsl(266_62%_33%)] mb-5">
            <Zap className="w-3 h-3" /> Tontine ROSCA · Bitcoin · Bénin
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900">
            Votre tontine,
            <br />
            <span className="text-[hsl(266_62%_33%)]">digitale et traçable</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Cotisations Mobile Money, trésor en satoshis, preuves cryptographiques et bot WhatsApp —
            une plateforme pour les communautés d'épargne en Afrique de l'Ouest.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={() => navigate("/inscription")} className="inline-flex items-center justify-center gap-2 text-white tc-gradient-brand px-8 py-4 rounded-full text-base font-bold tc-shadow-green hover:scale-[1.02] transition-transform">
              Créer ma tontine <ArrowRight className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => navigate("/crypto")} className="inline-flex items-center justify-center gap-2 border-2 border-amber-300 text-amber-800 bg-amber-50 px-8 py-4 rounded-full text-base font-bold hover:bg-amber-100 transition-colors">
              <Bitcoin className="w-5 h-5" /> Voir le trésor
            </button>
          </div>
          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { v: formatFCFA(pool.tvlFcfa).replace(" FCFA", ""), l: "Trésor collectif" },
              { v: String(pool.contributors), l: "Membres" },
              { v: `${pool.btcReserve.toFixed(2)} BTC`, l: "Réserve" },
              { v: `${pool.apy}%`, l: "APY trésor" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/90 border border-violet-100 px-2 py-3 tc-shadow-card-cw">
                <p className="text-sm sm:text-base font-bold text-[hsl(266_62%_33%)] truncate">{s.v}</p>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">{s.l}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_minmax(0,340px)] gap-6 items-start">
          <div className="hidden lg:block pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(266_62%_33%)] mb-2">Cours en direct</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Le trésor TontineChain est indexé sur le prix Bitcoin en temps réel.
              Chaque groupe peut convertir sa part de cagnotte en satoshis et consulter
              l'équivalent FCFA de sa réserve à tout moment.
            </p>
          </div>
          <ErrorBoundary compact title="Cours Bitcoin">
            <BitcoinLiveCard fcfaAmount={pool.tvlFcfa} />
          </ErrorBoundary>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500 lg:hidden">
          Prix Bitcoin live — équivalent FCFA de la réserve collective
        </p>
      </section>

      {/* Solution */}
      <section id="solution" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(266_62%_33%)] mb-3">Le problème</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Les tontines informelles manquent de confiance
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Sans registre partagé, les cotisations sont difficiles à vérifier et les litiges s'accumulent.
            </p>
          </div>
          <div className="rounded-3xl bg-white border border-violet-100 p-8 tc-shadow-card-cw">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">TontineChain</p>
            <ul className="space-y-4">
              {solutionPoints.map((item) => (
                <li key={item.text} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                  <item.icon className="w-4 h-4 text-[hsl(266_62%_33%)] shrink-0 mt-0.5" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Aperçus — un mockup à la fois */}
      <section id="apercus" className="tc-gradient-purple-soft py-10 lg:py-12 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Aperçus produit</h2>
            <p className="mt-1.5 text-slate-600 text-sm max-w-2xl leading-relaxed">
              Application, bot WhatsApp et trésor Bitcoin — un seul registre de cotisations.
            </p>
          </div>
          <ErrorBoundary compact title="Aperçus produit">
            <LandingMockupShowcase />
          </ErrorBoundary>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-14">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Fonctionnalités</h2>
          <p className="mt-3 text-slate-600 text-sm leading-relaxed">
            De la cotisation Mobile Money au versement automatique, en passant par le score de confiance
            et les garanties — tout est pensé pour les tontines en Afrique de l'Ouest.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-violet-100 p-5 tc-shadow-card-cw">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[hsl(266_62%_33%)]" />
              </div>
              <h3 className="font-bold text-sm">{f.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Parcours */}
      <section id="comment" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-14">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Comment ça marche</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Du quartier à la diaspora — inscrivez-vous, créez votre groupe, cotisez en MoMo
            et sécurisez la cagnotte en Bitcoin. Quatre étapes, zéro paperasse.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-3xl bg-white border border-violet-100 p-6 tc-shadow-card-cw">
              <p className="text-3xl font-extrabold text-violet-200">{s.n}</p>
              <h3 className="text-lg font-bold mt-2">{s.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules + simulateur */}
      <section className="tc-gradient-purple-soft py-12 lg:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-center mb-8">Quatre modules, une cagnotte</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <button key={p.title} type="button" onClick={() => navigate(p.to)} className="group text-left rounded-3xl bg-white border border-violet-100 p-6 tc-shadow-card-cw hover:border-violet-200 hover:-translate-y-1 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-5`}>
                  <p.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="text-xs font-semibold text-[hsl(266_62%_33%)] mt-1">{p.subtitle}</p>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{p.desc}</p>
                <span className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[hsl(266_62%_33%)] group-hover:gap-2 transition-all">
                  Explorer <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center mt-12 lg:mt-14 pt-10 border-t border-violet-200/50">
          <h2 className="text-3xl font-extrabold">Simulateur de cagnotte</h2>
          <p className="mt-3 text-slate-600">Cagnotte à votre tour = cotisation × nombre de membres</p>
          <div className="mt-8 rounded-3xl bg-white border border-violet-100 p-6 sm:p-8 tc-shadow-card-cw text-left">
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Cotisation (FCFA)</span>
                <input type="number" value={amount} min={1000} onChange={(e) => setAmount(Number(e.target.value) || 1000)} className="mt-1 w-full rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Membres</span>
                <input type="number" value={members} min={2} max={50} onChange={(e) => setMembers(Number(e.target.value) || 2)} className="mt-1 w-full rounded-xl border border-violet-100 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </label>
            </div>
            <p className="text-sm text-slate-500">À votre tour</p>
            <p className="text-3xl font-extrabold text-[hsl(266_62%_33%)] mt-1">{formatFCFA(projection.payoutPerTurn)}</p>
            {projection.btcEquiv && <p className="text-sm font-semibold text-amber-700 mt-2">≈ {projection.btcEquiv}</p>}
            <div className="mt-6 pt-6 border-t border-violet-50 flex justify-between">
              <span className="text-[10px] text-slate-500">Avec réserve BTC (+8%)</span>
              <span className="font-bold text-emerald-600">{formatFCFA(projection.tcTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-[2rem] tc-gradient-brand text-white p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Prêt à lancer votre tontine ?</h2>
          <p className="mt-3 text-white/85 max-w-lg mx-auto">Inscription gratuite. Cotisations en MoMo, sans carte bancaire.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button type="button" onClick={() => navigate("/inscription")} className="bg-white text-[hsl(266_62%_33%)] px-8 py-4 rounded-full font-bold hover:bg-violet-50 transition-colors">
              Créer un compte
            </button>
            <button type="button" onClick={() => navigate("/whatsapp")} className="border-2 border-white/40 px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Bot WhatsApp
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-violet-100 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[hsl(266_62%_33%)]" />
            <span className="font-bold text-[hsl(266_62%_33%)]">TontineChain</span>
            <span>· Bénin</span>
          </div>
          <p>React · Supabase · Kkiapay · CoinGecko</p>
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
