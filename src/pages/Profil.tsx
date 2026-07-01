import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Bell, Settings, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.abs(amount)) + " FCFA";
}

export default function Profil() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnecté avec succès");
    navigate("/connexion");
  };

  if (!profile) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[hsla(0,84%,60%,0.1)] flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-[hsl(var(--tc-red))]" />
        </div>
        <h2 className="text-lg font-bold mb-2">Profil non trouvé</h2>
        <p className="text-sm text-muted-foreground mb-6">Nous n'avons pas pu charger votre profil blockchain. Cela peut être dû à une synchronisation en cours.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full py-3 rounded-xl font-semibold text-white tc-gradient-green"
        >
          Réessayer
        </button>
        <button 
          onClick={handleSignOut} 
          className="mt-4 text-xs text-muted-foreground underline"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <TopBar
        title="Mon profil"
        rightElement={
          <button onClick={() => navigate("/parametres")} className="text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" />
          </button>
        }
      />

      {/* Avatar */}
      <div className="flex flex-col items-center pt-4 pb-5">
        <div className="w-16 h-16 rounded-full bg-[hsla(160,84%,39%,0.12)] border-2 border-[hsla(160,84%,39%,0.2)] flex items-center justify-center text-2xl font-bold text-[hsl(var(--tc-green))] mb-2">
          {profile.initials || profile.name?.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-bold">{profile.name}</p>
        <p className="text-[11px] text-muted-foreground">{profile.email}</p>
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsla(160,84%,39%,0.08)] border border-[hsla(160,84%,39%,0.15)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--tc-green))]" />
          <span className="text-[10px] text-[hsl(var(--tc-green))] font-medium">Portefeuille : {formatFCFA(profile.wallet_balance)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-5">
        <button onClick={() => navigate("/score")} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[hsl(var(--tc-green))]">{profile.score}</p>
          <p className="text-[9px] text-muted-foreground">Score</p>
        </button>
        <button onClick={() => navigate("/rechercher")} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold">{profile.groups_count}</p>
          <p className="text-[9px] text-muted-foreground">Groupes actifs</p>
        </button>
        <button onClick={() => navigate("/historique")} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold">{profile.cycles_completed}</p>
          <p className="text-[9px] text-muted-foreground">Cycles terminés</p>
        </button>
      </div>

      {/* Quick links */}
      <div className="px-4 pb-4">
        {[
          { label: "Historique des transactions", icon: Clock, path: "/historique" },
          { label: "Notifications", icon: Bell, path: "/notifications" },
          { label: "Paramètres", icon: Settings, path: "/parametres" },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between py-3 border-b border-border text-left"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 py-3 text-left text-[hsl(var(--tc-red))]"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}