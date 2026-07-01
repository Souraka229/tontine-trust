import { ExternalLink, MessageCircle } from "lucide-react";
import {
  buildWhatsAppUrl,
  getWhatsAppBotLabel,
  isWhatsAppBotConfigured,
  openWhatsAppBot,
} from "@/lib/whatsappLink";

interface Props {
  presetMessage?: string;
  compact?: boolean;
}

export default function WhatsAppOpenBanner({ presetMessage = "AIDE", compact }: Props) {
  if (!isWhatsAppBotConfigured()) {
    return (
      <div className="rounded-xl border border-dashed border-[#25D366]/40 bg-[#25D366]/5 px-3 py-2 text-[11px] text-muted-foreground">
        Configurez <code className="text-[10px]">VITE_WHATSAPP_BOT_NUMBER</code> pour ouvrir le bot réel.
      </div>
    );
  }

  const label = getWhatsAppBotLabel();
  const url = buildWhatsAppUrl(presetMessage);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openWhatsAppBot(presetMessage)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#128C7E] hover:underline"
      >
        <MessageCircle className="w-4 h-4" />
        {label}
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 px-4 py-3">
      <p className="text-xs font-semibold text-[#128C7E] mb-1 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Bot officiel · {label}
      </p>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        Ouvrez une conversation WhatsApp : mêmes commandes que le simulateur (/solde, /bitcoin, CREER…).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => openWhatsAppBot(presetMessage)}
          className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20bd5a] transition-colors"
        >
          Ouvrir dans WhatsApp
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl border border-[#25D366]/40 text-center text-sm font-medium text-[#128C7E] hover:bg-[#25D366]/5"
          >
            Lien wa.me
          </a>
        )}
      </div>
    </div>
  );
}
