import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  ArrowRight, Bitcoin, MessageCircle, PiggyBank,

  Shield, Users, Clock,

  Wallet, AlertTriangle,

} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";

import { formatBtc, fcfaToBtc } from "@/lib/bitcoin";

import { formatFCFA } from "@/lib/bitcoinWallet";

import { usePublicStats, statsToPool } from "@/hooks/usePublicStats";

import BitcoinLiveCard from "@/components/crypto/BitcoinLiveCard";

import LandingMockupShowcase from "@/components/landing/LandingMockupShowcase";

import LandingHeader from "@/components/landing/LandingHeader";

import LandingHero from "@/components/landing/LandingHero";

import ErrorBoundary from "@/components/ErrorBoundary";



const products = [

  {

    title: "Tontine ROSCA",

    subtitle: "Créer · rejoindre · activer",

    desc: "Montant, fréquence, ordre de passage. Invitation par lien. L'admin active le groupe.",

    color: "from-[hsl(243,100%,68%)] to-[hsl(252,98%,61%)]",

    icon: Users,

    to: "/rechercher",

  },

  {

    title: "Cotisations FCFA",

    subtitle: "MTN · Moov · Celtiis · Kkiapay",

    desc: "Mobile Money ou portefeuille interne. Prélèvement auto à l'échéance.",

    color: "from-emerald-400 to-[hsl(156,73%,53%)]",

    icon: PiggyBank,

    to: "/rechercher",

  },

  {

    title: "Trésor Bitcoin",

    subtitle: "Sats · preuves secp256k1",

    desc: "Convertissez en satoshis, stakez dans le trésor. Engagements signés par groupe.",

    color: "from-amber-400 to-orange-500",

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

  { n: "01", title: "Explorez ou inscrivez-vous", desc: "Parcourez groupes et trésor sans compte. Inscription pour cotiser." },

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

  const { data: publicStats } = usePublicStats();

  const pool = statsToPool(publicStats);

  const membersCount = publicStats?.members_count ?? 0;

  const { data: btc } = useBitcoinPrice();

  const [amount, setAmount] = useState(50000);

  const [members, setMembers] = useState(8);



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



  const heroStats = [

    { value: formatFCFA(pool.tvlFcfa).replace(" FCFA", ""), label: "Trésor collectif" },

    { value: String(membersCount || pool.contributors), label: "Membres" },

    { value: `${pool.btcReserve.toFixed(2)} BTC`, label: "Réserve" },

    { value: `${pool.apy}%`, label: "APY trésor" },

  ];



  if (loading) {

    return (

      <div className="min-h-screen bg-[hsl(var(--tc-mist))] animate-pulse">

        <div className="h-16 bg-white border-b border-[hsl(var(--tc-border))]" />

        <div className="max-w-3xl mx-auto px-6 pt-20 space-y-4">

          <div className="h-8 bg-slate-200 rounded-full w-56 mx-auto" />

          <div className="h-14 bg-slate-200 rounded-2xl w-full" />

          <div className="h-24 bg-slate-100 rounded-2xl w-full" />

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-[hsl(var(--tc-mist))] text-[hsl(var(--tc-text))]">

      <LandingHeader />



      <LandingHero stats={heroStats} />



      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

        <div className="grid lg:grid-cols-[1fr_minmax(0,360px)] gap-8 items-start">

          <div className="hidden lg:block pt-2">

            <span className="tc-badge-emerald tc-badge mb-3">Live · CoinGecko</span>

            <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">Cours en direct</h2>

            <p className="mt-3 text-sm text-[hsl(var(--tc-muted))] leading-relaxed max-w-md">

              Le trésor HACKBIT est indexé sur le prix Bitcoin en temps réel.

              Chaque groupe peut convertir sa part de cagnotte en satoshis et consulter

              l'équivalent FCFA de sa réserve à tout moment.

            </p>

          </div>

          <ErrorBoundary compact title="Cours Bitcoin">

            <BitcoinLiveCard fcfaAmount={pool.tvlFcfa} />

          </ErrorBoundary>

        </div>

      </section>



      <section id="solution" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">

        <div className="grid lg:grid-cols-2 gap-12 items-start">

          <div>

            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--tc-violet))] mb-3">Le problème</p>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--tc-ink))] leading-tight">

              Les tontines informelles manquent de confiance

            </h2>

            <p className="mt-4 text-[hsl(var(--tc-muted))] leading-relaxed">

              Sans registre partagé, les cotisations sont difficiles à vérifier et les litiges s'accumulent.

            </p>

          </div>

          <div className="tc-card-elevated p-8">

            <p className="tc-badge-emerald tc-badge mb-4">HACKBIT</p>

            <ul className="space-y-4">

              {solutionPoints.map((item) => (

                <li key={item.text} className="flex gap-3 text-sm text-[hsl(var(--tc-text))] leading-relaxed">

                  <item.icon className="w-4 h-4 text-[hsl(var(--tc-violet))] shrink-0 mt-0.5" />

                  {item.text}

                </li>

              ))}

            </ul>

          </div>

        </div>

      </section>



      <section id="apercus" className="tc-gradient-purple-soft py-14 scroll-mt-24">

        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="mb-8">

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">Aperçus produit</h2>

            <p className="mt-2 text-[hsl(var(--tc-muted))] text-sm max-w-2xl leading-relaxed">

              Bot WhatsApp, trésor Bitcoin et interface web — propulsé par Lightning Network.

            </p>

          </div>

          <ErrorBoundary compact title="Aperçus produit">

            <LandingMockupShowcase />

          </ErrorBoundary>

        </div>

      </section>



      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        <div className="text-center max-w-2xl mx-auto mb-10">

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">Fonctionnalités</h2>

          <p className="mt-3 text-[hsl(var(--tc-muted))] text-sm leading-relaxed">

            De la cotisation Mobile Money au versement automatique — pensé pour l'Afrique de l'Ouest.

          </p>

        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {features.map((f) => (

            <div key={f.title} className="tc-card-elevated p-5 transition-transform hover:-translate-y-0.5">

              <div className="w-10 h-10 rounded-xl bg-[hsla(243,100%,68%,0.1)] flex items-center justify-center mb-4">

                <f.icon className="w-5 h-5 text-[hsl(var(--tc-violet))]" />

              </div>

              <h3 className="font-semibold text-sm text-[hsl(var(--tc-ink))]">{f.title}</h3>

              <p className="text-xs text-[hsl(var(--tc-muted))] mt-2 leading-relaxed">{f.desc}</p>

            </div>

          ))}

        </div>

      </section>



      <section id="comment" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        <div className="text-center max-w-2xl mx-auto mb-10">

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">Comment ça marche</h2>

          <p className="mt-3 text-[hsl(var(--tc-muted))] leading-relaxed">

            Explorez sans compte, inscrivez-vous pour cotiser. Quatre étapes, zéro paperasse.

          </p>

        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {steps.map((s) => (

            <div key={s.n} className="tc-card-elevated p-6">

              <p className="text-3xl font-bold text-[hsla(243,100%,68%,0.25)]">{s.n}</p>

              <h3 className="text-base font-semibold mt-2 text-[hsl(var(--tc-ink))]">{s.title}</h3>

              <p className="text-sm text-[hsl(var(--tc-muted))] mt-2 leading-relaxed">{s.desc}</p>

            </div>

          ))}

        </div>

      </section>



      <section className="tc-gradient-purple-soft py-16">

        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <h2 className="text-3xl font-bold text-center tracking-tight text-[hsl(var(--tc-ink))] mb-10">

            Quatre modules, une cagnotte

          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {products.map((p) => (

              <button

                key={p.title}

                type="button"

                onClick={() => navigate(p.to)}

                className="group text-left tc-card-elevated p-6 hover:-translate-y-1 transition-all"

              >

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-5 shadow-sm`}>

                  <p.icon className="w-6 h-6 text-white" />

                </div>

                <h3 className="text-lg font-semibold text-[hsl(var(--tc-ink))]">{p.title}</h3>

                <p className="text-xs font-medium text-[hsl(var(--tc-violet))] mt-1">{p.subtitle}</p>

                <p className="text-sm text-[hsl(var(--tc-muted))] mt-3 leading-relaxed">{p.desc}</p>

                <span className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[hsl(var(--tc-violet))] group-hover:gap-2 transition-all">

                  Explorer <ArrowRight className="w-4 h-4" />

                </span>

              </button>

            ))}

          </div>

        </div>



        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center mt-14 pt-12 border-t border-[hsl(var(--tc-border))]">

          <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">Simulateur de cagnotte</h2>

          <p className="mt-3 text-[hsl(var(--tc-muted))]">Cagnotte à votre tour = cotisation × nombre de membres</p>

          <div className="mt-8 tc-card-elevated p-6 sm:p-8 text-left">

            <div className="grid sm:grid-cols-2 gap-4 mb-6">

              <label className="block">

                <span className="text-xs font-semibold text-[hsl(var(--tc-muted))]">Cotisation (FCFA)</span>

                <input

                  type="number"

                  value={amount}

                  min={1000}

                  onChange={(e) => setAmount(Number(e.target.value) || 1000)}

                  className="mt-1.5 w-full rounded-xl border border-[hsl(var(--tc-border))] px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--tc-violet)/0.4)]"

                />

              </label>

              <label className="block">

                <span className="text-xs font-semibold text-[hsl(var(--tc-muted))]">Membres</span>

                <input

                  type="number"

                  value={members}

                  min={2}

                  max={50}

                  onChange={(e) => setMembers(Number(e.target.value) || 2)}

                  className="mt-1.5 w-full rounded-xl border border-[hsl(var(--tc-border))] px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--tc-violet)/0.4)]"

                />

              </label>

            </div>

            <p className="text-sm text-[hsl(var(--tc-muted))]">À votre tour</p>

            <p className="text-3xl font-bold text-[hsl(var(--tc-ink))] mt-1 tracking-tight">{formatFCFA(projection.payoutPerTurn)}</p>

            {projection.btcEquiv && (

              <p className="text-sm font-semibold text-amber-700 mt-2 font-mono-tech">≈ {projection.btcEquiv}</p>

            )}

            <div className="mt-6 pt-6 border-t border-[hsl(var(--tc-border))] flex justify-between items-center">

              <span className="text-[10px] text-[hsl(var(--tc-muted))]">Avec réserve BTC (+8%)</span>

              <span className="font-bold text-[hsl(var(--tc-emerald))]">{formatFCFA(projection.tcTotal)}</span>

            </div>

          </div>

        </div>

      </section>



      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 pt-4">

        <div className="rounded-[2rem] tc-gradient-ink text-white p-10 sm:p-14 text-center relative overflow-hidden">

          <div className="absolute inset-0 tc-grid-fine opacity-20 pointer-events-none" />

          <div className="relative">

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Prêt à lancer votre tontine ?</h2>

            <p className="mt-3 text-white/75 max-w-lg mx-auto">

              Explorez groupes et trésor sans compte. Inscription gratuite pour cotiser en MoMo.

            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">

              <button type="button" onClick={() => navigate("/rechercher")} className="tc-btn-secondary !bg-white">

                Explorer sans compte

              </button>

              <button type="button" onClick={() => navigate("/inscription")} className="tc-btn-primary">

                Créer un compte

              </button>

              <button

                type="button"

                onClick={() => navigate("/whatsapp")}

                className="tc-btn-ghost !text-white hover:!bg-white/10 gap-2"

              >

                <MessageCircle className="w-5 h-5" /> WhatsApp

              </button>

            </div>

          </div>

        </div>

      </section>



      <footer className="border-t border-[hsl(var(--tc-border))] bg-white py-10">

        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[hsl(var(--tc-muted))]">

          <div className="flex items-center gap-2">

            <Shield className="w-4 h-4 text-[hsl(var(--tc-violet))]" />

            <span className="font-semibold text-[hsl(var(--tc-ink))]">HACKBIT</span>

            <span>· Bénin</span>

          </div>

          <p className="font-mono-tech">React · Flask · Lightning · Kkiapay · WhatsApp</p>

          <p>© {new Date().getFullYear()}</p>

        </div>

      </footer>

    </div>

  );

}


