import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppCommandResult } from "../types.ts";
import { msgMemberJoined, MSG_JOIN_USAGE } from "../messages.ts";

async function findGroupByCode(supabase: SupabaseClient, code: string) {
  const upper = code.toUpperCase();
  const { data: byInvite } = await supabase
    .from("groups")
    .select("id, name, status, max_members, members_count, contribution_amount")
    .eq("invite_code", upper)
    .maybeSingle();
  if (byInvite) return byInvite;

  const { data: inv } = await supabase
    .from("group_invitations")
    .select("group_id, expires_at, groups(id, name, status, max_members, members_count, contribution_amount)")
    .eq("token", code)
    .maybeSingle();

  if (!inv) return null;
  if (new Date(inv.expires_at) < new Date()) return null;
  return inv.groups as {
    id: string;
    name: string;
    status: string;
    max_members: number;
    members_count: number;
    contribution_amount: number;
  };
}

async function tryActivateGroup(supabase: SupabaseClient, groupId: string): Promise<void> {
  const { data: g } = await supabase
    .from("groups")
    .select("members_count, max_members, status")
    .eq("id", groupId)
    .single();
  if (!g || g.status !== "pending" || g.members_count < g.max_members) return;
  await supabase.rpc("rpc_activate_group", { p_group_id: groupId });
}

export async function handleJoin(
  supabase: SupabaseClient,
  profileId: string,
  args: string[],
): Promise<WhatsAppCommandResult> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups(name, status)")
    .eq("profile_id", profileId);

  const active = memberships?.find((row) => {
    const g = row.groups as { status: string };
    return g.status === "active";
  });

  if (active) {
    const g = active.groups as { name: string };
    return {
      success: true,
      reply: `⚠️ Vous êtes déjà dans une tontine (*${g.name}*).\nTapez *TONTINE* pour le statut.`,
    };
  }

  const code = args[0]?.toUpperCase();
  if (!code) return { success: false, reply: MSG_JOIN_USAGE };

  const group = await findGroupByCode(supabase, code);
  if (!group) return { success: false, reply: `❌ Code *${code}* introuvable ou expiré.` };
  if (group.status !== "pending") {
    return { success: false, reply: "❌ Cette tontine est déjà lancée ou terminée." };
  }
  if (group.members_count >= group.max_members) {
    return { success: false, reply: "❌ Cette tontine est complète." };
  }

  const { data: already } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (already) return { success: false, reply: "⚠️ Vous êtes déjà membre de cette tontine." };

  const { count } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id);

  const turnOrder = (count ?? 0) + 1;

  const { error } = await supabase.from("group_members").insert({
    group_id: group.id,
    profile_id: profileId,
    role: "member",
    turn_order: turnOrder,
    status: "waiting",
    guarantee_status: "pending",
  });

  if (error) {
    return { success: false, reply: `❌ Erreur inscription : ${error.message}` };
  }

  const { data: refreshed } = await supabase
    .from("groups")
    .select("members_count, max_members, name")
    .eq("id", group.id)
    .single();

  const current = refreshed?.members_count ?? group.members_count + 1;
  const max = refreshed?.max_members ?? group.max_members;
  const name = refreshed?.name ?? group.name;

  if (current >= max) {
    await tryActivateGroup(supabase, group.id);
  }

  return { success: true, reply: msgMemberJoined(name, current, max) };
}
