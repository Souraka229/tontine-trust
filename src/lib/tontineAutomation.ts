import { supabase } from "@/lib/supabase";

/** Prélèvements à l'échéance + versement cagnotte quand tout le monde a payé (RPC Supabase). */
export async function runTontineAutomation(): Promise<void> {
  try {
    const { error } = await supabase.rpc("rpc_tontine_automation");
    if (error) console.warn("[tontineAutomation]", error.message);
  } catch (e) {
    console.warn("[tontineAutomation]", e);
  }
}
