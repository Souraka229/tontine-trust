import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PaymentState {
  amount?: number;
  groupName?: string;
  phone?: string;
  operator?: string;
  reference?: string;
  type?: string;
}

interface AdminGroup {
  id: string;
  name: string;
  members_count: number;
  max_members: number;
}

interface Profile {
  id: string;
  name: string;
  initials: string;
  email: string;
  score: number;
}

const OPERATOR_NAMES: Record<string, string> = {
  mtn: "MTN MoMo",
  moov: "Moov Money",
  celtiis: "Celtiis Cash",
};

export default function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const state = (location.state as PaymentState) || {};

  const {
    amount = 0,
    groupName = "—",
    phone = "—",
    operator = "mtn",
    reference = "TT-" + Date.now(),
    type = "Cotisation",
  } = state;

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    if (!user) return;
    void fetchAdminGroups();
  }, [user]);

  useEffect(() => {
    if (!selectedGroupId || !user) return;
    void fetchCandidates();
  }, [selectedGroupId, adminSearch, user]);

  const fetchAdminGroups = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, members_count, max_members)")
        .eq("profile_id", user?.id)
        .eq("role", "admin");
      if (error) throw error;
      const groups = (data || []).map((row: any) => row.groups).filter(Boolean) as AdminGroup[];
      setAdminGroups(groups);
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les groupes administrés.");
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchCandidates = async () => {
    if (!selectedGroupId || !user) return;
    try {
      const { data: existing, error: existingError } = await supabase
        .from("group_members")
        .select("profile_id")
        .eq("group_id", selectedGroupId);

      if (existingError) throw existingError;
      const excludedIds = (existing || []).map((row: any) => row.profile_id);

      let query = supabase
        .from("profiles")
        .select("id, name, initials, email, score")
        .neq("id", user.id)
        .limit(25);

      if (adminSearch.trim()) {
        const term = `%${adminSearch.trim()}%`;
        query = query.or(`name.ilike.${term},email.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const filtered = (data || []).filter((profile: Profile) => !excludedIds.includes(profile.id)) as Profile[];
      setCandidates(filtered);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les utilisateurs.");
    }
  };

  const handleAddUserToGroup = async (profileId: string) => {
    if (!selectedGroupId) return;
    setAdminLoading(true);
    try {
      const { count, error: countErr } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", selectedGroupId);
      if (countErr) throw countErr;
      const nextOrder = (count ?? 0) + 1;
      const { error } = await supabase.from("group_members").insert({
        group_id: selectedGroupId,
        profile_id: profileId,
        role: "member",
        status: "waiting",
        turn_order: nextOrder,
        guarantee_status: "verified",
      });
      if (error) throw error;
      toast.success("Utilisateur ajouté dans votre tontine.");
      await fetchCandidates();
      await fetchAdminGroups();
    } catch (err: any) {
      toast.error(err.message || "Impossible d'ajouter ce membre.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      <div className="flex-1 px-4 pt-12 text-center">
        {/* Animated check */}
        <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.12)] flex items-center justify-center mx-auto mb-4 animate-check-bounce">
          <Check className="w-10 h-10 text-[hsl(var(--tc-green))]" strokeWidth={3} />
        </div>

        <h2 className="text-xl font-bold mb-1">Paiement initié !</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Vérifiez votre téléphone et validez la demande de paiement
        </p>

        {/* Receipt */}
        <div className="bg-card border border-border rounded-2xl p-4 text-left mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reçu de paiement</p>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Type</span>
            <span className="font-semibold">{type}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-semibold text-[hsl(var(--tc-green))]">
              {new Intl.NumberFormat("fr-FR").format(amount)} FCFA
            </span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Groupe</span>
            <span className="font-semibold">{groupName}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Opérateur</span>
            <span className="font-semibold">{OPERATOR_NAMES[operator] || operator}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Téléphone</span>
            <span className="font-semibold">{phone}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Date</span>
            <span className="font-semibold">{dateStr}</span>
          </div>
          <div className="border-t border-border pt-2 mt-1">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Hash de la Transaction</p>
                <p className="text-[11px] text-[hsl(var(--tc-purple))] font-mono-tech break-all uppercase">
                  0x{reference.replace(/[^a-f0-9]/gi, '').substring(0, 24) || Math.random().toString(16).substring(2, 26)}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[hsla(160,84%,39%,0.1)] text-[8px] font-bold text-[hsl(var(--tc-green))] uppercase mb-1">
                  <ShieldCheck className="w-2 h-2" /> Certifié
                </span>
                <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground uppercase">
                  <Lock className="w-2 h-2" /> Immutable
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[hsla(38,92%,50%,0.08)] border border-[hsla(38,92%,50%,0.15)] mb-4 text-left">
          <span className="text-lg">⏳</span>
          <div>
            <p className="text-[11px] font-semibold text-[hsl(var(--tc-amber))]">En attente de confirmation</p>
            <p className="text-[10px] text-muted-foreground">
              Validez la demande sur votre téléphone — le paiement sera confirmé automatiquement
            </p>
          </div>
        </div>

        {adminGroups.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-4 mb-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">Administration</p>
                <p className="text-sm font-semibold">Ajouter des membres à votre tontine</p>
              </div>
              <span className="rounded-full bg-[hsl(var(--tc-green))] px-3 py-1 text-[10px] font-semibold text-white">
                {adminLoading ? "Chargement…" : "Admin actif"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                Groupe sélectionné
              </label>
              <select
                value={selectedGroupId ?? ""}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none"
              >
                {adminGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.members_count}/{group.max_members})
                  </option>
                ))}
              </select>

              <input
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
                placeholder="Rechercher un utilisateur"
                className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none"
              />

              {selectedGroupId && (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Aucun utilisateur disponible. Essayez une autre recherche.</p>
                  ) : (
                    candidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-3">
                        <div>
                          <p className="text-sm font-semibold">{candidate.name}</p>
                          <p className="text-[11px] text-muted-foreground">{candidate.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddUserToGroup(candidate.id)}
                          className="rounded-full bg-[hsl(var(--tc-green))] px-3 py-2 text-[11px] font-semibold text-white"
                        >
                          Ajouter
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate("/home")}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green"
        >
          Retour à l'accueil
        </button>
        <button
          onClick={() => navigate("/historique")}
          className="mt-3 text-xs text-[hsl(var(--tc-green))] font-medium"
        >
          Voir l'historique →
        </button>
      </div>
    </div>
  );
}