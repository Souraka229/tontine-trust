import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionFlow, WhatsAppSession } from "./types.ts";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function getSession(
  supabase: SupabaseClient,
  phone: string,
): Promise<WhatsAppSession | null> {
  const { data } = await supabase.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();
  if (!data) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at as string).getTime() : null;
  if (expiresAt && expiresAt < Date.now()) {
    await supabase.from("whatsapp_sessions").delete().eq("phone", phone);
    return null;
  }

  return {
    phone: data.phone,
    profile_id: data.profile_id,
    flow: data.flow as SessionFlow,
    step: data.step,
    payload: (data.payload as Record<string, unknown>) ?? {},
  };
}

export async function setSession(
  supabase: SupabaseClient,
  phone: string,
  profileId: string | null,
  flow: SessionFlow,
  step: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await supabase.from("whatsapp_sessions").upsert(
    {
      phone,
      profile_id: profileId,
      flow,
      step,
      payload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );
}

export async function clearSession(supabase: SupabaseClient, phone: string): Promise<void> {
  await supabase.from("whatsapp_sessions").delete().eq("phone", phone);
}
