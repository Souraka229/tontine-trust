import { Link, useLocation } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
  compact?: boolean;
}

/** Invite à se connecter pour une action, sans bloquer la page entière. */
export default function AuthGate({
  title = "Compte requis",
  message = "Créez un compte gratuit ou connectez-vous pour effectuer cette action.",
  compact,
}: Props) {
  const location = useLocation();
  const next = encodeURIComponent(location.pathname + location.search);
  const loginTo = `/connexion?next=${next}`;
  const signupTo = `/inscription?next=${next}`;

  if (compact) {
    return (
      <p className="text-[11px] text-muted-foreground">
        <Link to={loginTo} className="font-semibold text-[hsl(var(--tc-brand))] underline">
          Connectez-vous
        </Link>
        {" "}pour continuer.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 text-center">
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">{message}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          to={signupTo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white tc-gradient-brand"
        >
          <UserPlus className="w-4 h-4" />
          Créer un compte
        </Link>
        <Link
          to={loginTo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-violet-200 text-[hsl(var(--tc-brand))] bg-white"
        >
          <LogIn className="w-4 h-4" />
          Se connecter
        </Link>
      </div>
    </div>
  );
}
