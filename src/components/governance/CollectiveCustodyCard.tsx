import { useCallback, useEffect, useState } from "react";
import { Shield, CheckCircle2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  approvePayoutAsGuardian,
  describeCollectiveCustody,
  fetchPayoutGovernance,
  guardianRoleLabel,
  type GuardianRole,
  type PayoutGovernanceState,
} from "@/lib/groupGovernance";

interface Props {
  groupId: string;
  roundNumber: number;
  profileId?: string;
  threshold: number;
  quorum: number;
  payoutSigned: boolean;
  onApproved?: () => void;
}

export default function CollectiveCustodyCard({
  groupId,
  roundNumber,
  profileId,
  threshold,
  quorum,
  payoutSigned,
  onApproved,
}: Props) {
  const [gov, setGov] = useState<PayoutGovernanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const state = await fetchPayoutGovernance(groupId, roundNumber, profileId, threshold, quorum);
      setGov(state);
    } finally {
      setLoading(false);
    }
  }, [groupId, roundNumber, profileId, threshold, quorum]);

  useEffect(() => {
    void refresh();
  }, [refresh, payoutSigned]);

  const handleApprove = async () => {
    if (!gov?.payoutRequestId) {
      toast.error("Le bénéficiaire doit d'abord signer l'engagement.");
      return;
    }
    setApproving(true);
    try {
      const res = await approvePayoutAsGuardian(gov.payoutRequestId);
      if (res.fully_approved) {
        toast.success(`Garde collective validée (${res.approval_count}/${res.threshold}) — versement autorisé`);
      } else if (res.already_approved) {
        toast.info("Vous avez déjà validé cette demande.");
      } else {
        toast.success(`Validation enregistrée (${res.approval_count}/${res.threshold})`);
      }
      await refresh();
      onApproved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation impossible");
    } finally {
      setApproving(false);
    }
  };

  const approvalCount = gov?.approvalCount ?? 0;
  const pct = Math.min(100, (approvalCount / threshold) * 100);
  const fullyApproved = gov?.status === "approved" || approvalCount >= threshold;

  return (
    <div className="rounded-xl border border-[hsla(204,90%,50%,0.2)] bg-[hsla(204,90%,50%,0.06)] p-3 mt-2">
      <div className="flex items-start gap-2 mb-2">
        <Shield className="w-4 h-4 text-[hsl(var(--tc-blue))] shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--tc-blue))]">
            Garde collective · {threshold}/{quorum}
          </p>
          <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">
            {describeCollectiveCustody(threshold, quorum)}
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full bg-[hsl(var(--tc-blue))] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] font-medium mb-2">
        {fullyApproved ? (
          <span className="text-[hsl(var(--tc-green))] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Validations suffisantes — versement en cours
          </span>
        ) : (
          <>
            Validations : <strong>{approvalCount}</strong> / {threshold} requises
            {!payoutSigned && (
              <span className="text-muted-foreground"> · en attente signature bénéficiaire</span>
            )}
          </>
        )}
      </p>

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {gov && gov.guardians.length > 0 && (
            <ul className="space-y-1 mb-2">
              {gov.guardians.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <Users className="w-3 h-3 shrink-0" />
                  <span className="font-medium text-foreground/80">{g.profiles?.name ?? "Membre"}</span>
                  <span>· {guardianRoleLabel(g.role_label as GuardianRole)}</span>
                  {g.profile_id === profileId && <span className="text-[hsl(var(--tc-green))]">(vous)</span>}
                </li>
              ))}
            </ul>
          )}

          {gov?.amGuardian && !fullyApproved && payoutSigned && gov.payoutRequestId && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving || gov.myApproved}
              className="w-full py-2 rounded-lg text-xs font-bold text-white bg-[hsl(var(--tc-blue))] disabled:opacity-50"
            >
              {gov.myApproved ? "✓ Vous avez validé" : approving ? "Validation…" : `Valider le décaissement (${threshold}/${quorum})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
