import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePayload, WhatsAppCommandResult } from "./types.ts";
import {
  FREQ_LABELS,
  generateInviteCode,
  groupInitials,
  isConfirmCommand,
  parseFrequency,
  randomGroupColor,
} from "../utils.ts";
import {
  MSG_CREATE_AMOUNT,
  MSG_CREATE_FREQ,
  MSG_CREATE_MEMBERS,
  MSG_CREATE_NAME,
  msgCreateConfirm,
  msgGroupCreated,
} from "../messages.ts";
import { clearSession, setSession } from "../sessions.ts";

export async function startCreate(
  supabase: SupabaseClient,
  phone: string,
  profileId: string,
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

  await setSession(supabase, phone, profileId, "create", "await_name", {});
  return { success: true, reply: MSG_CREATE_NAME };
}

export async function handleCreateStep(
  supabase: SupabaseClient,
  phone: string,
  profileId: string,
  step: string,
  rawText: string,
  cmd: string,
  payload: CreatePayload,
): Promise<WhatsAppCommandResult> {
  if (step === "await_name") {
    const name = rawText.trim();
    if (name.length < 2 || name.length > 30) {
      return { success: false, reply: "⚠️ Le nom doit faire entre 2 et 30 caractères." };
    }
    await setSession(supabase, phone, profileId, "create", "await_amount", { ...payload, name });
    return { success: true, reply: MSG_CREATE_AMOUNT };
  }

  if (step === "await_amount") {
    const amount = parseInt(rawText.replace(/\s/g, ""), 10);
    if (!Number.isFinite(amount) || amount < 1000) {
      return { success: false, reply: "⚠️ Montant invalide. Minimum 1 000 FCFA.\nEx: 50000" };
    }
    await setSession(supabase, phone, profileId, "create", "await_members", { ...payload, amount });
    return { success: true, reply: MSG_CREATE_MEMBERS };
  }

  if (step === "await_members") {
    const maxMembers = parseInt(rawText.replace(/\s/g, ""), 10);
    if (!Number.isFinite(maxMembers) || maxMembers < 2 || maxMembers > 50) {
      return { success: false, reply: "⚠️ Nombre invalide. Entre 2 et 50 membres." };
    }
    await setSession(supabase, phone, profileId, "create", "await_frequency", { ...payload, maxMembers });
    return { success: true, reply: MSG_CREATE_FREQ };
  }

  if (step === "await_frequency") {
    const frequency = parseFrequency(cmd || rawText);
    if (!frequency) {
      return { success: false, reply: "⚠️ Répondez : JOURNALIER, HEBDOMADAIRE, BIMENSUELLE, MENSUELLE ou TRIMESTRIELLE." };
    }
    const next = { ...payload, frequency };
    await setSession(supabase, phone, profileId, "create", "await_confirm", next);
    return {
      success: true,
      reply: msgCreateConfirm(
        next.name!,
        next.amount!,
        next.maxMembers!,
        FREQ_LABELS[frequency],
      ),
    };
  }

  if (step === "await_confirm") {
    if (!isConfirmCommand(cmd)) {
      return { success: false, reply: "Tapez *OUI* pour confirmer ou *ANNULER*." };
    }
    return finalizeCreate(supabase, phone, profileId, payload);
  }

  await clearSession(supabase, phone);
  return { success: false, reply: "❌ Étape inconnue. Tapez *CREER* pour recommencer." };
}

async function finalizeCreate(
  supabase: SupabaseClient,
  phone: string,
  profileId: string,
  payload: CreatePayload,
): Promise<WhatsAppCommandResult> {
  const { name, amount, maxMembers, frequency } = payload;
  if (!name || !amount || !maxMembers || !frequency) {
    await clearSession(supabase, phone);
    return { success: false, reply: "❌ Données incomplètes. Tapez *CREER* pour recommencer." };
  }

  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase.from("groups").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      initials: groupInitials(name),
      color: randomGroupColor(),
      contribution_amount: amount,
      frequency,
      max_members: maxMembers,
      total_rounds: maxMembers,
      penalty_rate: 5,
      guarantee_deposit: 0,
      order_type: "random",
      min_score: 0,
      status: "pending",
      created_by: profileId,
      invite_code: inviteCode,
    })
    .select("id")
    .single();

  if (error || !group) {
    await clearSession(supabase, phone);
    return { success: false, reply: `❌ Erreur création : ${error?.message ?? "inconnue"}` };
  }

  const { error: memberErr } = await supabase.from("group_members").insert({
    group_id: group.id,
    profile_id: profileId,
    role: "admin",
    turn_order: 1,
    status: "waiting",
    guarantee_type: "life_insurance",
    guarantee_status: "pending",
  });

  if (memberErr) {
    await supabase.from("groups").delete().eq("id", group.id);
    await clearSession(supabase, phone);
    return { success: false, reply: `❌ Erreur membre : ${memberErr.message}` };
  }

  await clearSession(supabase, phone);

  return {
    success: true,
    reply: msgGroupCreated(name, inviteCode, amount, maxMembers, FREQ_LABELS[frequency]),
  };
}
