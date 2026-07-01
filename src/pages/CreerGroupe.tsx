import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { generateInviteCode } from "../../supabase/functions/_shared/whatsapp/utils";
import { DEMO_NSIA_POLICY_NUMBER } from "@/config/insurance";
import { toast } from "sonner";
import {
  Info, ShieldCheck, TrendingUp, Users, Calendar,
  Coins, Clock, ChevronRight, Zap, Lock
} from "lucide-react";

type Frequency = "Journalier" | "Hebdomadaire" | "Bimensuelle" | "Mensuelle" | "Trimestrielle";

const FREQ_LABELS: Record<Frequency, string> = {
  Journalier: "Journalier (1 j)",
  Hebdomadaire: "Hebdomadaire (7 j)",
  Bimensuelle: "Bi-mensuelle (15 j)",
  Mensuelle: "Mensuelle (30 j)",
  Trimestrielle: "Trimestrielle (90 j)",
};

const FREQ_DESC: Record<Frequency, string> = {
  Journalier: "Cotisations et versements chaque jour. Idéal pour des petits groupes très actifs.",
  Hebdomadaire: "Un tour toutes les semaines. Bon équilibre entre fréquence et sécurité.",
  Bimensuelle: "Cotisation toutes les deux semaines (quinzaine).",
  Mensuelle: "Le format classique. Un seul tour par mois pour tout le monde.",
  Trimestrielle: "Un tour tous les 3 mois. Adapté aux grosses mises ou projets longs.",
};

export default function CreerGroupe() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    frequency: "Mensuelle" as Frequency,
    memberCount: "5",   // nombre total de membres (vous inclus)
    order: "random",
    penalty: "5",
    guarantee: DEMO_NSIA_POLICY_NUMBER,
    minScore: "0",
    commitmentAccepted: false,
  });
  useEffect(() => {
    const seen = localStorage.getItem("hasSeenCreationIntro");
    if (!seen) setShowIntro(true);
  }, []);

  const closeIntro = () => {
    localStorage.setItem("hasSeenCreationIntro", "true");
    setShowIntro(false);
  };

  const totalMembers = Math.min(Math.max(parseInt(form.memberCount, 10) || 0, 2), 50);
  const clampedMembers = totalMembers;

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.amount) {
      toast.error("Veuillez remplir le nom et le montant");
      return;
    }
    if (!form.guarantee.trim()) {
      toast.error("Votre numéro de police d'assurance vie est obligatoire");
      return;
    }
    if (!form.commitmentAccepted) {
      toast.error("Vous devez accepter la reconnaissance d'engagement tontinier");
      return;
    }
    const members = parseInt(form.memberCount, 10);
    if (!members || members < 2) {
      toast.error("Il faut au moins 2 membres au total, créateur inclus.");
      return;
    }
    if (members > 50) {
      toast.error("Le groupe ne peut pas dépasser 50 membres au total.");
      return;
    }
    setLoading(true);
    try {
      const maxMembers = totalMembers;
      const initials = form.name.trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "GR";
      const colors = ["green", "blue", "amber", "purple", "red"];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: form.name.trim(),
          initials,
          color,
          contribution_amount: parseFloat(form.amount),
          frequency: form.frequency,
          max_members: maxMembers,
          total_rounds: maxMembers,
          penalty_rate: parseFloat(form.penalty) || 5,
          guarantee_deposit: 0,
          order_type: form.order === "random" ? "random" : "manual",
          min_score: parseInt(form.minScore, 10) || 0,
          status: "pending",
          created_by: user.id,
          invite_code: generateInviteCode(),
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter le créateur comme admin (member #1)
      const { error: memberErr } = await supabase.from("group_members").insert({
        group_id: data.id,
        profile_id: user.id,
        role: "admin",
        turn_order: 1,
        status: "waiting",
        guarantee_type: "life_insurance",
        guarantee_proof: form.guarantee,
        guarantee_status: "verified",
      });
      if (memberErr) {
        // Rollback: delete the orphaned group
        await supabase.from("groups").delete().eq("id", data.id);
        throw memberErr;
      }

      await refreshProfile();
      toast.success("🎉 Groupe créé ! Vous êtes membre n°1.");
      navigate(`/groupe/${data.id}`);
    } catch (err: unknown) {
      console.error("[CreerGroupe] Full Error:", err);
      const maybeError = err as { message?: string; details?: string; hint?: string };
      const details = maybeError.details || maybeError.hint || "";
      toast.error((maybeError.message || "Erreur lors de la création") + (details ? ` (${details})` : ""));
    } finally {
      setLoading(false);
    }
  };

  // ─── INTRO ─────────────────────────────────────────────────────────────────
  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-fade-in overflow-y-auto">
        <div className="flex-1 px-5 pt-14 pb-8">
          <div className="w-16 h-16 rounded-3xl tc-gradient-green flex items-center justify-center mb-6 mx-auto tc-shadow-green">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-1">Comment fonctionne une tontine ?</h2>
          <p className="text-[11px] text-muted-foreground text-center mb-8 px-4">
            Lisez attentivement — cela vous aidera à créer un groupe efficace.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: Users,
                color: "text-[hsl(var(--tc-green))]",
                bg: "bg-[hsla(160,84%,39%,0.1)]",
                title: "Principe de la tontine",
                body: "Tous les membres cotisent régulièrement le même montant. À chaque tour, LA TOTALITÉ de la cagnotte accumulée est versée à UN SEUL membre (selon l'ordre défini). Le cycle recommence jusqu'à ce que tout le monde ait reçu son tour.",
              },
              {
                icon: Calendar,
                color: "text-[hsl(var(--tc-blue))]",
                bg: "bg-[hsla(210,84%,60%,0.1)]",
                title: "Fréquence & Tours",
                body: "Si vous créez un groupe de 5 personnes à cotisation mensuelle de 10 000 FCFA, chaque mois un membre reçoit 50 000 FCFA (5 × 10 000). Le cycle dure 5 mois. Chaque membre reçoit une fois.",
              },
              {
                icon: Zap,
                color: "text-[hsl(var(--tc-amber))]",
                bg: "bg-[hsla(38,92%,50%,0.1)]",
                title: "Versement automatique",
                body: "Lorsque TOUS les membres ont cotisé dans un tour, TontineChain verse automatiquement la cagnotte au bénéficiaire de ce tour. Aucune action manuelle requise.",
              },
              {
                icon: Lock,
                color: "text-[hsl(var(--tc-red))]",
                bg: "bg-[hsla(0,84%,60%,0.1)]",
                title: "Compte verrouillé si retard",
                body: "Si vous ne cotisez pas avant l'échéance, votre statut passe en RETARD. Votre portefeuille est suspendu (retraits bloqués) jusqu'à régularisation. Le groupe peut vous exclure.",
              },
              {
                icon: ShieldCheck,
                color: "text-[hsl(var(--tc-green))]",
                bg: "bg-[hsla(160,84%,39%,0.1)]",
                title: "Assurance Vie obligatoire",
                body: "Le paiement de l'assurance vie est obligatoire pour tous les membres. En cas de décès, l'assurance prend le relais et couvre les cotisations restantes, garantissant ainsi la pérennité de la tontine communautaire.",
              },
              {
                icon: TrendingUp,
                color: "text-[hsl(var(--tc-purple))]",
                bg: "bg-[hsla(280,60%,60%,0.1)]",
                title: "Score de confiance",
                body: "Chaque membre a un score (0-1000). Payer à temps augmente le score, les retards le diminuent. Vous pouvez fixer un score minimum pour filtrer les membres.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-bold mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-border bg-card/95 backdrop-blur-sm">
          <button
            onClick={closeIntro}
            className="w-full py-4 rounded-xl font-bold text-white tc-gradient-green tc-shadow-green flex items-center justify-center gap-2"
          >
            J'ai compris — Créer mon groupe <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── FORMULAIRE ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up pb-8">
      <TopBar
        title="Créer un groupe"
        backTo="/home"
        backLabel="Accueil"
        rightElement={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[hsl(var(--tc-green))] font-semibold">Étape {step}/2</span>
            <button
              type="button"
              onClick={() => setShowIntro(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Aide"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        }
      />
      <div className="px-4">
        <ProgressBar value={(step / 2) * 100} className="mb-5" />

        {/* ── ÉTAPE 1 : Informations de base ─────────────────────────── */}
        {step === 1 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom du groupe *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex : Tontine Famille Adjovi"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Montant de cotisation par tour (FCFA) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="50 000"
                  min="100"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
                />
                <div className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-muted-foreground">FCFA</div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                + 20 FCFA de frais réseau par cotisation
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fréquence de cotisation</label>
              <div className="flex flex-col gap-2">
                {(Object.keys(FREQ_LABELS) as Frequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm({ ...form, frequency: f })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.frequency === f
                        ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.06)]"
                        : "border-border bg-card"
                    }`}
                  >
                    <p className="text-xs font-bold">{FREQ_LABELS[f]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{FREQ_DESC[f]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nombre total de membres (vous inclus)
              </label>
              <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed bg-[hsla(160,84%,39%,0.06)] border border-[hsla(160,84%,39%,0.15)] rounded-lg px-2.5 py-2">
                💡 <strong>Le créateur est inclus automatiquement.</strong> Entrez le nombre total de participants. Total : {clampedMembers} membres.
              </p>
              <input
                type="number"
                value={form.memberCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 50) {
                    setForm({ ...form, memberCount: "50" });
                  } else {
                    setForm({ ...form, memberCount: e.target.value });
                  }
                }}
                min="2"
                max="50"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
              />
              {form.amount && parseInt(form.memberCount) >= 2 && (
                <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                  Chaque membre reçoit{" "}
                  <strong className="text-[hsl(var(--tc-green))]">
                    {new Intl.NumberFormat("fr-FR").format(parseFloat(form.amount) * totalMembers)} FCFA
                  </strong>{" "}
                  à son tour.
                </p>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.name.trim() || !form.amount || parseInt(form.memberCount) < 2}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Sécurité & Options ──────────────────────────── */}
        {step === 2 && (
          <div className="animate-slide-up flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ordre de passage</label>
              <p className="text-[10px] text-muted-foreground mb-2">Qui reçoit la cagnotte en premier ?</p>
              <div className="flex gap-2">
                {[
                  { val: "random", label: "🎲 Aléatoire", desc: "Tirage au sort sécurisé lorsque le groupe est complet" },
                  { val: "manual", label: "✋ Manuel", desc: "Vous définissez l'ordre manuellement après création" },
                ].map((o) => (
                  <button
                    key={o.val}
                    type="button"
                    onClick={() => setForm({ ...form, order: o.val })}
                    className={`flex-1 py-3 px-2 rounded-xl text-left border-2 transition-colors ${
                      form.order === o.val
                        ? "border-[hsl(var(--tc-green))] text-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)]"
                        : "border-border text-muted-foreground bg-card"
                    }`}
                  >
                    <p className="text-xs font-bold">{o.label}</p>
                    <p className="text-[9px] mt-0.5 opacity-80">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Pénalité de retard (%)
              </label>
              <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
                Majoration appliquée sur les cotisations tardives pour décourager les retards.
              </p>
              <div className="flex gap-2">
                {["0", "5", "10", "15", "20"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, penalty: v })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${
                      form.penalty === v
                        ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)] text-[hsl(var(--tc-green))]"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Numéro de police d'assurance vie — Obligatoire
                  </label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Le paiement de cette assurance vie est obligatoire pour sécuriser le groupe. En cas de décès, elle couvre vos échéances.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[hsla(38,92%,50%,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[hsl(var(--tc-amber))]">
                  Obligatoire
                </span>
              </div>
              <input
                type="text"
                value={form.guarantee}
                onChange={(e) => setForm({ ...form, guarantee: e.target.value })}
                placeholder={DEMO_NSIA_POLICY_NUMBER}
                className="w-full px-4 py-3 rounded-3xl border border-border bg-card text-sm outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
              />
              <div className="rounded-3xl border border-[hsla(38,92%,50%,0.15)] bg-[hsla(38,92%,50%,0.06)] p-3 text-[10px] text-muted-foreground">
                <p className="font-semibold text-[11px] text-foreground mb-1">Sécurité communautaire</p>
                <p>La tontine est strictement privée. L'assurance vie garantit que l'épargne de vos proches ou des membres n'est pas perdue en cas d'imprévu.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Score minimum requis (0 – 1000)
              </label>
              <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
                Filtrez les candidats en dessous d'un certain score de confiance. 0 = tout le monde accepté.
              </p>
              <div className="flex gap-2">
                {["0", "300", "500", "700"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, minScore: v })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${
                      form.minScore === v
                        ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)] text-[hsl(var(--tc-green))]"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {v === "0" ? "Aucun" : v}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-3xl border border-[hsla(160,84%,39%,0.18)] bg-[hsla(160,84%,39%,0.06)] p-3">
              <input
                type="checkbox"
                checked={form.commitmentAccepted}
                onChange={(e) => setForm({ ...form, commitmentAccepted: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[hsl(var(--tc-green))]"
              />
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="block text-xs text-foreground mb-1">Reconnaissance d’engagement tontinier</strong>
                J’accepte que les règles soient figées à l’activation, que chaque membre cotise jusqu’à la fin du cycle, que les retards déclenchent pénalité/blocage, et que la garantie ou assurance prenne le relais en cas de défaillance ou décès.
              </span>
            </label>

            {/* Récapitulatif */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[hsl(var(--tc-green))]" />
                Récapitulatif de votre tontine
              </p>
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom</span><span className="font-medium">{form.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Membres total</span><span className="font-medium">{totalMembers} membres</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cotisation</span><span className="font-medium">{form.amount ? new Intl.NumberFormat("fr-FR").format(parseFloat(form.amount)) + " FCFA" : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fréquence</span><span className="font-medium">{form.frequency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cagnotte par tour</span><span className="font-bold text-[hsl(var(--tc-green))]">{form.amount ? new Intl.NumberFormat("fr-FR").format(parseFloat(form.amount) * totalMembers) + " FCFA" : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pénalité</span><span>{form.penalty}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assurance Vie</span><span className="text-[hsl(var(--tc-green))] font-medium">Obligatoire</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Engagement</span><span className={form.commitmentAccepted ? "text-[hsl(var(--tc-green))] font-medium" : "text-[hsl(var(--tc-red))] font-medium"}>{form.commitmentAccepted ? "Accepté" : "À signer"}</span></div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-border text-foreground bg-card"
              >
                ← Retour
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !form.commitmentAccepted}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green disabled:opacity-50"
              >
                {loading ? "Création..." : "Créer le groupe →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}