import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** Indique si les vraies clés sont présentes (sinon l’UI fonctionne mais l’auth réseau échouera). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[TontineTrust] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. " +
      "Ajoutez un fichier .env à la racine pour activer l’authentification Supabase."
  );
}

/**
 * Client Supabase : ne lance plus d’exception au chargement du module (évite écran blanc).
 * Sans .env, l’URL pointe vers localhost pour échouer vite plutôt que de bloquer indéfiniment.
 */
export const supabase = createClient(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
);
