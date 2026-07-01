import { useNavigate } from "react-router-dom";
import { Bell, Bitcoin, Lock, MessageCircle, Plus, Search, Users, Wallet, Zap, Activity, TrendingUp } from "lucide-react";
import TCAvatar from "@/components/ui/tc-avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import BitcoinTreasuryStrip from "@/components/bitcoin/BitcoinTreasuryStrip";
import { openWhatsAppBot, isWhatsAppBotConfigured } from "@/lib/whatsappLink";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { runTontineAutomation } from "@/lib/tontineAutomation";
import { useBotStats, useBotBtcRate, useBotActivity } from "@/hooks/useBotStats";
import { formatFCFA } from "@/lib/bitcoinWallet";

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

export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLate, setHasLate] = useState(false);
  const { data: botStats } = useBotStats();
  const { data: btcRate } = useBotBtcRate();
  const { data: activity } = useBotActivity();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
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
      const { data: lateRows } = await supabase
        .from("group_members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("status", "late")
        .limit(1);
      if (!cancelled) setHasLate((lateRows?.length ?? 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const firstName = profile?.name?.split(" ")[0] ?? "Membre";
  const satsFcfa = btcRate ? btcRate.sat_fcfa : 0;

  return (
    <div className="animate-fade-in w-full">
      <div className="flex items-center justify-between mb-6 pt-2 md:pt-0">
        <div>
          <p className="text-xs text-muted-foreground">Tableau de bord HACKBIT</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[hsl(var(--tc-ink))]">
            Bonjour, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/profil")}
            className="w-9 h-9 rounded-full bg-[hsla(243,100%,68%,0.12)] border border-[hsl(var(--tc-border))] flex items-center justify-center text-[10px] font-bold"
          >
            {profile?.initials?.slice(0, 2) || "?"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative w-9 h-9 rounded-full border border-[hsl(var(--tc-border))] flex items-center justify-center hover:bg-[hsl(var(--tc-mist))]"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[hsl(var(--tc-red))] text-[8px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {hasLate && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs font-medium flex-1">Cotisation en retard</p>
          <button type="button" onClick={() => navigate("/cotiser")} className="text-xs font-bold text-red-700 underline">
            Payer
          </button>
        </div>
      )}

      {/* Bitcoin-first hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 mb-6 tc-shadow-green">
        <div className="flex items-center gap-2 mb-2">
          <Bitcoin className="w-6 h-6" />
          <span className="text-sm font-bold">Bitcoin Lightning — Tontine sans intermediaire</span>
        </div>
        {btcRate && (
          <p className="text-2xl font-bold tabular-nums">
            1 BTC = {new Intl.NumberFormat("fr-FR").format(Math.round(btcRate.btc_fcfa))} FCFA
            <span className={`text-sm ml-2 ${btcRate.change_24h >= 0 ? "text-white/80" : "text-red-200"}`}>
              {btcRate.change_24h >= 0 ? "+" : ""}{btcRate.change_24h}%
            </span>
          </p>
        )}
        {botStats && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">Volume</p>
              <p className="text-sm font-bold">{botStats.total_sats_managed.toLocaleString("fr-FR")} sats</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">Paiements</p>
              <p className="text-sm font-bold">{botStats.total_payments}</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center">
              <p className="text-[10px] opacity-75">Wallet</p>
              <p className="text-sm font-bold">{botStats.wallet_balance?.toLocaleString("fr-FR") ?? "—"} sats</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate("/portefeuille")}
          className="tc-card-elevated p-5 text-left hover:-translate-y-0.5 transition-transform"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Solde FCFA</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold tabular-nums text-[hsl(var(--tc-ink))]">
            {formatFCFA(profile?.wallet_balance ?? 0).replace(" FCFA", "")}
          </p>
        </button>
        <div className="lg:col-span-2">
          <BitcoinTreasuryStrip profileId={user?.id} variant="card" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        {[
          { label: "Cotiser", icon: Plus, to: "/cotiser", primary: true },
          { label: "Tresor BTC", icon: Bitcoin, to: "/crypto" },
          { label: "Bot Metrics", icon: Activity, to: "/bot-dashboard" },
          isWhatsAppBotConfigured()
            ? { label: "WhatsApp", icon: MessageCircle, action: () => openWhatsAppBot("/solde") }
            : { label: "WhatsApp", icon: MessageCircle, to: "/whatsapp" },
        ].map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => ("action" in a && a.action ? a.action() : navigate(a.to!))}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold ${
              a.primary ? "tc-btn-primary !min-h-0 !py-3" : "border border-[hsl(var(--tc-border))] bg-card hover:bg-[hsl(var(--tc-mist))]"
            }`}
          >
            <a.icon className="w-4 h-4" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Live Lightning activity */}
      {activity && activity.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Activite Lightning</h2>
            </div>
            <button type="button" onClick={() => navigate("/bot-dashboard")} className="text-xs font-semibold text-[hsl(var(--tc-violet))]">
              Voir tout
            </button>
          </div>
          <div className="tc-card-elevated p-3 space-y-1.5">
            {activity.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="font-mono">{e.display}</span>
                  <span className="text-muted-foreground">{e.tontine_name}</span>
                </div>
                <span className="font-semibold text-emerald-600">{e.amount_sats.toLocaleString("fr-FR")} sats</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Mes groupes</h2>
          <button type="button" onClick={() => navigate("/rechercher")} className="text-xs font-semibold text-[hsl(var(--tc-violet))]">
            Explorer
          </button>
        </div>
        {groups.length === 0 ? (
          <div className="tc-card-elevated text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Aucun groupe</p>
            <div className="flex gap-2 justify-center mt-4">
              <button type="button" onClick={() => navigate("/rechercher")} className="tc-btn-secondary text-xs !py-2">Rejoindre</button>
              <button type="button" onClick={() => navigate("/creer")} className="tc-btn-primary text-xs !py-2">Creer</button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {groups.map((g) => (
              <button key={g.id} onClick={() => navigate(`/groupe/${g.id}`)} className="tc-card-elevated p-4 text-left">
                <div className="flex items-center gap-2.5 mb-2">
                  <TCAvatar initials={g.initials} color={g.color} />
                  <p className="text-sm font-semibold truncate">{g.name}</p>
                </div>
                <ProgressBar value={(g.current_round / g.total_rounds) * 100} color={g.color} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="tc-card-elevated p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Architecture HACKBIT</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: Bitcoin, title: "Bitcoin Lightning", desc: "LNbits · paiements reels en sats" },
              { icon: MessageCircle, title: "Bot WhatsApp", desc: "Canal principal · CREER, REJOINDRE, PAYER" },
              { icon: Wallet, title: "Fiat on-ramp", desc: "KKiapay MoMo → conversion sats" },
              { icon: TrendingUp, title: "Dashboard live", desc: "Metrics en temps reel du bot" },
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
      </section>
    </div>
  );
}
