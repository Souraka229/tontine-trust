import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import BitcoinLiveCard from "@/components/crypto/BitcoinLiveCard";
import BitcoinTreasuryOnChain from "@/components/crypto/BitcoinTreasuryOnChain";
import LightningDepositCard from "@/components/crypto/LightningDepositCard";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc, fcfaToBtc } from "@/lib/bitcoin";
import { describeTreasuryRole } from "@/lib/bitcoinTreasury";
import {
  buyBtcWithFcfa,
  fetchBtcPool,
  fetchBtcWallet,
  fetchLedger,
  fetchMyCommitments,
  linkBtcWallet,
  recordBitcoinCommitment,
  stakeBtcSats,
  type CommitmentRecord,
} from "@/lib/bitcoinRepository";
import {
  emptyPool,
  formatFCFA,
  shortenBtcAddress,
  fcfaToSatsRate,
  type BtcLiquidityPool,
  type BtcLedgerEntry,
  type BtcWallet,
} from "@/lib/bitcoinWallet";
import {
  generateCommitmentText,
  hashCommitment,
  signCommitment,
  verifyStoredCommitment,
} from "@/lib/bitcoinProof";
import {
  Wallet,
  ArrowLeftRight,
  Lock,
  Copy,
  Check,
  Shield,
  Bitcoin,
  Zap,
  Info,
} from "lucide-react";

export default function CryptoLiquidity() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState<BtcWallet | null>(null);
  const [pool, setPool] = useState<BtcLiquidityPool>(emptyPool());
  const [ledger, setLedger] = useState<BtcLedgerEntry[]>([]);
  const [buyFcfa, setBuyFcfa] = useState("50000");
  const [stakeSatsInput, setStakeSatsInput] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const [myCommitments, setMyCommitments] = useState<CommitmentRecord[]>([]);
  const { data: btcMarket } = useBitcoinPrice();

  const reload = async (profileId: string) => {
    const [p, w, l, c] = await Promise.all([
      fetchBtcPool(),
      fetchBtcWallet(profileId),
      fetchLedger(profileId),
      fetchMyCommitments(profileId),
    ]);
    setPool(p);
    setWallet(w);
    setLedger(l);
    setMyCommitments(c);
  };

  useEffect(() => {
    fetchBtcPool().then(setPool).catch(() => setPool(emptyPool()));
    if (user?.id) void reload(user.id);
  }, [user?.id]);

  const handleConnect = async () => {
    if (!user) {
      toast.error("Connectez-vous pour lier votre registre Bitcoin");
      navigate("/connexion");
      return;
    }
    try {
      const w = await linkBtcWallet();
      setWallet(w);
      toast.success("Registre membre lié — opérations via Supabase (btc_ledger)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec liaison registre");
    }
  };

  const handleBuySats = async () => {
    if (!user || !btcMarket) return;
    setLoading(true);
    try {
      const fcfa = parseFloat(buyFcfa);
      if (!fcfa || fcfa < 100) throw new Error("Montant minimum 100 FCFA");
      const idempotencyKey = `buy-${user.id}-${Date.now()}`;
      const result = await buyBtcWithFcfa(fcfa, btcMarket.priceXof, idempotencyKey);
      await refreshProfile();
      await reload(user.id);
      setPool(await fetchBtcPool());
      toast.success(`${result.fcfa.toLocaleString("fr-FR")} FCFA → ${result.sats.toLocaleString("fr-FR")} sats (ledger)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur achat sats");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!user || !btcMarket || !wallet) return;
    setLoading(true);
    try {
      const sats = parseInt(stakeSatsInput, 10);
      if (!sats || sats <= 0) throw new Error("Montant sats invalide");
      const idempotencyKey = `stake-${user.id}-${Date.now()}`;
      const result = await stakeBtcSats(sats, btcMarket.priceXof, idempotencyKey);
      await reload(user.id);
      setPool(await fetchBtcPool());
      toast.success(`${result.staked_sats.toLocaleString("fr-FR")} sats stakés · ≈ ${formatFCFA(result.fcfa_equiv)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur stake");
    } finally {
      setLoading(false);
    }
  };

  const handleAnchorProof = async () => {
    if (!wallet || !user) return;
    setLoading(true);
    try {
      const name = profile?.name ?? user.email?.split("@")[0] ?? "Membre";
      const text = generateCommitmentText("treasury", name, pool.tvlFcfa);
      const hash = hashCommitment(text);
      const { signature, pubkeyHint } = await signCommitment(hash);
      const valid = await verifyStoredCommitment(hash, signature, pubkeyHint);
      if (!valid) throw new Error("Vérification secp256k1 échouée");

      setProofId(`${hash.slice(0, 18)}… · vérifié`);
      await recordBitcoinCommitment({
        commitment_text: text,
        document_hash: hash,
        signature,
        pubkey_hint: pubkeyHint,
        profile_id: user.id,
        amount_fcfa: pool.tvlFcfa,
      });
      setMyCommitments(await fetchMyCommitments(user.id));
      toast.success("Engagement secp256k1 signé et enregistré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec signature");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewSats =
    btcMarket && buyFcfa
      ? Math.floor(parseFloat(buyFcfa || "0") * fcfaToSatsRate(btcMarket.priceXof))
      : 0;

  return (
    <div className="animate-fade-in pb-6 min-h-screen w-full max-w-5xl mx-auto">
      <TopBar title="Trésor Bitcoin" onBack={() => navigate(user ? "/home" : "/")} />

      <div className="px-4 space-y-4">
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 flex gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-950 leading-relaxed">{describeTreasuryRole()}</p>
        </div>

        <BitcoinLiveCard fcfaAmount={pool.tvlFcfa} />

        <div className="rounded-2xl tc-gradient-brand text-white p-5 tc-shadow-green">
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="w-5 h-5" />
            <span className="text-xs font-medium opacity-90">Trésor · Lightning + on-chain + registre</span>
          </div>
          <p className="text-2xl font-bold">{formatFCFA(pool.tvlFcfa)}</p>
          <p className="text-[11px] opacity-75 mt-1">
            {pool.btcReserve.toFixed(6)} BTC comptable · {pool.apy}% APY · {pool.contributors} contributeurs
            {(pool.lnSats ?? 0) > 0 && ` · ${(pool.lnSats ?? 0).toLocaleString("fr-FR")} sats LN`}
          </p>
          {btcMarket && (
            <p className="text-xs opacity-90 mt-2">
              ≈ {formatBtc(fcfaToBtc(pool.tvlFcfa, btcMarket.priceXof))} au cours CoinGecko
            </p>
          )}
        </div>

        <LightningDepositCard
          pool={pool}
          profileId={user?.id}
          onPaid={() => void fetchBtcPool().then(setPool)}
        />

        <BitcoinTreasuryOnChain pool={pool} onSynced={() => void fetchBtcPool().then(setPool)} />

        {!user ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Connectez-vous pour acheter des sats et staker dans le trésor.</p>
            <button type="button" onClick={() => navigate("/connexion")} className="px-4 py-2 rounded-xl text-sm font-semibold text-white tc-gradient-brand">
              Se connecter
            </button>
          </div>
        ) : !wallet ? (
          <button
            type="button"
            onClick={handleConnect}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-amber-400/50 flex flex-col items-center gap-2 hover:bg-amber-50 transition-colors"
          >
            <Wallet className="w-8 h-8 text-amber-600" />
            <span className="text-sm font-semibold">Lier mon registre membre</span>
            <span className="text-[10px] text-muted-foreground text-center px-4">
              Identifiant interne · opérations journalisées dans btc_ledger
            </span>
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Mon registre sats</span>
              <button type="button" onClick={copyAddress} className="flex items-center gap-1 text-[10px] font-mono">
                {shortenBtcAddress(wallet.address)}
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[10px] text-muted-foreground">Sats disponibles</p>
                <p className="text-sm font-bold">{wallet.sats.toLocaleString("fr-FR")}</p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-[10px] text-muted-foreground">Stakés (trésor)</p>
                <p className="text-sm font-bold">{wallet.stakedSats.toLocaleString("fr-FR")}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Solde FCFA disponible : {formatFCFA(profile?.wallet_balance ?? 0)}
            </p>
          </div>
        )}

        {user && wallet && btcMarket && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold">Convertir FCFA → sats</span>
              </div>
              <input
                type="number"
                value={buyFcfa}
                onChange={(e) => setBuyFcfa(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm mb-2"
              />
              {previewSats > 0 && (
                <p className="text-[10px] text-muted-foreground mb-3">≈ {previewSats.toLocaleString("fr-FR")} sats · débit portefeuille FCFA</p>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleBuySats}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50"
              >
                Acheter au cours {formatFCFA(btcMarket.priceXof)}/BTC
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-[hsl(var(--tc-brand))]" />
                <span className="text-sm font-semibold">Staker dans le trésor</span>
              </div>
              <input
                type="number"
                value={stakeSatsInput}
                onChange={(e) => setStakeSatsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm mb-3"
              />
              <button
                type="button"
                disabled={loading}
                onClick={handleStake}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white tc-gradient-brand disabled:opacity-50"
              >
                Staker · {pool.apy}% APY estimé
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[hsl(var(--tc-brand))]" />
                <span className="text-sm font-semibold">Engagement ECDSA (secp256k1)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Courbe secp256k1 (famille Bitcoin) · enregistré dans bitcoin_commitments.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleAnchorProof}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-violet-300 text-[hsl(var(--tc-brand))] hover:bg-violet-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {loading ? "Signature…" : "Signer et vérifier"}
              </button>
              {proofId && <p className="text-[10px] text-emerald-700 mt-2 font-mono break-all">{proofId}</p>}
              {myCommitments.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-2">
                  {myCommitments.map((c) => (
                    <li key={c.id ?? c.document_hash} className="text-[10px] font-mono text-muted-foreground truncate">
                      {c.document_hash?.slice(0, 24)}… · {c.amount_fcfa ? formatFCFA(c.amount_fcfa) : "—"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {ledger.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold mb-2">Journal btc_ledger</p>
                <ul className="space-y-2">
                  {ledger.map((row) => (
                    <li key={row.id} className="flex justify-between text-[10px] border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">{row.entry_type}</span>
                      <span className="font-mono">+{row.sats_delta.toLocaleString("fr-FR")} sats</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
