import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface TopBarProps {
  title: string;
  /** Navigation vers une route */
  backTo?: string;
  /** Action personnalisée (ex. retour multi-étapes) — prioritaire sur backTo */
  onBack?: () => void;
  backLabel?: string;
  rightElement?: React.ReactNode;
}

export default function TopBar({ title, backTo, onBack, backLabel, rightElement }: TopBarProps) {
  const navigate = useNavigate();
  const showBack = Boolean(onBack || backTo);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      {showBack ? (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : backTo && navigate(backTo))}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-[hsl(var(--tc-green))] transition-colors min-w-0 max-w-[42%]"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">{backLabel || "Retour"}</span>
        </button>
      ) : (
        <span className="w-10" />
      )}
      <span className="text-sm font-semibold text-center truncate px-1 max-w-[40%]">{title}</span>
      {rightElement || <span className="w-10 shrink-0" />}
    </div>
  );
}