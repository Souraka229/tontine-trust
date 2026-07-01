import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  type: string;
  name: string;
  amount: number;
  created_at: string;
  groups?: { name: string } | null;
}

type TxFilter = "all" | "payout" | "contribution" | "penalty";

const filters: Array<{ label: string; value: TxFilter }> = [
  { label: "Tout", value: "all" },
  { label: "Reçus", value: "payout" },
  { label: "Cotisations", value: "contribution" },
  { label: "Pénalités", value: "penalty" },
];

export default function Historique() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<TxFilter>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("transactions")
      .select("*, groups(name)")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
      });
  }, [user, activeFilter]);

  const filtered = transactions.filter((t) => {
    if (activeFilter === "all") return true;
    return t.type === activeFilter;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  return (
    <div className="animate-fade-in">
      <TopBar title="Historique" backTo="/profil" backLabel="Profil" />

      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeFilter === f.value
                ? "bg-[hsl(var(--tc-green))] text-white"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">Aucune transaction pour l'instant</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0 text-left"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                  t.type === "payout"
                    ? "bg-[hsla(160,84%,39%,0.12)] text-[hsl(var(--tc-green))]"
                    : t.type === "contribution"
                    ? "bg-[hsla(0,84%,60%,0.12)] text-[hsl(var(--tc-red))]"
                    : "bg-[hsla(258,90%,66%,0.12)] text-[hsl(var(--tc-purple))]"
                }`}
              >
                {t.type === "payout" ? "↓" : t.type === "contribution" ? "↑" : "⚠"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(t.created_at)}
                  {t.groups ? ` · ${t.groups.name}` : ""}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  t.amount > 0
                    ? "text-[hsl(var(--tc-green))]"
                    : t.amount < 0
                    ? "text-[hsl(var(--tc-red))]"
                    : "text-[hsl(var(--tc-purple))]"
                }`}
              >
                {t.amount > 0 ? "+" : ""}
                {t.amount !== 0 ? new Intl.NumberFormat("fr-FR").format(t.amount) : "Contrat"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
