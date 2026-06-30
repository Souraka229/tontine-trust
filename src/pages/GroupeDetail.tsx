import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import TCAvatar from "@/components/ui/tc-avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import { Settings, Users, Clock, TrendingUp, Shield, Database, Cpu, Link2, CheckCircle2, CircleDashed, AlertCircle, Banknote } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { runTontineAutomation } from "@/lib/tontineAutomation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex";
import { toast } from "sonner";
import {
  generateCommitmentText,
  hashCommitment,
  signCommitment,
} from "@/lib/bitcoinProof";
import { fetchGroupCommitments, recordBitcoinCommitment, type CommitmentRecord } from "@/lib/bitcoinRepository";
import { generateInviteCode } from "../../supabase/functions/_shared/whatsapp/utils";

interface Group {
  id: string;
  name: string;
  initials: string;
  color: string;
  contribution_amount: number;
  frequency: "Journalier" | "Hebdomadaire" | "Bimensuelle" | "Mensuelle" | "Trimestrielle";
  current_round: number;
  total_rounds: number;
  total_pool: number;
  guarantee_deposit: number;
  status: "pending" | "active" | "completed" | "cancelled";
  next_payout_date: string | null;
  cotisation_deadline_at: string | null;
  max_members: number;
  members_count: number;
  penalty_rate: number;
  order_type?: string;
  created_by: string | null;
  invite_code?: string | null;
}

interface Member {
  id: string;
  profile_id: string;
  turn_order: number;
  status: "waiting" | "paid" | "late" | "covered" | "excluded" | "deceased";
  paid_date: string | null;
  role: "admin" | "member";
  guarantee_status: "pending" | "verified" | "rejected";
  profiles: { name: string; initials: string } | null;
}

const NETWORK_FEE = 20;

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.abs(n)) + " FCFA";
}

function deadlineLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const ms = d.getTime() - now;
  if (ms <= 0) return "Échéance dépassée · prélèvement auto si solde suffisant";
  const days = Math.ceil(ms / 86400000);
  const hours = Math.ceil(ms / 3600000);
  if (days > 1) return `${days} j. restants`;
  if (hours > 1) return `${hours} h restantes`;
  return "Moins d’1 h";
}

export default function GroupeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null | undefined>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const convexDetail = useQuery(
    api.tontines.getGroupDetail,
    isConvexConfigured && id && !id.includes("-") ? { groupId: id } : "skip"
  );
  const activateGroupMutation = useMutation(api.tontines.activateGroup);
  const [activating, setActivating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [commitments, setCommitments] = useState<CommitmentRecord[]>([]);

  const handleGenerateInviteLink = async () => {
    if (!id || !group) return;
    try {
      let code = group.invite_code;
      if (!code) {
        code = generateInviteCode();
        await supabase.from("groups").update({ invite_code: code }).eq("id", id);
      }
      const token = Math.random().toString(36).substring(2, 15);
      await supabase.from("group_invitations").insert({
        group_id: id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const link = `${window.location.origin}/rejoindre/${id}?token=${token}`;
      const waHint = code ? `\nWhatsApp : REJOINDRE ${code}` : "";
      await navigator.clipboard.writeText(link + waHint);
      toast.success(code ? `Lien copié ! Code WhatsApp : ${code}` : "Lien d'invitation copié !");
    } catch (err) {
      toast.error("Erreur lors de la génération du lien");
    }
  };

  const handleSignDocument = async () => {
    setIsSigning(true);
    try {
      const beneficiary = members.find(m => m.profile_id === beneficiaryId);
      if (!beneficiary) throw new Error("Bénéficiaire introuvable");
      const text = generateCommitmentText(id || "", beneficiary.profiles?.name || "", group?.contribution_amount! * group?.members_count!);
      const hash = hashCommitment(text);
      const { signature, pubkeyHint } = await signCommitment(hash);
      
      await supabase.from("payout_requests").insert({
        group_id: id,
        member_id: beneficiary.profile_id,
        document_hash: hash,
        signature: signature,
        status: "pending_approval"
      });

      await recordBitcoinCommitment({
        group_id: id,
        profile_id: user?.id ?? beneficiary.profile_id,
        commitment_text: text,
        document_hash: hash,
        signature,
        pubkey_hint: pubkeyHint,
        amount_fcfa: group?.contribution_amount! * group?.members_count!,
      });
      
      setHasSigned(true);
      const latest = await fetchGroupCommitments(id || "");
      setCommitments(latest);
      toast.success("Engagement signé · preuve Bitcoin (secp256k1)");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la signature.");
    } finally {
      setIsSigning(false);
    }
  };

  const handleApprovePayout = async () => {
    if (!id || !isAdmin) return;
    try {
      const { error: approveErr } = await supabase
        .from("payout_requests")
        .update({ status: "approved", creator_approved: true })
        .eq("group_id", id)
        .in("status", ["pending_approval", "pending_signature"]);

      if (approveErr) throw approveErr;

      await runTontineAutomation();
      toast.success("Versement approuvé — automation lancée");
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Approbation impossible");
    }
  };

  const handleDeclareDeceased = async (memberId: string) => {
    if (!confirm("Voulez-vous vraiment déclarer ce membre décédé ? L'assurance vie prendra le relais.")) return;
    await supabase.from("group_members").update({ status: "deceased" }).eq("id", memberId);
    toast.success("Membre déclaré décédé. L'assurance vie est activée.");
    fetchData();
  };

  const handleActivate = async () => {
    if (!id || activating) return;
    setActivating(true);
    try {
      if (isConvexConfigured && id && !id.includes("-")) {
        await activateGroupMutation({ groupId: id as never });
        toast.success("Tontine activée. Le premier tour commence.");
        return;
      }

      const { error } = await supabase.rpc("rpc_activate_group", { p_group_id: id });
      if (error) throw error;
      toast.success("Tontine activée. Le premier tour commence.");
      await fetchData();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Activation impossible"
      );
    } finally {
      setActivating(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isConvexConfigured && !id.includes("-")) return;
    // Automation en arrière-plan
    runTontineAutomation().catch(() => {});
    try {
      const [{ data: gRow }, { data: mRows }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", id).single(),
        supabase.from("group_members").select("*, profiles(name, initials)").eq("group_id", id).order("turn_order"),
      ]);
      if (gRow) {
        setGroup(gRow as Group);
      } else {
        setGroup(undefined); // Marquer comme "non trouvé"
      }
      const m = (mRows as Member[]) || [];
      setMembers(m);
      if (user) {
        const me = m.find((x) => x.profile_id === user.id);
        setIsMember(!!me);
        setIsAdmin(me?.role === "admin");
      }
      if (id) {
        const proofs = await fetchGroupCommitments(id);
        setCommitments(proofs);
      }
    } catch (err) {
      console.error("[GroupeDetail] Fetch error:", err);
      setGroup(undefined);
    }
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!convexDetail) return;
    setGroup({
      id: convexDetail.group.id,
      name: convexDetail.group.name,
      initials: convexDetail.group.initials,
      color: convexDetail.group.color,
      contribution_amount: convexDetail.group.contributionAmount,
      frequency: convexDetail.group.frequency as Group["frequency"],
      current_round: convexDetail.group.currentRound,
      total_rounds: convexDetail.group.totalRounds,
      total_pool: convexDetail.group.totalPool,
      guarantee_deposit: 0,
      status: convexDetail.group.status as Group["status"],
      next_payout_date: convexDetail.group.nextPayoutAt ? new Date(convexDetail.group.nextPayoutAt).toISOString() : null,
      cotisation_deadline_at: convexDetail.group.contributionDeadlineAt ? new Date(convexDetail.group.contributionDeadlineAt).toISOString() : null,
      max_members: convexDetail.group.maxMembers,
      members_count: convexDetail.group.membersCount,
      penalty_rate: convexDetail.group.penaltyRate,
      order_type: "random",
      created_by: null,
    });
    setMembers(convexDetail.members.map((member) => ({
      id: member.id,
      profile_id: member.userId,
      turn_order: member.turnOrder,
      status: member.status as Member["status"],
      paid_date: null,
      role: member.role as Member["role"],
      guarantee_status: member.coverageStatus as Member["guarantee_status"],
      profiles: { name: member.name, initials: member.initials },
    })));
    setIsMember(convexDetail.isMember);
    setIsAdmin(convexDetail.isAdmin);
  }, [convexDetail]);

  if (group === undefined) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-2xl">🔍</div>
        <h2 className="text-lg font-bold mb-1">Groupe non trouvé</h2>
        <p className="text-sm text-muted-foreground mb-6">Ce groupe n'existe pas ou vous n'y avez pas accès.</p>
        <button onClick={() => navigate("/home")} className="w-full py-3 rounded-xl font-bold text-white tc-gradient-green">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--tc-green))] border-t-transparent animate-spin" />
      </div>
    );
  }

  const progress = group.total_rounds > 0 ? (group.current_round / group.total_rounds) * 100 : 0;
  const daysUntilPayout = group.next_payout_date
    ? Math.max(0, Math.ceil((new Date(group.next_payout_date).getTime() - Date.now()) / 86400000))
    : "—";

  const sorted = [...members].sort((a, b) => (a.turn_order || 0) - (b.turn_order || 0));
  const beneficiaryId =
    group.current_round > 0 ? sorted.find((m) => m.turn_order === group.current_round)?.profile_id : null;
  const paidCount = sorted.filter((m) => m.status === "paid").length;
  const totalDue = sorted.filter((m) => m.status !== "excluded").length;
  const isCompleted = group.status === "completed" || group.current_round > group.total_rounds;
  const orderMode = group.order_type === "manual" ? "Manuel" : "Aléatoire";
  const latestProof = convexDetail?.proofs?.[0];

  return (
    <div className="animate-fade-in pb-6">
      <TopBar
        title={group.name}
        backTo="/home"
        backLabel="Accueil"
        rightElement={
          isAdmin ? (
            <button type="button" onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-[hsl(var(--tc-green))] transition-colors" aria-label="Administration">
              <Settings className="w-4 h-4" />
            </button>
          ) : undefined
        }
      />

      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-card border border-border/80 rounded-xl p-2.5 text-center shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-green))]" />
            <p className="text-sm font-bold text-[hsl(var(--tc-green))]">{formatFCFA(group.total_pool).replace(" FCFA", "")}</p>
            <p className="text-[9px] text-muted-foreground">Cagnotte</p>
          </div>
          <div className="bg-card border border-border/80 rounded-xl p-2.5 text-center shadow-sm">
            <Users className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-blue))]" />
            <p className="text-sm font-bold">
              {paidCount}/{totalDue}
            </p>
            <p className="text-[9px] text-muted-foreground">Payé ce tour</p>
          </div>
          <div className="bg-card border border-border/80 rounded-xl p-2.5 text-center shadow-sm">
            <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-[hsl(var(--tc-amber))]" />
            <p className="text-sm font-bold text-muted-foreground">{typeof daysUntilPayout === "number" ? `${daysUntilPayout}j` : daysUntilPayout}</p>
            <p className="text-[9px] text-muted-foreground">Échéance</p>
          </div>
        </div>
        <ProgressBar value={progress} color={group.color || "green"} />
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          {formatFCFA(group.contribution_amount)} + {NETWORK_FEE} FCFA frais · {group.frequency.toLowerCase()}
          {group.penalty_rate > 0 && ` · pénalité ${group.penalty_rate}%`}
        </p>
        {group.total_rounds > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            🏆 Cagnotte à chaque tour : <strong className="text-[hsl(var(--tc-green))]">{formatFCFA(group.contribution_amount * group.members_count)}</strong> ({group.members_count} membres × cotisation)
          </p>
        )}
        <div className="mt-3 rounded-2xl border border-border/80 bg-[hsla(160,84%,39%,0.06)] p-3 text-[10px] text-muted-foreground">
          <p className="font-semibold text-[hsl(var(--tc-foreground))] mb-1">Statut du cycle</p>
          <p>{isCompleted ? "Cycle terminé — toutes les distributions ont été versées." : `Ordre de distribution : ${orderMode}.`}</p>
        </div>
      </div>

      {/* Preuves Bitcoin */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-violet-50/50 dark:from-[hsla(220,18%,14%,0.92)] dark:to-[hsla(220,16%,11%,0.95)] p-3.5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-foreground/90 tracking-tight">Preuves Bitcoin</h3>
                <p className="text-[9px] text-muted-foreground">Engagements secp256k1 · registre consultable</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[8px] font-medium text-amber-800 flex items-center gap-1 border border-amber-200/50">
              <Cpu className="w-2.5 h-2.5" /> BTC
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <p className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">Dernière preuve</p>
              <p className="text-[10px] font-mono-tech truncate text-amber-900/80 dark:text-amber-200/80">
                {commitments[0]?.document_hash?.slice(0, 22) ?? latestProof?.payloadHash?.slice(0, 22) ?? (group.id || "").slice(0, 18) + "..."}
              </p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">Preuves enregistrées</p>
              <p className="text-[10px] font-medium flex items-center gap-1 text-foreground/85">
                <Database className="w-3 h-3 text-[hsl(var(--tc-blue))] opacity-70" />
                {commitments.length > 0 ? `${commitments.length} engagement(s)` : group.status === "active" ? "Actif · en attente" : group.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste de ramassage */}
      <div className="px-4 pb-3">
        <div className="flex items-end justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-semibold text-foreground/90">Liste de ramassage</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tour {Math.max(group.current_round, 1)} / {group.total_rounds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">Fin cotisation</p>
            <p className="text-[10px] font-medium text-foreground/85">{deadlineLabel(group.cotisation_deadline_at)}</p>
          </div>
        </div>

        {/* BANNÈRE DE VERSEMENT DE LA CAGNOTTE */}
        {group.status === "active" && group.current_round > 0 && beneficiaryId && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-[hsl(var(--tc-green))] to-[hsl(160,84%,25%)] p-[1px] shadow-sm animate-pulse-slow">
            <div className="bg-card dark:bg-[hsl(160,20%,12%)] rounded-[11px] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[hsla(160,84%,39%,0.15)] flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 text-[hsl(var(--tc-green))]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--tc-green))] mb-0.5">
                    Versement de la cagnotte
                  </p>
                  <p className="text-xs font-medium text-foreground/90">
                    C'est le tour de <strong className="text-foreground text-sm">{sorted.find((m) => m.profile_id === beneficiaryId)?.profiles?.name || "—"}</strong>
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between border border-border/50">
                <p className="text-[10px] text-muted-foreground">Montant à recevoir :</p>
                <p className="text-sm font-bold text-foreground">
                  {formatFCFA(group.contribution_amount * group.members_count)}
                </p>
              </div>
              
              {user?.id === beneficiaryId && (
                 <div className="mt-2">
                    <button 
                      onClick={handleSignDocument}
                      disabled={isSigning || hasSigned}
                      className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-[hsl(var(--tc-green))] disabled:opacity-50"
                    >
                      {hasSigned ? "✓ Document signé" : isSigning ? "Signature…" : "Signer engagement (Bitcoin)"}
                    </button>
                 </div>
              )}
              
              {isAdmin && user?.id !== beneficiaryId && (
                <div className="mt-2">
                    <button 
                      onClick={handleApprovePayout}
                      className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-[hsl(var(--tc-blue))] hover:bg-opacity-90"
                    >
                      Approuver le versement
                    </button>
                </div>
              )}
              
              <p className="text-[9px] text-muted-foreground text-center mt-1">
                La somme sera versée une fois la reconnaissance de dette signée et approuvée.
              </p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed rounded-3xl bg-[hsla(160,84%,39%,0.06)] px-3 py-3 border border-[hsla(160,84%,39%,0.15)]">
          <Shield className="w-3 h-3 inline-block mr-1 align-text-bottom text-[hsl(var(--tc-green))] opacity-80" />
          Assurance vie partenaire obligatoire pour tous les membres. En cas de décès, l'assurance prend le relais et garantit la pérennité de la tontine.
        </p>

        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Aucun membre pour l’instant</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((m) => {
              const isMe = m.profile_id === user?.id;
              const order = m.turn_order || 0;
              const isBeneficiary = group.current_round > 0 && order === group.current_round;
              const alreadyReceived = group.current_round > 0 && order < group.current_round;
              const isWaitingGuarantee = m.guarantee_status === "pending" && group.guarantee_deposit > 0;

              let phaseLabel = "Tour à venir";
              if (alreadyReceived) phaseLabel = "A déjà ramassé";
              if (isBeneficiary) phaseLabel = "Bénéficiaire de ce tour";

              const PayIcon = m.status === "paid" ? CheckCircle2 : m.status === "late" ? AlertCircle : CircleDashed;

              return (
                <li
                  key={m.id}
                  className={`rounded-xl border px-3 py-2.5 flex gap-3 items-center transition-colors ${
                    isBeneficiary
                      ? "border-[hsla(160,30%,40%,0.25)] bg-[hsla(160,22%,96%,0.65)] dark:bg-[hsla(160,15%,16%,0.35)]"
                      : "border-border/70 bg-card/80"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isBeneficiary
                        ? "bg-[hsla(160,35%,42%,0.2)] text-[hsl(160,32%,30%)] dark:text-[hsl(160,25%,78%)]"
                        : alreadyReceived
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/80 text-foreground/70"
                    }`}
                  >
                    {order}
                  </div>
                  <TCAvatar initials={m.profiles?.initials || "?"} color="green" size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold truncate">
                        {m.profiles?.name || "Membre"}
                        {isMe && <span className="text-[hsl(var(--tc-green))] font-normal text-[10px] ml-1">(vous)</span>}
                        {m.role === "admin" && <span className="text-[10px] ml-0.5 opacity-70">· admin</span>}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{phaseLabel}</p>
                    {m.status === "paid" && m.paid_date && (
                      <p className="text-[9px] text-muted-foreground/90 mt-0.5">
                        Payé le {new Date(m.paid_date).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        m.status === "paid"
                          ? "bg-[hsla(160,32%,42%,0.12)] text-[hsl(160,30%,30%)] dark:text-[hsl(160,22%,72%)]"
                          : m.status === "late"
                            ? "bg-[hsla(25,40%,94%,0.9)] text-[hsl(25,35%,38%)] dark:bg-[hsla(25,25%,22%,0.5)]"
                            : m.status === "deceased"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-muted/90 text-muted-foreground"
                      }`}
                    >
                      <PayIcon className="w-3 h-3" />
                      {m.status === "paid" ? "Payé" : m.status === "late" ? "Retard" : m.status === "deceased" ? "Décédé (Couvert)" : "À payer"}
                    </span>
                    {isWaitingGuarantee && (
                      <span className="text-[8px] text-[hsl(var(--tc-amber))]">Attente Assurance</span>
                    )}
                    {isAdmin && m.status !== "deceased" && (
                      <button onClick={() => handleDeclareDeceased(m.id)} className="text-[8px] text-purple-600 hover:underline mt-1">
                        Déclarer Décès
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {sorted.some((m) => group.current_round > 0 && (m.turn_order || 0) > group.current_round) && (
          <p className="text-[9px] text-muted-foreground mt-2 text-center opacity-80">
            Les membres « tour à venir » cotiseront aux prochains cycles.
          </p>
        )}
      </div>

      <div className="px-4 pb-3">
        <div className="p-4 rounded-3xl border border-[hsla(38,92%,50%,0.14)] bg-[hsla(38,92%,50%,0.07)] shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-semibold text-foreground/90">Assurance Vie Obligatoire</p>
              <p className="text-[10px] text-muted-foreground">Couverture communautaire activée</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[hsla(204,90%,50%,0.16)] px-2.5 py-1 text-[10px] font-semibold text-[hsl(var(--tc-blue))]">
              Vérifiée par l’admin
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            En cas de décès d'un membre, la compagnie d'assurance prend immédiatement le relais et paie les cotisations restantes. La tontine communautaire est ainsi protégée contre tout défaut.
          </p>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {isAdmin && group.status === "pending" && (
          <div className="rounded-xl border border-[hsla(160,84%,39%,0.25)] bg-[hsla(160,84%,39%,0.06)] p-3">
            <p className="text-[11px] font-semibold mb-1">
              {group.members_count >= group.max_members
                ? "Le groupe est complet. Activez la tontine pour démarrer le premier tour."
                : `En attente de ${group.max_members - group.members_count} membre(s) avant activation.`}
            </p>
            <button
              type="button"
              onClick={handleActivate}
              disabled={
                activating ||
                group.members_count < group.max_members
              }
              className="w-full py-3 rounded-xl text-sm font-bold text-white tc-gradient-green tc-shadow-green disabled:opacity-50"
            >
              {activating ? "Activation..." : "Activer la tontine"}
            </button>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              L'activation fige les règles et enregistre les preuves Bitcoin du cycle. Tous les membres devront avoir signé leur engagement.
            </p>
          </div>
        )}
        
        {isAdmin && group.status === "pending" && (
           <button
             type="button"
             onClick={handleGenerateInviteLink}
             className="w-full mt-2 py-3.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-card"
           >
             Générer un lien d'invitation privé
           </button>
        )}

        {isMember ? (
          <button
            type="button"
            onClick={() => navigate("/cotiser")}
            disabled={group.status !== "active"}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white tc-gradient-green-soft tc-shadow-green-soft disabled:opacity-50"
          >
            {group.status === "active" ? "Cotiser pour ce groupe →" : "En attente d'activation"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/rejoindre/${group.id}`)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white tc-gradient-green-soft tc-shadow-green-soft"
          >
            Rejoindre ce groupe →
          </button>
        )}
      </div>
    </div>
  );
}
