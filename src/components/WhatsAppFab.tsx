import { MessageCircle } from "lucide-react";
import { openWhatsAppBot, isWhatsAppBotConfigured, getWhatsAppBotLabel } from "@/lib/whatsappLink";

/** Bouton flottant — canal optionnel, même données que l'app. */
export default function WhatsAppFab() {
  if (!isWhatsAppBotConfigured()) return null;

  return (
    <button
      type="button"
      onClick={() => openWhatsAppBot("AIDE")}
      className="fixed z-40 right-4 bottom-[4.5rem] md:bottom-6 w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      aria-label={`Ouvrir WhatsApp — ${getWhatsAppBotLabel()}`}
      title={`Bot ${getWhatsAppBotLabel()}`}
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
