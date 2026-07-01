import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import TCAvatar from "@/components/ui/tc-avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface Group {
  id: string;
  name: string;
  initials: string;
  color: "green" | "blue" | "amber" | "purple" | "red";
  contribution_amount: number;
  frequency: string;
  members_count: number;
  max_members: number;
  min_score: number;
  status: string;
  guarantee_deposit: number;
  penalty_rate: number;
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function Rechercher() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("groups")
      .select("*")
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGroups((data as Group[]) || []);
        setLoading(false);
      });

    if (user) {
      supabase
        .from("group_members")
        .select("group_id")
        .eq("profile_id", user.id)
        .then(({ data }) => {
          setMyGroupIds(
            ((data ?? []) as Array<{ group_id: string }>).map((d) => d.group_id)
          );
        });
    }
  }, [user]);

  const filtered = useMemo(
    () =>
      groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase())
      ),
    [groups, search]
  );

  const getGroupStatus = (g: Group) => {
    if (myGroupIds.includes(g.id)) return "member";
    if (g.status !== "pending" || g.members_count >= g.max_members) return "full";
    if (profile && profile.score < g.min_score) return "score_too_low";
    return "open";
  };

  return (
    <div className="animate-fade-in">
      <TopBar title="Explorer les groupes" backTo="/home" backLabel="Accueil" />

      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un groupe..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {loading ? "Chargement..." : `${filtered.length} groupe(s) disponible(s)`}
        </h3>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-medium">Aucun groupe trouvé</p>
            <p className="text-xs mt-1">Essayez un autre terme ou créez le vôtre</p>
            <button
              onClick={() => navigate("/creer")}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green"
            >
              Créer un groupe →
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {filtered.map((g) => {
            const statusType = getGroupStatus(g);
            const isMember = statusType === "member";
            const isFull = statusType === "full";
            const scoreTooLow = statusType === "score_too_low";

            return (
              <button
                key={g.id}
                onClick={() => {
                  if (isMember) navigate(`/groupe/${g.id}`);
                  else if (!isFull) navigate(`/rejoindre/${g.id}`);
                }}
                disabled={isFull}
                className={`w-full bg-card border rounded-xl p-3 text-left transition-colors ${
                  isFull
                    ? "opacity-50 border-border cursor-not-allowed"
                    : isMember
                    ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.04)]"
                    : "border-border hover:border-[hsl(var(--tc-green))]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <TCAvatar initials={g.initials} color={g.color} />
                    <div>
                      <p className="text-sm font-semibold">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {g.members_count}/{g.max_members} membres · {formatFCFA(g.contribution_amount)}/{
                          g.frequency === "Journalier" ? "jour"
                          : g.frequency === "Hebdomadaire" ? "sem."
                          : g.frequency === "Bimensuelle" ? "quinzaine"
                          : g.frequency === "Trimestrielle" ? "trim."
                          : "mois"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isMember && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[hsla(160,84%,39%,0.1)] text-[hsl(var(--tc-green))]">
                        Membre ✓
                      </span>
                    )}
                    {isFull && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">Complet</span>
                    )}
                    {scoreTooLow && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[hsla(0,84%,60%,0.1)] text-[hsl(var(--tc-red))]">Score insuffisant</span>
                    )}
                    {statusType === "open" && (
                      <span className="text-[11px] font-semibold text-[hsl(var(--tc-green))]">Rejoindre →</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  {g.penalty_rate > 0 && <span>Pénalité {g.penalty_rate}%</span>}
                  <span>Garantie bancaire</span>
                  {g.min_score > 0 && <span>Score min. {g.min_score}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
