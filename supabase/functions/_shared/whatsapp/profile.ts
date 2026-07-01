import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, phoneLookupVariants } from "./utils.ts";

export async function resolveUserId(
  supabase: SupabaseClient,
  opts: { userId?: string; phone?: string },
): Promise<string | null> {
  if (opts.userId) return opts.userId;
  if (!opts.phone) return null;

  const variants = phoneLookupVariants(opts.phone);
  for (const p of variants) {
    const { data } = await supabase.from("profiles").select("id").eq("phone", p).maybeSingle();
    if (data?.id) return data.id;
  }

  // Recherche souple sur les 8 derniers chiffres (formats WhatsApp vs formulaire)
  const tail = normalizePhone(opts.phone).replace(/\D/g, "").slice(-8);
  if (tail.length >= 8) {
    const { data: candidates } = await supabase
      .from("profiles")
      .select("id, phone")
      .not("phone", "is", null)
      .ilike("phone", `%${tail}`);
    for (const row of candidates ?? []) {
      if (!row.phone) continue;
      if (normalizePhone(row.phone).replace(/\D/g, "").endsWith(tail)) {
        return row.id;
      }
    }
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

/** Lie ou crée un profil pour un numéro WhatsApp (service_role uniquement). */
export async function ensureProfileFromPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const existing = await resolveUserId(supabase, { phone });
  if (existing) {
    await syncPhoneOnProfile(supabase, existing, phone);
    return existing;
  }

  const digits = normalizePhone(phone).replace(/\D/g, "");
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
  const current = data?.phone ? normalizePhone(data.phone) : null;
  if (!current || current.replace(/\D/g, "") !== normalized.replace(/\D/g, "")) {
    await supabase.from("profiles").update({ phone: normalized }).eq("id", userId);
  }
}
