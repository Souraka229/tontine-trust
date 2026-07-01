import type { SupabaseClient } from "@supabase/supabase-js";

export interface WhatsAppCommandContext {
  supabase: SupabaseClient;
  userId?: string;
  phone?: string;
  /** URL de l'app pour les liens deep-link (/cotiser) */
  appOrigin?: string;
  /** Edge Function / webhook dev avec service_role — auto-création profil WhatsApp */
  serviceRole?: boolean;
}

export interface WhatsAppCommandResult {
  reply: string;
  success: boolean;
}

export type SessionFlow = "create" | "join";

export interface WhatsAppSession {
  phone: string;
  profile_id: string | null;
  flow: SessionFlow;
  step: string;
  payload: Record<string, unknown>;
}

export type GroupFrequency = "Journalier" | "Hebdomadaire" | "Bimensuelle" | "Mensuelle" | "Trimestrielle";

export interface CreatePayload {
  name?: string;
  amount?: number;
  maxMembers?: number;
  frequency?: GroupFrequency;
}

export interface JoinPayload {
  code?: string;
  groupId?: string;
  groupName?: string;
}
