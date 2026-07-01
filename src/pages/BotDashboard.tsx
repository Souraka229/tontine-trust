import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useBotStats, useBotBtcRate, useBotRecentTontines, useBotActivity } from "@/hooks/useBotStats";
import { flashbotApi, type TontineDetail } from "@/lib/flashbotApi";
import { formatFCFA } from "@/lib/bitcoinWallet";
import {
  Bitcoin, Zap, Users, Activity, MessageCircle,
  Wallet, Clock, ChevronRight, Search, ArrowUpRight,
  TrendingUp, CircleDot, Shield,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Bitcoin; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="tc-card-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BotDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useBotStats();
  const { data: btcRate } = useBotBtcRate();
  const { data: recentTontines } = useBotRecentTontines();
  const { data: activity } = useBotActivity();
  const [searchCode, setSearchCode] = useState("");
  const [tontineDetail, setTontineDetail] = useState<TontineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const handleSearch = async () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    setDetailLoading(true);
    setDetailError("");
    setTontineDetail(null);
    try {
      const detail = await flashbotApi.getTontine(code);
      setTontineDetail(detail);
    } catch {
      setDetailError("Tontine introuvable");
    } finally {
      setDetailLoading(false);
    }
  };

  const satsFcfa = btcRate ? btcRate.sat_fcfa : 0;
  const totalSatsFcfa = stats ? (stats.total_sats_managed * satsFcfa) : 0;
  const walletFcfa = stats?.wallet_balance ? (stats.wallet_balance * satsFcfa) : 0;

  return (
    <div className="animate-fade-in pb-6 min-h-screen w-full max-w-6xl mx-auto">
      <TopBar title="Bot WhatsApp - Metrics" onBack={() => navigate(user ? "/home" : "/")} />

      <div className="px-4 space-y-6">
        {/* Connection status */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <CircleDot className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-900">
            FlashBot connecte · Lightning Network actif
          </span>
          {btcRate && (
            <span className="ml-auto text-[10px] font-mono text-emerald-700">
              1 BTC = {new Intl.NumberFormat("fr-FR").format(Math.round(btcRate.btc_fcfa))} FCFA
              <span className={`ml-1 ${btcRate.change_24h >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ({btcRate.change_24h >= 0 ? "+" : ""}{btcRate.change_24h}%)
              </span>
            </span>
          )}
        </div>

        {/* Main stats grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="tc-card-elevated p-4 h-24 animate-pulse bg-slate-100 rounded-2xl" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Zap}
              label="Sats totaux"
              value={stats.total_sats_managed.toLocaleString("fr-FR")}
              sub={totalSatsFcfa > 0 ? `~ ${formatFCFA(totalSatsFcfa)}` : undefined}
              color="bg-amber-500"
            />
            <StatCard
              icon={Users}
              label="Membres"
              value={String(stats.total_members)}
              sub={`${stats.total_payments} paiements`}
              color="bg-violet-500"
            />
            <StatCard
              icon={Activity}
              label="Tontines"
              value={String(stats.active_tontines)}
              sub={`${stats.waiting_tontines} en attente · ${stats.completed_tontines} terminees`}
              color="bg-emerald-500"
            />
            <StatCard
              icon={Wallet}
              label="Wallet Bot"
              value={stats.wallet_balance !== null ? `${stats.wallet_balance.toLocaleString("fr-FR")} sats` : "N/A"}
              sub={walletFcfa > 0 ? `~ ${formatFCFA(walletFcfa)}` : "LNbits"}
              color="bg-blue-500"
            />
          </div>
        ) : null}

        {/* Bitcoin highlight banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 tc-shadow-green">
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin className="w-6 h-6" />
            <span className="text-sm font-bold">Bitcoin Lightning = Colonne Vertebrale</span>
          </div>
          <p className="text-[12px] opacity-90 leading-relaxed">
            Chaque cotisation passe par le Lightning Network. Les membres paient en sats via des invoices LNbits.
            Pas de banque, pas d'intermediaire — juste Bitcoin.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">Paiements</p>
              <p className="text-sm font-bold">{stats?.total_payments ?? 0}</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">En attente</p>
              <p className="text-sm font-bold">{stats?.pending_payments ?? 0}</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">Volume sats</p>
              <p className="text-sm font-bold">{stats?.total_sats_managed?.toLocaleString("fr-FR") ?? "0"}</p>
            </div>
          </div>
        </div>

        {/* Search tontine by code */}
        <div className="tc-card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-[hsl(var(--tc-violet))]" />
            <span className="text-sm font-semibold">Explorer une tontine</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="CODE (ex: FLASH)"
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm uppercase"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={detailLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white tc-gradient-brand disabled:opacity-50"
            >
              {detailLoading ? "..." : "Voir"}
            </button>
          </div>
          {detailError && <p className="text-xs text-red-500 mt-2">{detailError}</p>}
        </div>

        {/* Tontine detail */}
        {tontineDetail && (
          <div className="tc-card-elevated p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{tontineDetail.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Code: {tontineDetail.code} · {tontineDetail.frequency} · {tontineDetail.status}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                tontineDetail.status === "active" ? "bg-emerald-100 text-emerald-800" :
                tontineDetail.status === "waiting" ? "bg-amber-100 text-amber-800" :
                "bg-slate-100 text-slate-600"
              }`}>
                {tontineDetail.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Cotisation</p>
                <p className="text-sm font-bold">{tontineDetail.amount_sats.toLocaleString("fr-FR")} sats</p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Membres</p>
                <p className="text-sm font-bold">{tontineDetail.members.length}/{tontineDetail.max_members}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Pot total</p>
                <p className="text-sm font-bold">{tontineDetail.total_pot.toLocaleString("fr-FR")} sats</p>
              </div>
            </div>

            {/* Members */}
            <div>
              <p className="text-xs font-semibold mb-2">Membres</p>
              <div className="space-y-1">
                {tontineDetail.members.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-[11px] py-1.5 border-b border-border/50">
                    <span className="font-mono">{m.display}</span>
                    <span className="text-muted-foreground">Tour #{m.turn_order}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current round */}
            {tontineDetail.current_round_data && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold text-emerald-900 mb-2">
                  Round #{tontineDetail.current_round_data.round_number} — {tontineDetail.current_round_data.status}
                </p>
                <div className="w-full bg-emerald-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${(tontineDetail.current_round_data.paid_count / tontineDetail.current_round_data.total_members) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-emerald-700">
                  {tontineDetail.current_round_data.paid_count}/{tontineDetail.current_round_data.total_members} paiements
                </p>
                <div className="mt-2 space-y-1">
                  {tontineDetail.current_round_data.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="font-mono">{p.display}</span>
                      <span className={p.status === "paid" ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                        {p.status === "paid" ? `${p.amount_sats} sats` : "en attente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rounds history */}
            {tontineDetail.rounds_history.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">Historique des rounds</p>
                <div className="space-y-2">
                  {tontineDetail.rounds_history.map((r) => (
                    <div key={r.round_number} className="rounded-lg border border-border p-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold">Round #{r.round_number}</span>
                        <span className={`font-medium ${
                          r.status === "completed" ? "text-emerald-600" : "text-amber-600"
                        }`}>{r.status}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.payments.map((p, i) => (
                          <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${
                            p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {p.display} {p.status === "paid" ? `${p.amount_sats}s` : "..."}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent tontines */}
        {recentTontines && recentTontines.length > 0 && (
          <div className="tc-card-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">Tontines recentes (WhatsApp)</span>
              </div>
            </div>
            <div className="space-y-2">
              {recentTontines.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => { setSearchCode(t.code); flashbotApi.getTontine(t.code).then(setTontineDetail).catch(() => {}); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.code} · {t.member_count}/{t.max_members} membres · {t.amount_sats.toLocaleString("fr-FR")} sats
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      t.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      t.status === "waiting" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {t.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity feed */}
        {activity && activity.length > 0 && (
          <div className="tc-card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold">Activite Lightning recente</span>
            </div>
            <div className="space-y-1.5">
              {activity.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="font-mono">{e.display}</span>
                    <span className="text-muted-foreground">→ {e.tontine_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-600">{e.amount_sats.toLocaleString("fr-FR")} sats</span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Architecture */}
        <div className="tc-card-elevated p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Architecture HACKBIT</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: MessageCircle, title: "Bot WhatsApp", desc: "Canal principal · CREER, REJOINDRE, PAYER" },
              { icon: Bitcoin, title: "Lightning Network", desc: "LNbits · invoices · paiements reels" },
              { icon: Shield, title: "On-chain proofs", desc: "secp256k1 · ancrage Bitcoin" },
              { icon: Wallet, title: "Fiat on-ramp", desc: "KKiapay MoMo → sats" },
            ].map((item) => (
              <div key={item.title} className="flex gap-2 items-start">
                <item.icon className="w-4 h-4 text-[hsl(var(--tc-violet))] shrink-0" />
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
