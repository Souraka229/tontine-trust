import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { executeWhatsAppCommand } from "@/lib/whatsappCommands";
import { tryAutoOpenWhatsApp } from "@/lib/whatsappLink";
import WhatsAppOpenBanner from "@/components/WhatsAppOpenBanner";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  from: "user" | "bot";
  text: string;
  time: string;
}

const QUICK_COMMANDS = [
  "/aide",
  "CREER",
  "REJOINDRE",
  "TONTINE",
  "/solde",
  "/groupes",
  "/cotiser",
  "/bitcoin",
  "/score",
];

export default function WhatsAppBot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      from: "bot",
      text: "Bienvenue sur *TontineChain Bot*.\nTapez /aide ou *AIDE* pour le menu.\n*CREER* · *REJOINDRE CODE* · /bitcoin · /solde",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoOpened = useRef(false);

  useEffect(() => {
    const shouldOpen = searchParams.get("open") === "1" || searchParams.get("autostart") === "1";
    if (!shouldOpen || autoOpened.current) return;
    autoOpened.current = true;
    const preset = searchParams.get("msg") ?? "AIDE";
    tryAutoOpenWhatsApp(preset);
  }, [searchParams]);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages, scrollDown]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", text: trimmed, time: now }]);
    setInput("");
    setSending(true);

    try {
      const result = await executeWhatsAppCommand(trimmed, {
        supabase,
        userId: user?.id,
        phone: profile?.phone ?? undefined,
        appOrigin: window.location.origin,
        serviceRole: false,
      });
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "bot", text: result.reply, time: now },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "bot", text: "Erreur serveur. Réessayez ou ouvrez le bot WhatsApp réel ci-dessus.", time: now },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#0b141a]">
      <div className="bg-[#1f2c34] px-3 py-3 flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => navigate(user ? "/home" : "/")} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">TontineChain Bot</p>
          <p className="text-[10px] text-[#8696a0]">
            {user ? `Connecté · ${profile?.name ?? "Membre"}` : "Simulateur web · optionnel"}
          </p>
        </div>
      </div>

      <div className="px-3 py-2 shrink-0 bg-[#0b141a]">
        <WhatsAppOpenBanner presetMessage={user ? "/solde" : "AIDE"} />
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2 min-h-0"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.from === "user"
                  ? "bg-[#005c4b] text-white rounded-tr-none"
                  : "bg-[#1f2c34] text-white rounded-tl-none"
              }`}
            >
              {msg.text}
              <p className={`text-[9px] mt-1 text-right ${msg.from === "user" ? "text-white/50" : "text-[#8696a0]"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-2 py-1.5 flex gap-1.5 overflow-x-auto shrink-0 bg-[#1f2c34]/50">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => sendMessage(cmd)}
            className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-[#2a3942] text-[#8696a0] hover:text-white transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>

      <div className="bg-[#1f2c34] px-2 py-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Simulateur — ou ouvrez WhatsApp ci-dessus"
          className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2 outline-none placeholder:text-[#8696a0]"
        />
        <button
          type="button"
          disabled={sending || !input.trim()}
          onClick={() => sendMessage(input)}
          className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>

      <p className="text-[9px] text-center text-[#8696a0] py-1 bg-[#0b141a]">
        Canal optionnel · Prod : Meta WhatsApp Business + Supabase webhook
      </p>
    </div>
  );
}
