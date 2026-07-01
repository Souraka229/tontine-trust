import { useNavigate, useLocation } from "react-router-dom";
import { mainNavItems } from "@/config/navConfig";

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="flex items-center justify-around border-t border-border/80 bg-card/95 backdrop-blur-sm px-1 py-1.5 shrink-0">
      {mainNavItems.map((tab) => {
        const active = tab.match(path);
        const Icon = tab.icon;
        const label = tab.mobileLabel ?? tab.label;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 max-w-[4.5rem] py-1 rounded-lg transition-colors text-[9px] sm:text-[10px] font-medium ${
              active ? "text-[hsl(var(--tc-brand))]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-[1.15rem] h-[1.15rem] sm:w-5 sm:h-5 shrink-0" strokeWidth={active ? 2.5 : 1.5} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
