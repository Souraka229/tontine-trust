import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { initPayment } from "@/lib/kkiapay";
import PhoneInput from "@/components/ui/PhoneInput";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Wallet, History, Check, ShieldCheck, Lock } from "lucide-react";

interface WalletTransaction {
  id: string;
  name: string;
  amount: number;
  type: string;
  kkiapay_status?: string;
  provider?: string;
  created_at: string;
}

export default function Portefeuille() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  
  const [tab, setTab] = useState<"historique" | "depot" | "retrait">("historique");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [operator, setOperator] = useState("MTN");
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [hasLate, setHasLate] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setTransactions(data);
  }, [user]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    fetchTransactions();
    // Check for late contributions
    if (user) {
      supabase
        .from("group_members")
        .select("id")
        .eq("profile_id", user.id)
        .eq("status", "late")
        .limit(1)
        .then(({ data }) => setHasLate((data?.length ?? 0) > 0));
    }
  }, [fetchTransactions, profile, user]);

  const handleTransaction = async (type: "deposit" | "withdrawal") => {
    const amt = parseInt(amount);
    if (!amt || amt < 100) {
      toast.error("Montant invalide (min 100 FCFA)");
      return;
    }
    if (type === "withdrawal" && hasLate) {
      toast.error("Compte suspendu : régularisez vos cotisations en retard d'abord");
      return;
    }
    if (type === "withdrawal" && profile && amt > profile.wallet_balance) {
      toast.error("Solde insuffisant");
      return;
    }

    setStep("processing");

    if (type === "deposit") {
      // Dépôt : on utilise Kkiapay (simulé en test)
      const res = await initPayment({
        amount: amt,
        customer_phone: phone,
        profile_id: user!.id,
        transaction_type: "deposit",
        transaction_name: "Rechargement Portefeuille",
        operator,
      });

      if (res.success) {
        await refreshProfile();
        await fetchTransactions();
        setStep("success");
      } else {
        toast.error(res.message);
        setStep("form");
      }
    } else {
      // Retrait : on insère juste la demande de retrait qui devrait être validée par un admin
      // Pour la démo, le trigger le déduit automatiquement.
      await supabase.from("transactions").insert({
        profile_id: user!.id,
        type: "withdrawal",
        name: "Retrait vers Mobile Money",
        amount: -amt,
        kkiapay_status: "simulated_success",
        customer_phone: phone,
      });
      await refreshProfile();
      await fetchTransactions();
      setStep("success");
    }
  };

  if (step === "processing") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background tc-grid-bg">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--tc-green))] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-bold tracking-tight mb-1">Traitement en cours</p>
        <p className="text-[10px] text-muted-foreground">Vérification du paiement Kkiapay</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.12)] flex items-center justify-center mb-6 animate-check-bounce">
          <Check className="w-10 h-10 text-[hsl(var(--tc-green))]" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Opération réussie !</h2>
        <p className="text-sm text-muted-foreground mb-8">Votre solde a été mis à jour.</p>
        <button onClick={() => { setStep("form"); setTab("historique"); }} className="w-full py-3.5 rounded-xl font-bold text-white tc-gradient-green">
          Retour au portefeuille
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Portefeuille" backTo="/home" backLabel="Accueil" />

      {/* Bannière compte suspendu */}
      {hasLate && (
        <div className="mx-4 mt-3 mb-1 p-3 rounded-xl bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.3)]">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[hsl(var(--tc-red))] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[hsl(var(--tc-red))] mb-0.5">Compte suspendu</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Vous avez des cotisations en <strong>retard</strong> dans un ou plusieurs groupes.
                Les retraits sont bloqués jusqu’à régularisation. Cotisez maintenant pour débloquer.
              </p>
              <button
                onClick={() => navigate("/cotiser")}
                className="mt-2 text-[10px] font-bold text-[hsl(var(--tc-red))] underline"
              >
                → Régulariser mes cotisations
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-br from-[hsl(var(--tc-green))] to-[hsl(160,40%,26%)] rounded-2xl p-4 text-white shadow-xl mb-6 relative overflow-hidden border border-white/10">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[10px] font-medium text-white/75 text-center uppercase tracking-wider mb-3">Solde Disponible</p>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-white/70 mb-1.5">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <p className="text-3xl font-bold tabular-nums leading-tight">
              {new Intl.NumberFormat("fr-FR").format(Number(profile?.wallet_balance ?? 0))}
            </p>
            <p className="text-xs text-white/60 mt-1">FCFA</p>
          </div>
          <p className="text-[10px] text-white/55 text-center mt-3">Soldes mis à jour à l’ouverture de cette page</p>
        </div>

        {/* Actions Tabs */}
        <div className="flex bg-card border border-border p-1 rounded-xl mb-6">
          <button onClick={() => setTab("historique")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === "historique" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
            Historique
          </button>
          <button onClick={() => setTab("depot")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === "depot" ? "bg-background shadow text-[hsl(var(--tc-green))]" : "text-muted-foreground"}`}>
            Déposer
          </button>
          <button onClick={() => setTab("retrait")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === "retrait" ? "bg-background shadow text-[hsl(var(--tc-amber))]" : "text-muted-foreground"}`}>
            {hasLate ? "Retirer (bloqué)" : "Retirer"}
          </button>
        </div>

        {tab === "historique" && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-10">
                <History className="w-10 h-10 mx-auto text-muted mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">Aucune transaction pour le moment.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-card border border-border rounded-xl p-3 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? "bg-[hsla(160,84%,39%,0.1)] text-[hsl(var(--tc-green))]" : "bg-[hsla(0,84%,60%,0.1)] text-[hsl(var(--tc-red))]"}`}>
                        {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{tx.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${tx.amount > 0 ? "text-[hsl(var(--tc-green))]" : "text-[hsl(var(--tc-red))]"}`}>
                      {tx.amount > 0 ? "+" : ""}{new Intl.NumberFormat("fr-FR").format(tx.amount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-[hsl(var(--tc-green))]" />
                      <span className="text-[9px] font-mono-tech text-muted-foreground">TxHash: 0x{tx.id.substring(0, 8)}...{tx.id.substring(tx.id.length - 4)}</span>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-tight">Sûr</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab !== "historique" && (
          <div className="animate-fade-in space-y-4">
            {tab === "depot" && (
              <p className="text-[10px] text-muted-foreground leading-relaxed rounded-lg bg-muted/50 border border-border/70 px-3 py-2">
                Les dépôts effectués ici augmentent votre portefeuille. Un paiement direct pour cotiser (Mobile Money) n’augmente pas ce solde : il alimente uniquement la cagnotte du groupe.
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Montant (FCFA)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-lg font-bold outline-none focus:border-[hsl(var(--tc-green))] transition-colors"
              />
            </div>

            <PhoneInput label="Numéro Mobile Money" value={phone} onChange={setPhone} placeholder="01 XX XX XX XX" />
            
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Opérateur</label>
              <div className="flex gap-2">
                {["MTN", "MOOV", "CELTIIS"].map(op => (
                  <button key={op} onClick={() => setOperator(op)} className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 ${operator === op ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.06)] text-[hsl(var(--tc-green))]" : "border-border bg-card text-muted-foreground"}`}>
                    {op}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleTransaction(tab === "depot" ? "deposit" : "withdrawal")}
              className="w-full py-4 mt-4 rounded-xl text-sm font-bold text-white tc-gradient-green tc-shadow-green flex items-center justify-center gap-2"
            >
              {tab === "depot" ? <><ArrowDownLeft className="w-5 h-5" /> Confirmer le dépôt</> : <><ArrowUpRight className="w-5 h-5" /> Confirmer le retrait</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
