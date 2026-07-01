/** Numéro WhatsApp Business du bot (format international sans +, ex. 22990123456). */
export function getWhatsAppBotNumber(): string | null {
  const raw = (import.meta.env.VITE_WHATSAPP_BOT_NUMBER as string | undefined)?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function getWhatsAppBotLabel(): string {
  const label = (import.meta.env.VITE_WHATSAPP_BOT_LABEL as string | undefined)?.trim();
  if (label) return label;
  const num = getWhatsAppBotNumber();
  if (!num) return "Bot WhatsApp";
  if (num.startsWith("229") && num.length >= 11) {
    return `+${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)} ${num.slice(9)}`;
  }
  return `+${num}`;
}

export function isWhatsAppBotConfigured(): boolean {
  return getWhatsAppBotNumber() !== null;
}

export function buildWhatsAppUrl(message?: string): string | null {
  const num = getWhatsAppBotNumber();
  if (!num) return null;
  const base = `https://wa.me/${num}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

/** Ouvre WhatsApp (app ou web) vers le bot. */
export function openWhatsAppBot(message?: string): boolean {
  const url = buildWhatsAppUrl(message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

const SESSION_AUTOSTART_KEY = "tc_whatsapp_autostart_v1";

/** Une ouverture auto par session (évite boucle au retour navigateur). */
export function tryAutoOpenWhatsApp(message = "AIDE"): boolean {
  if (!isWhatsAppBotConfigured()) return false;
  if (sessionStorage.getItem(SESSION_AUTOSTART_KEY)) return false;
  const ok = openWhatsAppBot(message);
  if (ok) sessionStorage.setItem(SESSION_AUTOSTART_KEY, "1");
  return ok;
}
