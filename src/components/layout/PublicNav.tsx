import { useNavigate, useLocation } from "react-router-dom";
import { Bitcoin, MessageCircle, Search, Shield } from "lucide-react";

const links = [
  { path: "/rechercher", label: "Groupes", icon: Search },
  { path: "/crypto", label: "Trésor BTC", icon: Bitcoin },
  { path: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export default function PublicNav() {
  const navigate = useNavigate();
  const path = useLocation().pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--tc-border))] bg-white/85 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg tc-gradient-brand flex items-center justify-center shadow-[var(--tc-shadow-sm)]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-[hsl(var(--tc-ink))] hidden sm:inline tracking-tight">
            HACKBIT
          </span>
        </button>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map(({ path: to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <button
                key={to}
                type="button"
                onClick={() => navigate(to)}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-[hsla(243,100%,68%,0.12)] text-[hsl(var(--tc-violet))]"
                    : "text-[hsl(var(--tc-muted))] hover:text-[hsl(var(--tc-ink))] hover:bg-[hsl(var(--tc-mist))]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/connexion")}
            className="text-xs font-semibold text-[hsl(var(--tc-ink))] px-2 py-1.5 rounded-full hover:bg-[hsl(var(--tc-mist))]"
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => navigate("/inscription")}
            className="tc-btn-primary !min-h-8 !py-1.5 !px-3.5 !text-xs"
          >
            S'inscrire
          </button>
        </div>
      </div>
    </header>
  );
}
