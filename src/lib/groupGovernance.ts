import { supabase } from "@/lib/supabase";

export type GuardianRole = "admin" | "senior" | "peer" | "witness" | "escrow";

export interface GroupGuardian {
  id: string;
  profile_id: string;
  role_label: GuardianRole;
  turn_order: number | null;
  profiles?: { name: string; initials: string } | null;
}

export interface PayoutGovernanceState {
  payoutRequestId: string | null;
  roundNumber: number;
  approvalCount: number;
  threshold: number;
  quorum: number;
  status: string | null;
  myApproved: boolean;
  amGuardian: boolean;
  guardians: GroupGuardian[];
}

const ROLE_LABELS: Record<GuardianRole, string> = {
  admin: "Administrateur",
  senior: "Membre senior",
  peer: "Pair élu",
  witness: "Témoin",
  escrow: "Gardien de secours",
};

export function guardianRoleLabel(role: GuardianRole): string {
  return ROLE_LABELS[role] ?? "Gardien";
}

export function describeCollectiveCustody(threshold = 3, quorum = 5): string {
  return [
    `Garde collective ${threshold}/${quorum} (inspirée Bitsacco) :`,
    "la cagnotte ne sort qu'après validation de plusieurs gardiens élus parmi les membres —",
    "pas un seul trésorier. Prochaine étape : multisig Bitcoin on-chain / Fedimint.",
  ].join(" ");
}

export async function fetchGroupGuardians(groupId: string): Promise<GroupGuardian[]> {
  const { data, error } = await supabase
    .from("group_guardians")
    .select("id, profile_id, role_label, turn_order, profiles(name, initials)")
    .eq("group_id", groupId)
    .order("turn_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.warn("[groupGovernance] guardians:", error.message);
    return [];
  }
  return (data ?? []) as GroupGuardian[];
}

export async function fetchPayoutGovernance(
  groupId: string,
  roundNumber: number,
  profileId?: string,
  threshold = 3,
  quorum = 5,
): Promise<PayoutGovernanceState> {
  const guardians = await fetchGroupGuardians(groupId);

  const { data: prRows } = await supabase
    .from("payout_requests")
    .select("id, status, approval_count, round_number")
    .eq("group_id", groupId)
    .eq("round_number", roundNumber)
    .in("status", ["pending_approvals", "pending_approval", "approved", "pending_signature"])
    .order("created_at", { ascending: false })
    .limit(1);

  const pr = prRows?.[0] ?? null;
  let myApproved = false;

  if (pr && profileId) {
    const { data: appr } = await supabase
      .from("payout_guardian_approvals")
      .select("id")
      .eq("payout_request_id", pr.id)
      .eq("guardian_id", profileId)
      .maybeSingle();
    myApproved = !!appr;
  }

  const amGuardian = profileId ? guardians.some((g) => g.profile_id === profileId) : false;

  return {
    payoutRequestId: pr?.id ?? null,
    roundNumber,
    approvalCount: pr?.approval_count ?? 0,
    threshold,
    quorum,
    status: pr?.status ?? null,
    myApproved,
    amGuardian,
    guardians,
  };
}

export async function approvePayoutAsGuardian(payoutRequestId: string) {
  const { data, error } = await supabase.rpc("rpc_guardian_approve_payout", {
    p_payout_request_id: payoutRequestId,
  });
  if (error) throw new Error(error.message);
  return data as {
    ok: boolean;
    approval_count: number;
    threshold: number;
    fully_approved?: boolean;
    already_approved?: boolean;
  };
}

export async function assignGroupGuardians(groupId: string) {
  const { data, error } = await supabase.rpc("fn_assign_group_guardians", {
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  return data;
}
