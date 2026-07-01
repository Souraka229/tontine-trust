import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Shield, X } from "lucide-react";

const navLinks = [
  { label: "Solution", to: "#solution" },
  { label: "Aperçus", to: "#apercus" },
  { label: "Groupes", to: "/rechercher" },
  { label: "Bitcoin", to: "/crypto" },
  { label: "WhatsApp", to: "/whatsapp" },
];

export default function LandingHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (to: string) => {
    setMenuOpen(false);
    if (to.startsWith("#")) {
      document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(to);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--tc-border))] bg-white/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl tc-gradient-brand flex items-center justify-center shadow-[var(--tc-shadow-sm)] group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-[hsl(var(--tc-ink))]">TontineChain</span>
        </button>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[hsl(var(--tc-muted))]">
          {navLinks.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => handleNav(l.to)}
              className="hover:text-[hsl(var(--tc-violet))] transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/connexion")}
            className="tc-btn-ghost text-sm"
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => navigate("/rechercher")}
            className="tc-btn-secondary text-sm !py-2.5 !px-5"
          >
            Explorer
          </button>
          <button
            type="button"
            onClick={() => navigate("/inscription")}
            className="tc-btn-primary text-sm !py-2.5 !px-5"
          >
            S'inscrire
          </button>
        </div>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg hover:bg-[hsl(var(--tc-mist))]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[hsl(var(--tc-border))] bg-white px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <button
              key={l.label}
              type="button"
              className="block w-full text-left text-sm font-medium py-2.5 px-2 rounded-lg hover:bg-[hsl(var(--tc-mist))]"
              onClick={() => handleNav(l.to)}
            >
              {l.label}
            </button>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-[hsl(var(--tc-border))] mt-2">
            <button type="button" onClick={() => navigate("/connexion")} className="tc-btn-ghost w-full">
              Connexion
            </button>
            <button type="button" onClick={() => navigate("/rechercher")} className="tc-btn-secondary w-full">
              Explorer sans compte
            </button>
            <button type="button" onClick={() => navigate("/inscription")} className="tc-btn-primary w-full">
              S'inscrire
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
