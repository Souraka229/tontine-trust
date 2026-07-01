import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Splash() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/home", { replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl tc-gradient-green flex items-center justify-center tc-shadow-green mb-6">
        <Shield className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold mb-1">HACKBIT</h1>
      <p className="text-sm text-muted-foreground mb-2">Tontine digitale · Bitcoin · Mobile Money</p>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-12">
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--tc-green))] animate-pulse" />
        Sécurisé par registre · Bitcoin indexé
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => navigate("/inscription")}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green"
        >
          Créer un compte
        </button>
        <button
          onClick={() => navigate("/connexion")}
          className="w-full py-3 rounded-xl text-sm font-medium border border-border bg-card hover:bg-accent transition-colors"
        >
          Se connecter
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-8 text-center max-w-[200px]">
        En continuant, vous acceptez nos Conditions d'utilisation
      </p>
    </div>
  );
}