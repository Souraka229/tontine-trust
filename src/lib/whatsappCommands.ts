import type { SupabaseClient } from "@supabase/supabase-js";

export interface WhatsAppCommandContext {
  supabase: SupabaseClient;
  userId?: string;
  phone?: string;
  appOrigin?: string;
  serviceRole?: boolean;
}

export interface WhatsAppCommandResult {
  reply: string;
  success: boolean;
}

const MSG_AIDE = `*HACKBIT Bot* — Commandes :
/aide — ce menu
CREER — nouvelle tontine (via WhatsApp)
REJOINDRE CODE — rejoindre une tontine
/solde — votre solde sats
/groupes — vos groupes
/cotiser — cotiser
/bitcoin — infos Bitcoin/Lightning
/score — score de confiance`;

export async function executeWhatsAppCommand(
  rawMessage: string,
  _ctx: WhatsAppCommandContext,
): Promise<WhatsAppCommandResult> {
  const cmd = rawMessage.trim().toUpperCase().replace(/^\//, "");

  if (!cmd || cmd === "AIDE" || cmd === "HELP" || cmd === "MENU") {
    return { success: true, reply: MSG_AIDE };
  }

  if (cmd === "BITCOIN" || cmd === "BTC") {
    return {
      success: true,
      reply: `*Bitcoin Lightning Network*
Le bot HACKBIT utilise LNbits pour les paiements Lightning.
Toutes les cotisations sont en satoshis.
Tapez /solde pour voir votre solde.`,
    };
  }

  return {
    success: true,
    reply: `Commande "${rawMessage}" — utilisez le vrai bot WhatsApp pour les operations ou tapez /aide.`,
  };
}
