import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { initPayment, payFromWallet } from "@/lib/kkiapay";
import PhoneInput from "@/components/ui/PhoneInput";
import InsuranceModal from "@/components/ui/InsuranceModal";
import { DEMO_NSIA_POLICY_NUMBER } from "@/config/insurance";
import { toast } from "sonner";
import {
  Loader2, Check, Users, Shield, Info, Lock,
  Coins, AlertTriangle, Calendar, ChevronRight
} from "lucide-react";

type Frequency = "Journalier" | "Hebdomadaire" | "Bimensuelle" | "Mensuelle" | "Trimestrielle";

interface Group {
  id: string;
  name: string;
  initials: string;
  contribution_amount: number;
  frequency: Frequency;
  members_count: number;
  max_members: number;
  penalty_rate: number;
  guarantee_deposit: number;
  min_score: number;
  status: "pending" | "active" | "completed" | "cancelled";
  total_rounds: number;
  order_type?: string;
}

const FREQ_LABEL: Record<string, string> = {
  Journalier: "jour",
  Hebdomadaire: "semaine",
  Bimensuelle: "quinzaine",
  Mensuelle: "mois",
  Trimestrielle: "trimestre",
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export default function Rejoindre() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [step, setStep] = useState<"info" | "guarantee" | "processing" | "done">("info");
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [guaranteeProof, setGuaranteeProof] = useState(DEMO_NSIA_POLICY_NUMBER);
const [commitmentAccepted, setCommitmentAccepted] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("groups").select("*").eq("id", id).single()
      .then(({ data }) => setGroup(data as Group));
  }, [id]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from("group_members")
      .select("id")
      .eq("group_id", id)
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setAlreadyMember(true); });
  }, [user, id]);

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--tc-green))] border-t-transparent animate-spin" />
      </div>
    );
  }

  const scoreOk = !profile || profile.score >= group.min_score;
  // Tous les groupes exigent maintenant un compte bancaire partenaire
  const hasGuarantee = true;
  const expectedPayout = group.contribution_amount * group.max_members;
  const isFull = group.members_count >= group.max_members;
  const isCompleted = group.status === "completed" || group.status === "cancelled";
  const orderLabel = group.order_type === "manual" ? "Ordre manuel" : "Ordre tiré au sort";

  const handleJoin = async () => {
    if (!user || !profile) {
      navigate(`/connexion?next=${encodeURIComponent(`/rejoindre/${group.id}`)}`);
      return;
    }

    // Re-fetch live members count to prevent race condition
    const { data: freshGroup } = await supabase
      .from("groups")
      .select("members_count, max_members, status")
      .eq("id", group.id)
      .single();

    if (freshGroup && freshGroup.members_count >= freshGroup.max_members) {
      toast.error("Ce groupe vient d'être complet. Essayez-en un autre.");
      navigate("/rechercher");
      return;
    }
    if (freshGroup && freshGroup.status !== "pending") {
      toast.error("Ce groupe n'est plus ouvert aux inscriptions.");
      navigate("/rechercher");
      return;
    }

    setStep("processing");

    try {
      // Save phone if changed
      if (phone && phone !== profile.phone) {
        await supabase.from("profiles").update({ phone }).eq("id", user.id);
      }

      if (hasGuarantee) {
        setStep("guarantee");
        return;
      }

      // Get current members count for turn_order
      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id);

      const nextTurn = (count ?? 0) + 1;

      const { error } = await supabase.from("group_members").insert({
        group_id: group.id,
        profile_id: user.id,
        role: "member",
        turn_order: nextTurn,
        status: "waiting",
        guarantee_status: "verified",
      });

      if (error?.code === "23505") {
        toast.error("Vous êtes déjà membre de ce groupe");
        navigate(`/groupe/${group.id}`);
        return;
      }
      if (error) throw error;

      await refreshProfile();
      setStep("done");
    } catch (err: unknown) {
      console.error("[Rejoindre] Full Error:", err);
      const maybeError = err as { message?: string; details?: string; hint?: string };
      const details = maybeError.details || maybeError.hint || "";
      toast.error((maybeError.message || "Erreur lors de l'adhésion") + (details ? ` (${details})` : ""));
      setStep("info");
    }
  };

  const handleGuaranteeSubmit = async () => {
    if (!user || !group) return;
    setStep("processing");

    try {
      if (!guaranteeProof.trim()) {
        toast.error("Veuillez fournir le numéro de police d'assurance vie.");
        setStep("guarantee");
        return;
      }
      if (!commitmentAccepted) {
        toast.error("Veuillez accepter la reconnaissance d'engagement tontinier.");
        setStep("guarantee");
        return;
      }

      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id);

      const nextTurn = (count ?? 0) + 1;

      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: group.id,
        profile_id: user.id,
        role: "member",
        turn_order: nextTurn,
        status: "waiting",
        guarantee_type: "life_insurance",
        guarantee_proof: guaranteeProof,
        guarantee_status: "pending",
      });

      if (joinError) throw joinError;

      await refreshProfile();
      setStep("done");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la soumission de la garantie");
      setStep("info");
    }
  };

  // ─── GUARANTEE STEP ──────────────────────────────────────────────────────────
  if (step === "guarantee") {
    return (
      <div className="animate-slide-up bg-background min-h-screen pb-8">
        <TopBar title="Garantie Bancaire" backTo={() => setStep("info")} />
        <div className="px-4">
          <div className="p-4 rounded-3xl border border-[hsla(38,92%,50%,0.18)] bg-gradient-to-br from-[hsla(38,92%,50%,0.06)] via-transparent to-[hsla(38,92%,50%,0.02)] mb-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[hsla(38,92%,50%,0.16)] flex items-center justify-center text-[hsl(var(--tc-amber))] text-lg">
                🔒
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Assurance vie obligatoire</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ce groupe exige une assurance vie. En cas de décès, l'assurance paie automatiquement les cotisations restantes, protégeant ainsi le reste du groupe.
                </p>
              </div>
            </div>
          </div>

          <div className="animate-fade-in mb-5">
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Numéro de police d'assurance vie
            </label>
            <input
              type="text"
              value={guaranteeProof}
              onChange={(e) => setGuaranteeProof(e.target.value)}
              placeholder={DEMO_NSIA_POLICY_NUMBER}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
            />
            <p className="text-[10px] text-[hsl(var(--tc-blue))] mt-3 leading-relaxed">
              ⚠️ Ce numéro est indispensable pour confirmer votre adhésion. La compagnie d'assurance valide la garantie et veille à ce que le cycle dure jusqu’à ce que tous aient reçu leur tour.
            </p>
          </div>

          <label className="mb-5 flex items-start gap-3 rounded-3xl border border-[hsla(160,84%,39%,0.18)] bg-[hsla(160,84%,39%,0.06)] p-3">
            <input
              type="checkbox"
              checked={commitmentAccepted}
              onChange={(e) => setCommitmentAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[hsl(var(--tc-green))]"
            />
            <span className="text-[10px] text-muted-foreground leading-relaxed">
              <strong className="block text-xs text-foreground mb-1">Je signe mon engagement</strong>
              Je reconnais devoir cotiser jusqu’à la fin du cycle, même après réception de ma cagnotte. En cas de retard, défaillance ou décès, les clauses de garantie/assurance du groupe s’appliquent.
            </span>
          </label>

          <button
            type="button"
            onClick={handleGuaranteeSubmit}
            disabled={!commitmentAccepted}
            className="w-full py-3.5 rounded-3xl text-sm font-bold text-white tc-gradient-green tc-shadow-green disabled:opacity-50"
          >
            Valider mon assurance vie
          </button>
        </div>
      </div>
    );
  }

  // ─── PROCESSING ──────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-5 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.1)] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[hsl(var(--tc-green))] animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Adhésion en cours...</p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasGuarantee ? "Enregistrement de l'assurance vie" : "Enregistrement dans le registre du groupe"}
          </p>
        </div>
      </div>
    );
  }

  // ─── SUCCESS ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex flex-col min-h-screen animate-fade-in">
        <div className="flex-1 px-4 pt-12 text-center">
          <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.12)] flex items-center justify-center mx-auto mb-4 animate-check-bounce">
            <Check className="w-10 h-10 text-[hsl(var(--tc-green))]" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold mb-2">Bienvenue dans "{group.name}" !</h2>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed px-4">
            ⏳ Votre numéro d'assurance vie est en cours d'examen. Vous recevrez une notification une fois validé.
          </p>

          <div className="bg-[hsla(160,84%,39%,0.08)] border border-[hsla(160,84%,39%,0.18)] rounded-3xl p-5 text-left mb-6 mx-2 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Prochaine étape
            </p>
            <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <p>① Votre assurance vie est enregistrée et passe en validation.</p>
              <p>② Quand le groupe est complet, les tours démarrent automatiquement.</p>
              <p>③ À chaque tour, vous cotisez le montant affiché, puis le bénéficiaire reçoit la cagnotte.</p>
              <p>④ En cas de retard, votre participation au cycle est suspendue jusqu'à régularisation.</p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/groupe/${group.id}`)}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green mb-3"
          >
            Voir le groupe →
          </button>
          <button onClick={() => navigate("/home")} className="text-xs text-muted-foreground">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ─── INFO (main view) ─────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up pb-8">
      <TopBar title="Rejoindre un groupe" backTo="/rechercher" backLabel="Explorer" />
      <div className="px-4">

        {alreadyMember && (
          <div className="bg-[hsla(160,84%,39%,0.08)] border border-[hsla(160,84%,39%,0.2)] rounded-xl p-3 mb-4 text-center">
            <p className="text-xs text-[hsl(var(--tc-green))] font-semibold">✓ Vous êtes déjà membre de ce groupe</p>
            <button
              onClick={() => navigate(`/groupe/${group.id}`)}
              className="text-xs text-[hsl(var(--tc-green))] underline mt-1"
            >
              Voir le groupe →
            </button>
          </div>
        )}

        {/* Header groupe */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl tc-gradient-green flex items-center justify-center mx-auto mb-3 tc-shadow-green">
            <span className="text-white text-xl font-bold">{group.initials}</span>
          </div>
          <h2 className="text-lg font-bold">{group.name}</h2>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Users className="w-3 h-3" />
            {group.members_count}/{group.max_members} membres · {group.frequency}
          </p>
        </div>

        {/* Stats financières */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Coins className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-green))]" />
            <p className="text-sm font-bold text-[hsl(var(--tc-green))]">
              {new Intl.NumberFormat("fr-FR").format(group.contribution_amount)}
            </p>
            <p className="text-[9px] text-muted-foreground">FCFA/{FREQ_LABEL[group.frequency] || "tour"}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-blue))]" />
            <p className="text-sm font-bold">{group.total_rounds}</p>
            <p className="text-[9px] text-muted-foreground">tours total</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Coins className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-amber))]" />
            <p className="text-sm font-bold text-[hsl(var(--tc-amber))]">
              {new Intl.NumberFormat("fr-FR").format(expectedPayout)}
            </p>
            <p className="text-[9px] text-muted-foreground">FCFA à recevoir</p>
          </div>
        </div>

        {/* Explication du fonctionnement */}
        <div className="p-3 rounded-xl bg-card border border-border mb-4">
          <p className="text-[10px] font-semibold mb-2 flex items-center gap-1">
            <Info className="w-3 h-3 text-[hsl(var(--tc-blue))]" />
            Comment fonctionne ce groupe
          </p>
          <div className="space-y-1 text-[10px] text-muted-foreground leading-relaxed">
            <p>• Chaque membre cotise <strong className="text-foreground">{formatFCFA(group.contribution_amount)}</strong> à chaque tour ({group.frequency})</p>
            <p>• Quand tous ont payé, le bénéficiaire du tour reçoit <strong className="text-foreground">{formatFCFA(expectedPayout)}</strong></p>
            <p>• Le cycle dure <strong className="text-foreground">{group.total_rounds} tours</strong> — chaque membre reçoit une fois</p>
            <p>• Ordre de distribution : <strong className="text-foreground">{orderLabel}</strong></p>
            {group.penalty_rate > 0 && (
              <p>• Pénalité de retard : <strong className="text-[hsl(var(--tc-amber))]">{group.penalty_rate}%</strong></p>
            )}
          </div>
        </div>

        {/* Garantie */}
        {hasGuarantee && (
          <div className="p-4 rounded-3xl border border-[hsla(38,92%,50%,0.18)] bg-[hsla(38,92%,50%,0.07)] mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[hsla(38,92%,50%,0.18)] flex items-center justify-center text-[hsl(var(--tc-amber))]">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Assurance Vie obligatoire</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  Ce groupe valide l'adhésion uniquement via un contrat d'assurance vie. En cas de décès, l'assurance prend le relais pour garantir les fonds des autres membres.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInsuranceModal(true)}
              className="mt-3 w-full py-2 rounded-xl border border-[hsla(38,92%,50%,0.3)] bg-[hsla(38,92%,50%,0.08)] text-[11px] font-medium text-[hsl(var(--tc-amber))] hover:bg-[hsla(38,92%,50%,0.12)] transition-colors flex items-center justify-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Voir les détails de l'assurance
            </button>
          </div>
        )}

        {/* Score check */}
        <div className={`p-3 rounded-xl border mb-5 ${
          scoreOk
            ? "bg-[hsla(160,84%,39%,0.06)] border-[hsla(160,84%,39%,0.15)]"
            : "bg-[hsla(0,84%,60%,0.06)] border-[hsla(0,84%,60%,0.15)]"
        }`}>
          <p className={`text-[11px] font-semibold mb-0.5 flex items-center gap-1 ${
            scoreOk ? "text-[hsl(var(--tc-green))]" : "text-[hsl(var(--tc-red))]"
          }`}>
            {scoreOk ? <Shield className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {scoreOk ? "Conditions remplies" : "Score insuffisant"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Score requis : {group.min_score} · Votre score : {profile?.score ?? "—"} {scoreOk ? "✓" : "✗"}
          </p>
          {!scoreOk && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Améliorez votre score en cotisant à l'heure dans vos groupes actuels.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleJoin}
          disabled={!scoreOk || isFull || alreadyMember || isCompleted}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white tc-gradient-green tc-shadow-green disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {alreadyMember ? "Déjà membre ✓" : isCompleted ? "Inscriptions closes" : isFull ? "Groupe complet" : <><Lock className="w-4 h-4" /> {`Rejoindre · Garantie requise`}</>}
        </button>
        {!alreadyMember && !isFull && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            🔒 Enregistrement sécurisé · TontineChain Protocol
          </p>
        )}
      </div>

      <InsuranceModal 
        open={showInsuranceModal} 
        onOpenChange={setShowInsuranceModal} 
      />
    </div>
  );
}