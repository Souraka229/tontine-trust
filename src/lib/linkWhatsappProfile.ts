import { supabase } from "@/lib/supabase";

/** Transfère les groupes WhatsApp vers le compte web connecté (même numéro). */
export async function linkWhatsappProfile(): Promise<number> {
  const { data, error } = await supabase.rpc("link_whatsapp_profile");
  if (error) {
    console.warn("[linkWhatsappProfile]", error.message);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
