import { useNavigate, useLocation } from "react-router-dom";
import { mainNavItems, moduleNavItems } from "@/config/navConfig";

export default function DesktopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active
        ? "bg-[hsla(266,62%,33%,0.12)] text-[hsl(var(--tc-brand))]"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-sm min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-border/60">
        <button type="button" onClick={() => navigate("/home")} className="text-left">
          <p className="text-lg font-bold text-[hsl(var(--tc-brand))]">HACKBIT</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tontine · FCFA · Bitcoin</p>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Application
        </p>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(path);
          return (
            <button key={item.path} type="button" onClick={() => navigate(item.path)} className={linkClass(active)}>
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}

        <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Modules
        </p>
        {moduleNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.match(path);
          return (
            <button key={item.path} type="button" onClick={() => navigate(item.path)} className={linkClass(active)}>
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground mb-2">Partenaires</p>
        <div className="flex flex-wrap items-center gap-3 opacity-90">
          <img src="/logos/kkiapay.svg" alt="Kkiapay" className="h-5 w-auto object-contain" />
          <img src="/logos/mtn-momo.svg" alt="MTN MoMo" className="h-5 w-auto object-contain" />
          <img src="/logos/moov-money.svg" alt="Moov Money" className="h-5 w-auto object-contain" />
          <img src="/logos/bitcoin.svg" alt="Bitcoin" className="h-5 w-auto object-contain" />
        </div>
      </div>
    </aside>
  );
}
