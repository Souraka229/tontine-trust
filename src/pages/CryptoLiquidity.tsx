import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import BitcoinLiveCard from "@/components/crypto/BitcoinLiveCard";
import BitcoinTreasuryOnChain from "@/components/crypto/BitcoinTreasuryOnChain";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { formatBtc, fcfaToBtc } from "@/lib/bitcoin";
import { describeTreasuryRole } from "@/lib/bitcoinTreasury";
import {
  connectAndPersistWallet,
  fetchGroupCommitments,
  loadBtcWallet,
  persistBtcPool,
  persistBtcWallet,
  recordBitcoinCommitment,
  syncBtcPool,
  type CommitmentRecord,
} from "@/lib/bitcoinRepository";
import { supabase } from "@/lib/supabase";
import {
  getBtcPool,
  getBtcWallet,
  buySatsWithFcfa,
  stakeSats,
  formatFCFA,
  shortenBtcAddress,
  fcfaToSatsRate,
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
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState(getBtcWallet());
  const [pool, setPool] = useState(getBtcPool());
  const [buyFcfa, setBuyFcfa] = useState("50000");
  const [stakeSatsInput, setStakeSatsInput] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const [myCommitments, setMyCommitments] = useState<CommitmentRecord[]>([]);
  const { data: btcMarket } = useBitcoinPrice();

  useEffect(() => {
    syncBtcPool().then(setPool);
    if (user?.id) {
      loadBtcWallet(user.id).then((w) => w && setWallet(w));
      fetchGroupCommitments("").then(() => undefined);
      supabaseCommitments(user.id).then(setMyCommitments);
    }
  }, [user?.id]);

  async function supabaseCommitments(profileId: string) {
    const { data } = await supabase
      .from("bitcoin_commitments")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(5);
    return (data ?? []) as CommitmentRecord[];
  }

  const refreshPool = async () => {
    const p = await syncBtcPool();
    setPool(p);
    await persistBtcPool(p);
  };

  const handleConnect = async () => {
    const w = await connectAndPersistWallet(user?.id);
    setWallet(w);
    toast.success("Portefeuille membre lié — registre Supabase synchronisé");
  };

  const handleBuySats = async () => {
    if (!wallet || !btcMarket) return;
    try {
      const fcfa = parseFloat(buyFcfa);
      const rate = fcfaToSatsRate(btcMarket.priceXof);
      const w = buySatsWithFcfa({ ...wallet }, fcfa, rate, btcMarket.priceXof);
      setWallet({ ...w });
      await refreshPool();
      if (user?.id) await persistBtcWallet(user.id, w);
      toast.success(`${fcfa.toLocaleString("fr-FR")} FCFA → sats au cours CoinGecko`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur achat sats");
    }
  };

  const handleStake = async () => {
    if (!wallet || !btcMarket) return;
    try {
      const sats = parseInt(stakeSatsInput, 10);
      const w = stakeSats({ ...wallet }, sats, btcMarket.priceXof);
      setWallet({ ...w });
      await refreshPool();
      if (user?.id) await persistBtcWallet(user.id, w);
      toast.success(`${sats.toLocaleString("fr-FR")} sats ajoutés au trésor collectif`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur stake");
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

      setProofId(`${hash.slice(0, 18)}… · vérifié ✓`);
      await recordBitcoinCommitment({
        commitment_text: text,
        document_hash: hash,
        signature,
        pubkey_hint: pubkeyHint,
        profile_id: user.id,
        amount_fcfa: pool.tvlFcfa,
      });
      setMyCommitments(await supabaseCommitments(user.id));
      toast.success("Engagement secp256k1 signé et vérifié");
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

  return (
    <div className="animate-fade-in pb-6 min-h-screen max-w-3xl mx-auto w-full">
      <TopBar title="Trésor Bitcoin" onBack={() => navigate("/")} />

      <div className="px-4 space-y-4">
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 flex gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-950 leading-relaxed">{describeTreasuryRole()}</p>
        </div>

        <BitcoinLiveCard fcfaAmount={pool.tvlFcfa} />

        <div className="rounded-2xl tc-gradient-brand text-white p-5 tc-shadow-green">
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="w-5 h-5" />
            <span className="text-xs font-medium opacity-90">Trésor collectif indexé BTC</span>
          </div>
          <p className="text-2xl font-bold">{formatFCFA(pool.tvlFcfa)}</p>
          <p className="text-[11px] opacity-75 mt-1">
            {pool.btcReserve.toFixed(6)} BTC (registre) · {pool.apy}% APY · {pool.contributors} contributeurs
          </p>
          {btcMarket && (
            <p className="text-xs opacity-90 mt-2">
              ≈ {formatBtc(fcfaToBtc(pool.tvlFcfa, btcMarket.priceXof))} au cours CoinGecko
            </p>
          )}
        </div>

        <BitcoinTreasuryOnChain pool={pool} onSynced={() => void refreshPool()} />

        {!wallet ? (
          <button
            type="button"
            onClick={handleConnect}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-amber-400/50 flex flex-col items-center gap-2 hover:bg-amber-50 transition-colors"
          >
            <Wallet className="w-8 h-8 text-amber-600" />
            <span className="text-sm font-semibold">Lier mon portefeuille membre</span>
            <span className="text-[10px] text-muted-foreground text-center px-4">
              Registre interne synchronisé Supabase · conversions au cours live
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
          </div>
        )}

        {wallet && btcMarket && (
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
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm mb-3"
              />
              <button
                type="button"
                onClick={handleBuySats}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500"
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
              <button type="button" onClick={handleStake} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white tc-gradient-brand">
                Staker · {pool.apy}% APY estimé
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[hsl(var(--tc-brand))]" />
                <span className="text-sm font-semibold">Preuve secp256k1 (courbe Bitcoin)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Signature cryptographique vérifiable — ancrage OpenTimestamps prévu en phase 2 prod.
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
          </>
        )}
      </div>
    </div>
  );
}
