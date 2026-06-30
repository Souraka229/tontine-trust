import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "./utils.ts";

export async function resolveUserId(
  supabase: SupabaseClient,
  opts: { userId?: string; phone?: string },
): Promise<string | null> {
  if (opts.userId) return opts.userId;
  if (!opts.phone) return null;

  const normalized = normalizePhone(opts.phone);
  const variants = [normalized, normalized.replace(/^\+/, ""), `+${normalized.replace(/^\+/, "")}`];

  for (const p of [...new Set(variants)]) {
    const { data } = await supabase.from("profiles").select("id").eq("phone", p).maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

export async function resolvePhone(
  supabase: SupabaseClient,
  opts: { userId?: string; phone?: string },
): Promise<string | null> {
  if (opts.phone) return normalizePhone(opts.phone);
  if (!opts.userId) return null;
  const { data } = await supabase.from("profiles").select("phone").eq("id", opts.userId).maybeSingle();
  return data?.phone ? normalizePhone(data.phone) : null;
}

/** Crée un compte minimal pour un numéro WhatsApp (service_role uniquement). */
export async function ensureProfileFromPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const existing = await resolveUserId(supabase, { phone });
  if (existing) return existing;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const email = `wa+${digits}@whatsapp.tontine.local`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      phone: normalizePhone(phone),
      name: `Membre ${digits.slice(-4)}`,
    },
  });

  if (error) {
    const { data: byEmail } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (byEmail?.id) return byEmail.id;
    return null;
  }

  return data.user?.id ?? null;
}

export async function syncPhoneOnProfile(
  supabase: SupabaseClient,
  userId: string,
  phone: string,
): Promise<void> {
  const normalized = normalizePhone(phone);
  const { data } = await supabase.from("profiles").select("phone").eq("id", userId).single();
  if (data && !data.phone) {
    await supabase.from("profiles").update({ phone: normalized }).eq("id", userId);
  }
}
