import { useNavigate } from "react-router-dom";
import { Bell, Lock, ShieldCheck, Wallet } from "lucide-react";
import TCAvatar from "@/components/ui/tc-avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { runTontineAutomation } from "@/lib/tontineAutomation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex";

interface Group {
  id: string;
  name: string;
  initials: string;
  color: string;
  contribution_amount: number;
  current_round: number;
  total_rounds: number;
  total_pool: number;
  status: "pending" | "active" | "completed" | "cancelled";
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.abs(amount)) + " FCFA";
}
function formatCompact(amount: number) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "M";
  if (amount >= 1000) return (amount / 1000).toFixed(0) + "k";
  return amount.toString();
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLate, setHasLate] = useState(false);
  const convexGroups = useQuery(api.tontines.listMyGroups, isConvexConfigured && user ? {} : "skip");

  useEffect(() => {
    if (convexGroups) {
      setGroups(convexGroups.map((group) => ({
        id: group.id,
        name: group.name,
        initials: group.initials,
        color: group.color,
        contribution_amount: group.contributionAmount,
        current_round: group.currentRound,
        total_rounds: group.totalRounds,
        total_pool: group.totalPool,
        status: group.status,
      })));
    }
  }, [convexGroups]);

  useEffect(() => {
    if (isConvexConfigured) return;
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Automation en arrière-plan pour ne pas bloquer l'affichage initial
      runTontineAutomation().catch(() => {});
      
      if (cancelled) return;
      const [{ data: gm }, { count }] = await Promise.all([
        supabase.from("group_members").select("group_id, groups(*)").eq("profile_id", user.id),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("is_read", false),
      ]);
      if (cancelled) return;
      if (gm) setGroups(gm.map((d) => (d as { groups: Group }).groups).filter(Boolean));
      setUnreadCount(count ?? 0);
      // Check late status
      const { data: lateRows } = await supabase
        .from("group_members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("status", "late")
        .limit(1);
      if (!cancelled) setHasLate((lateRows?.length ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="animate-fade-in">
      {/* Hero : verrouillé et portefeuille au même niveau */}
      <div className="tc-gradient-hero text-white px-4 pt-12 pb-6 relative">
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => navigate("/profil")}
            className="pointer-events-auto w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-[10px] font-bold backdrop-blur-sm hover:bg-white/25 transition-colors"
            aria-label="Mon profil"
          >
            {profile?.initials?.slice(0, 2) || "?"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="pointer-events-auto relative w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm hover:bg-white/25 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[hsl(var(--tc-red))] text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-white/70 mb-3 pt-1">Mes soldes</p>

        <div className="mb-1">
          <button
            type="button"
            onClick={() => navigate("/portefeuille")}
            className="w-full rounded-2xl bg-white/12 border border-white/20 px-4 py-4 text-center backdrop-blur-sm hover:bg-white/18 active:scale-[0.99] transition-all flex flex-col items-center justify-center"
          >
            <div className="flex items-center gap-1.5 mb-2 text-white/75">
              <Wallet className="w-4 h-4" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Solde Disponible</span>
            </div>
            <p className="text-3xl font-bold leading-tight tabular-nums">{formatFCFA(profile?.wallet_balance ?? 0).replace(" FCFA", "")}</p>
            <p className="text-[10px] text-white/55 mt-1.5">FCFA · TontineChain</p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate("/portefeuille")}
          className="w-full mt-2 py-2 rounded-xl text-[11px] font-medium text-white/90 bg-white/10 border border-white/15 hover:bg-white/15 transition-colors"
        >
          Gérer dépôts, retraits et historique →
        </button>

        <p className="text-center text-[10px] text-white/55 mt-3">{profile?.groups_count ?? 0} groupe{(profile?.groups_count ?? 0) !== 1 ? "s" : ""} actif{(profile?.groups_count ?? 0) !== 1 ? "s" : ""}</p>

        {hasLate && (
          <div className="mt-3 p-2.5 rounded-xl bg-[hsla(0,84%,60%,0.2)] border border-[hsla(0,84%,60%,0.3)] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-white shrink-0" />
            <p className="text-[10px] text-white/90 font-medium flex-1">
              Cotisation(s) en retard — compte suspendu
            </p>
            <button
              type="button"
              onClick={() => navigate("/cotiser")}
              className="text-[10px] font-bold text-white underline shrink-0"
            >
              Payer →
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => navigate("/cotiser")} className="flex-1 py-2.5 rounded-xl bg-white/20 text-xs font-semibold text-center backdrop-blur-sm border border-white/10">
            Cotiser
          </button>
          <button type="button" onClick={() => navigate("/rechercher")} className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-medium text-center backdrop-blur-sm border border-white/10">
            Rejoindre
          </button>
          <button type="button" onClick={() => navigate("/creer")} className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-medium text-center backdrop-blur-sm border border-white/10">
            Créer
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="px-4 pt-3 pb-4">
        <h2 className="text-sm font-semibold mb-3">Mes groupes</h2>
        {groups.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">🫂</p>
            <p className="text-sm font-medium">Aucun groupe encore</p>
            <p className="text-xs mt-1">Créez ou rejoignez un groupe pour commencer</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/groupe/${g.id}`)}
                className="w-full bg-card border border-border rounded-xl p-3 text-left transition-colors hover:border-[hsl(var(--tc-green))]"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <TCAvatar initials={g.initials} color={g.color} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[hsla(160,40%,42%,0.12)] text-[8px] font-semibold text-[hsl(var(--tc-green))] uppercase tracking-tight shrink-0">
                          <ShieldCheck className="w-2 h-2" /> Traçable
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Tour {g.current_round}/{g.total_rounds} · {formatFCFA(g.contribution_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${g.total_pool > 0 ? "text-[hsl(var(--tc-green))]" : "text-muted-foreground"}`}>
                      {g.total_pool > 0 ? `+${formatCompact(g.total_pool)}` : "0"}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      g.status === "active" ? "bg-[hsla(160,35%,45%,0.12)] text-[hsl(var(--tc-green))]" :
                      g.status === "pending" ? "bg-[hsla(38,92%,50%,0.12)] text-[hsl(var(--tc-amber))]" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {g.status === "active" ? "Actif" : g.status === "pending" ? "En attente" : "Terminé"}
                    </span>
                  </div>
                </div>
                <ProgressBar value={(g.current_round / g.total_rounds) * 100} color={g.color} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Explication bloc TontineChain */}
      <div className="px-4 pb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Comment fonctionne TontineChain ?</p>
          <div className="space-y-2.5">
            {[
              { emoji: "🤝", title: "Tontine solidaire", desc: "Tous cotisent, chacun reçoit à son tour la cagnotte cumulée." },
              { emoji: "⚡", title: "Versement automatique", desc: "Dès que tout le monde a payé, les fonds sont versés sans intervention." },
              { emoji: "🔒", title: "Retard = compte suspendu", desc: "Pas de cotisation à l'échéance ? Votre portefeuille est bloqué jusqu'à régularisation." },
              { emoji: "🛡️", title: "Preuves secp256k1", desc: "Engagements signés par groupe. Registre partagé Supabase vérifiable par tous les membres." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 items-start">
                <span className="text-base mt-0.5">{item.emoji}</span>
                <div>
                  <p className="text-[11px] font-semibold">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}