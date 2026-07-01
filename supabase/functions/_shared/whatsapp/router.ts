import type { CreatePayload, WhatsAppCommandContext, WhatsAppCommandResult } from "./types.ts";
import { isCancelCommand, parseCommand } from "./utils.ts";
import { MSG_AIDE, MSG_NOT_LINKED, MSG_SESSION_CANCELLED, MSG_UNKNOWN } from "./messages.ts";
import { resolvePhone } from "./profile.ts";
import { clearSession, getSession } from "./sessions.ts";
import { handleReadCommand, requireUserId } from "./readCommands.ts";
import { handleCreateStep, startCreate } from "./flows/create.ts";
import { handleJoin } from "./flows/join.ts";
import { handleHistorique, handleMembres, handleTontine } from "./flows/status.ts";

export async function executeWhatsAppCommand(
  rawMessage: string,
  ctx: WhatsAppCommandContext,
): Promise<WhatsAppCommandResult> {
  const { supabase } = ctx;
  const { cmd, args, raw } = parseCommand(rawMessage);

  const phone = await resolvePhone(supabase, ctx);
  const sessionPhone = phone ?? (ctx.phone ? ctx.phone.replace(/\s/g, "") : null);

  if (sessionPhone && isCancelCommand(cmd)) {
    await clearSession(supabase, sessionPhone);
    return { success: true, reply: MSG_SESSION_CANCELLED };
  }

  if (sessionPhone) {
    const session = await getSession(supabase, sessionPhone);
    if (session) {
      const userId = session.profile_id ?? (await requireUserId(ctx));
      if (!userId) {
        await clearSession(supabase, sessionPhone);
        return { success: false, reply: MSG_NOT_LINKED };
      }

      if (session.flow === "create") {
        return handleCreateStep(
          supabase,
          sessionPhone,
          userId,
          session.step,
          raw,
          cmd,
          session.payload as CreatePayload,
        );
      }
    }
  }

  if (!cmd || cmd === "AIDE" || cmd === "HELP" || cmd === "MENU") {
    return { success: true, reply: MSG_AIDE };
  }

  const userId = await requireUserId(ctx);

  if (cmd === "CREER") {
    if (!userId) return { success: false, reply: MSG_NOT_LINKED };
    if (!sessionPhone) {
      return { success: false, reply: "❌ Numéro WhatsApp requis pour l'assistant." };
    }
    return startCreate(supabase, sessionPhone, userId);
  }

  if (cmd === "REJOINDRE" || cmd === "JOIN") {
    if (!userId) return { success: false, reply: MSG_NOT_LINKED };
    return handleJoin(supabase, userId, args);
  }

  if (cmd === "TONTINE") {
    if (!userId) return { success: false, reply: MSG_NOT_LINKED };
    return handleTontine(supabase, userId);
  }

  if (cmd === "MEMBRES") {
    if (!userId) return { success: false, reply: MSG_NOT_LINKED };
    return handleMembres(supabase, userId);
  }

  if (cmd === "HISTORIQUE" || cmd === "HISTO") {
    if (!userId) return { success: false, reply: MSG_NOT_LINKED };
    return handleHistorique(supabase, userId);
  }

  const readCmd = cmd.toLowerCase();
  if (userId) {
    const readResult = await handleReadCommand(readCmd, ctx, userId);
    if (readResult) return readResult;
  } else if (["solde", "score", "groupes", "groupe", "cotiser", "liquidity", "crypto", "bitcoin", "btc", "notifs", "notifications", "invoice", "ln"].includes(readCmd)) {
    return { success: false, reply: MSG_NOT_LINKED };
  }

  return { success: false, reply: MSG_UNKNOWN };
}
