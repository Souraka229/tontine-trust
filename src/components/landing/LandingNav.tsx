import { useNavigate } from "react-router-dom";

const NAV = [
  { label: "Produits", to: "#produits" },
  { label: "Tontines", to: "#comment" },
  { label: "Bitcoin", to: "/crypto" },
  { label: "À propos", to: "#apropos" },
];

interface LandingNavProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}

export default function LandingNav({ menuOpen, onToggleMenu, onCloseMenu }: LandingNavProps) {
  const navigate = useNavigate();

  const go = (to: string) => {
    onCloseMenu();
    if (to.startsWith("#")) {
      document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(to);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl tc-gradient-brand flex items-center justify-center text-white font-black text-sm">
            T
          </div>
          <span className="font-bold text-lg text-slate-900">HACKBIT</span>
        </button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {NAV.map((l) => (
            <button key={l.label} type="button" onClick={() => go(l.to)} className="hover:text-[hsl(266_62%_33%)] transition-colors">
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/inscription")}
            className="px-5 py-2.5 rounded-full text-sm font-bold text-white tc-gradient-brand hover:opacity-95"
          >
            S&apos;inscrire
          </button>
          <button
            type="button"
            onClick={() => navigate("/connexion")}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
          >
            Connexion
          </button>
        </div>

        <button type="button" className="md:hidden p-2 text-slate-700" onClick={onToggleMenu} aria-label="Menu">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
          {NAV.map((l) => (
            <button key={l.label} type="button" className="block w-full text-left py-2 text-sm font-medium" onClick={() => go(l.to)}>
              {l.label}
            </button>
          ))}
          <div className="flex gap-2 pt-3">
            <button type="button" onClick={() => navigate("/inscription")} className="flex-1 py-2.5 rounded-full tc-gradient-brand text-white text-sm font-bold">
              S&apos;inscrire
            </button>
            <button type="button" onClick={() => navigate("/connexion")} className="flex-1 py-2.5 rounded-full border text-sm font-semibold">
              Connexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
