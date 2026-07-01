import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowRight,
  Search,
  FileText,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  initials: string;
  color: string;
  contribution_amount: number;
  frequency: string;
  members_count: number;
  max_members: number;
  total_rounds: number;
  status: "pending" | "active" | "completed" | "cancelled";
  penalty_rate: number;
  guarantee_deposit: number;
  current_round?: number;
  total_pool?: number;
  order_type?: string;
}

interface Member {
  id: string;
  profile_id: string;
  role: "admin" | "member";
  status: string;
  turn_order: number;
  guarantee_status: string;
  profiles: { name: string; initials: string; email: string } | null;
}

interface Profile {
  id: string;
  name: string;
  initials: string;
  email: string;
  score: number;
}

const TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "members", label: "Membres" },
  { id: "requests", label: "Demandes" },
  { id: "reports", label: "Rapports" },
];

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  useEffect(() => {
    if (!user) return;
    void fetchAdminGroups();
  }, [user]);

  useEffect(() => {
    if (!selectedGroup) return;
    void fetchMembers();
    void fetchProfiles();
  }, [selectedGroup, search]);

  const fetchAdminGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(*)")
        .eq("profile_id", user?.id)
        .eq("role", "admin");

      if (error) throw error;

      const adminGroups = (data || [])
        .map((row: any) => row.groups)
        .filter(Boolean) as Group[];

      setGroups(adminGroups);
      if (adminGroups.length > 0) {
        setSelectedGroupId(adminGroups[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les groupes administrés.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedGroup) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("*, profiles(name, initials, email)")
        .eq("group_id", selectedGroup.id)
        .order("turn_order", { ascending: true });

      if (error) throw error;
      setMembers((data as Member[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les membres.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchProfiles = async () => {
    if (!selectedGroup) return;
    try {
      const memberIds = members.map((member) => member.profile_id);
      let query = supabase
        .from("profiles")
        .select("id, name, initials, email, score")
        .neq("id", user?.id)
        .limit(40);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},email.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const filtered = (data || [])
        .filter((profile: Profile) => !memberIds.includes(profile.id))
        .slice(0, 40) as Profile[];
      setProfiles(filtered);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les utilisateurs.");
    }
  };

  const handleAddMember = async (profileId: string) => {
    if (!selectedGroup) return;
    if (selectedGroup.members_count >= selectedGroup.max_members) {
      toast.error("Le groupe est déjà plein.");
      return;
    }

    setLoading(true);
    try {
      const { count, error: countErr } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", selectedGroup.id);

      if (countErr) throw countErr;
      const nextOrder = (count ?? 0) + 1;

      const { error } = await supabase.from("group_members").insert({
        group_id: selectedGroup.id,
        profile_id: profileId,
        role: "member",
        turn_order: nextOrder,
        status: "waiting",
        guarantee_status: "verified",
      });

      if (error) throw error;
      toast.success("Membre ajouté avec succès.");
      await fetchAdminGroups();
      await fetchMembers();
      setSearch("");
    } catch (err: any) {
      toast.error(err.message || "Impossible d'ajouter le membre.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcludeMember = async (memberId: string) => {
    if (!selectedGroup) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ status: "excluded" })
        .eq("id", memberId);
      if (error) throw error;
      toast.success("Membre exclu.");
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Impossible d'exclure le membre.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGuarantee = async (memberId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ guarantee_status: "verified" })
        .eq("id", memberId);
      if (error) throw error;
      toast.success("Garantie validée.");
      await fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Impossible de valider la garantie.");
    } finally {
      setLoading(false);
    }
  };

  const activeMembers = members.filter((member) => member.status !== "excluded");
  const pendingRequests = members.filter((member) => member.guarantee_status === "pending");

  return (
    <div className="animate-fade-in pb-6">
      <TopBar
        title="Administration"
        backTo="/profil"
        backLabel="Profil"
        rightElement={
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[hsla(258,90%,66%,0.12)] text-[hsl(var(--tc-purple))]">
            Admin
          </span>
        }
      />

      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                tab === item.id
                  ? "bg-[hsl(var(--tc-green))] text-white"
                  : "bg-card text-muted-foreground border border-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-8 text-center text-xs text-muted-foreground">Chargement des données administrateur…</div>
        )}

        {!loading && groups.length === 0 && (
          <div className="rounded-3xl border border-border bg-card/90 p-5 text-center">
            <p className="text-sm font-semibold mb-2">Vous n'êtes administrateur d'aucun groupe.</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              Créez un groupe ou rejoignez-en un où vous avez le rôle administrateur.
            </p>
            <button
              type="button"
              onClick={() => navigate("/creer")}
              className="py-3 px-4 rounded-xl bg-[hsl(var(--tc-green))] text-white text-sm font-semibold"
            >
              Créer un groupe
            </button>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-3xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">Groupes administrés</h2>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full rounded-3xl border p-3 text-left transition-all ${
                        selectedGroup?.id === group.id
                          ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)]"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {group.members_count}/{group.max_members} membres · {group.frequency}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">Résumé du groupe</h2>
                {selectedGroup ? (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>Tour actuel</span>
                      <span className="font-semibold text-foreground">{selectedGroup.current_round ?? 1}/{selectedGroup.total_rounds}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <span className="font-semibold text-foreground">{selectedGroup.status}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Ordre</span>
                      <span className="font-semibold text-foreground">{selectedGroup.order_type === "manual" ? "Manuel" : "Aléatoire"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Pénalité</span>
                      <span className="font-semibold text-foreground">{selectedGroup.penalty_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Garantie</span>
                      <span className="font-semibold text-foreground">Bancaire (Partenaire)</span>
                    </div>
                    <div className="rounded-3xl border border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)] p-3 text-[11px] text-foreground">
                      <p className="font-semibold">Actions clés</p>
                      <p className="mt-1">Ajoutez des membres, gérez les garanties et suivez les demandes en cours.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sélectionnez un groupe pour afficher le résumé.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4">
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-[hsla(160,84%,39%,0.15)] bg-[hsla(160,84%,39%,0.08)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Bonjour Admin</p>
                        <p className="text-sm font-semibold">Gestion centralisée de vos tontines</p>
                      </div>
                      <div className="rounded-2xl bg-[hsl(var(--tc-green))] px-3 py-2 text-[10px] font-semibold text-white">Tâche rapide</div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">
                      Sélectionnez un groupe puis utilisez les onglets Membres ou Demandes pour ajouter, exclure ou valider des adhésions.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-border p-4">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Membres actifs</p>
                      <p className="text-2xl font-bold text-[hsl(var(--tc-green))]">{activeMembers.length}</p>
                    </div>
                    <div className="rounded-3xl border border-border p-4">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Demandes de garantie</p>
                      <p className="text-2xl font-bold">{pendingRequests.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "members" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Membres du groupe</h3>
                      <p className="text-[11px] text-muted-foreground">Gérez l'ordre et le statut des adhérents.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchMembers()}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-[11px] text-muted-foreground"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> Actualiser
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div key={member.id} className="rounded-3xl border border-border p-3 bg-card">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{member.profiles?.name || "Membre"}</p>
                              <p className="text-[11px] text-muted-foreground">{member.role === "admin" ? "Administrateur" : "Participant"}</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Tour {member.turn_order}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-full border border-[hsla(160,84%,39%,0.15)] px-2 py-1">{member.status}</span>
                            <span className="rounded-full border border-[hsla(160,84%,39%,0.15)] px-2 py-1">Garantie {member.guarantee_status}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => handleExcludeMember(member.id)}
                                className="rounded-xl border border-[hsl(var(--tc-red))] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--tc-red))]"
                              >
                                Exclure
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl border border-border bg-[hsla(160,84%,39%,0.04)] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Search className="w-4 h-4 text-[hsl(var(--tc-green))]" />
                        <p className="text-sm font-semibold">Ajouter depuis la liste d'utilisateurs</p>
                      </div>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un nom ou email"
                        className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none"
                      />
                      <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto">
                        {profiles.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Aucun utilisateur trouvé ou déjà membre.</p>
                        ) : (
                          profiles.map((profileItem) => (
                            <div key={profileItem.id} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-3">
                              <div>
                                <p className="text-sm font-semibold">{profileItem.name}</p>
                                <p className="text-[11px] text-muted-foreground">{profileItem.email}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddMember(profileItem.id)}
                                className="rounded-full bg-[hsl(var(--tc-green))] px-3 py-2 text-[11px] font-semibold text-white"
                              >
                                Ajouter
                              </button>
                            </div>
                          )))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "requests" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Demandes en attente</h3>
                    <p className="text-[11px] text-muted-foreground">Validez les garanties ou rejetez les demandes.</p>
                  </div>
                  {pendingRequests.length === 0 ? (
                    <div className="rounded-3xl border border-border p-4 text-[11px] text-muted-foreground">Aucune demande en attente.</div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((member) => (
                        <div key={member.id} className="rounded-3xl border border-border p-4 bg-card">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{member.profiles?.name || "Membre"}</p>
                              <p className="text-[11px] text-muted-foreground">{member.profiles?.email}</p>
                            </div>
                            <div className="rounded-full bg-[hsla(38,92%,50%,0.1)] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--tc-amber))]">
                              {member.guarantee_status}
                            </div>
                          </div>
                          <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Compte Bancaire Fourni</p>
                            <p className="text-xs font-mono">{member.guarantee_proof || "Non fourni"}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveGuarantee(member.id)}
                              className="rounded-xl bg-[hsl(var(--tc-green))] px-3 py-2 text-[11px] font-semibold text-white"
                            >
                              Valider la garantie
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcludeMember(member.id)}
                              className="rounded-xl border border-[hsl(var(--tc-red))] px-3 py-2 text-[11px] font-semibold text-[hsl(var(--tc-red))]"
                            >
                              Rejeter & exclure
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "reports" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Rapports</h3>
                    <p className="text-[11px] text-muted-foreground">Téléchargez ou consultez l’historique du groupe.</p>
                  </div>
                  <div className="rounded-3xl border border-border p-4 bg-card">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl border border-border p-4">
                        <p className="text-[11px] text-muted-foreground">Membres totaux</p>
                        <p className="text-xl font-semibold">{selectedGroup?.members_count ?? 0}</p>
                      </div>
                      <div className="rounded-3xl border border-border p-4">
                        <p className="text-[11px] text-muted-foreground">Tours total</p>
                        <p className="text-xl font-semibold">{selectedGroup?.total_rounds ?? 0}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.success("Rapport généré (simulé).")}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--tc-blue))] px-4 py-3 text-sm font-semibold text-white"
                    >
                      <FileText className="w-4 h-4" /> Générer PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
