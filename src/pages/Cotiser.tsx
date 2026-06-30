import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { payFromWallet, KkiapayResponse } from "@/lib/kkiapay";
import PhoneInput from "@/components/ui/PhoneInput";
import { toast } from "sonner";
import { runTontineAutomation } from "@/lib/tontineAutomation";
import KkiapayWidget from "@/components/ui/KkiapayWidget";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { isConvexConfigured } from "@/lib/convex";

const OPERATORS = [
  { id: "mtn", name: "MTN MoMo", shortName: "MTN", color: "#FFA500", textColor: "#fff" },
  { id: "moov", name: "Moov Money", shortName: "Moov", color: "#003B8C", textColor: "#fff" },
  { id: "celtiis", name: "Celtiis Cash", shortName: "Celtiis", color: "#FF4500", textColor: "#fff" },
  { id: "wallet", name: "Portefeuille Tontine", shortName: "Wallet", color: "#10B981", textColor: "#fff" },
];

interface Group { 
  id: string; 
  name: string; 
  contribution_amount: number; 
}

type PayStep = "form" | "confirm" | "processing" | "done" | "error";

export default function Cotiser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupIdFromUrl = searchParams.get("group");
  const appliedGroupFromUrl = useRef(false);
  const { user, profile, refreshProfile } = useAuth();
  const [operator, setOperator] = useState("mtn");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [step, setStep] = useState<PayStep>("form");
  const [payResult, setPayResult] = useState<KkiapayResponse | null>(null);
  const [showKkiapayWidget, setShowKkiapayWidget] = useState(false);
  const convexGroups = useQuery(api.tontines.listMyGroups, isConvexConfigured && user ? {} : "skip");
  const currentRound = useQuery(
    api.tontines.currentRoundForGroup,
    isConvexConfigured && selectedGroup && !selectedGroup.id.includes("-") ? { groupId: selectedGroup.id } : "skip"
  );
  const payConvexWallet = useMutation(api.payments.payContributionFromWallet);
  const createConvexRequest = useMutation(api.payments.createContributionRequest);
  const verifyConvexPayment = useAction(api.paymentActions.verifyKkiapayAndSettle);

  useEffect(() => {
    if (convexGroups) {
      const activeGroups = convexGroups
        .filter((group) => group.status === "active")
        .map((group) => ({
          id: group.id,
          name: group.name,
          contribution_amount: group.contributionAmount,
        }));
      setGroups(activeGroups);
      if (activeGroups.length > 0) {
        const fromUrl = groupIdFromUrl && activeGroups.find((g) => g.id === groupIdFromUrl);
        setSelectedGroup(fromUrl ?? activeGroups[0]);
      }
      return;
    }
    if (isConvexConfigured) return;
    console.log("Cotiser useEffect triggered, user:", user);
    
    if (!user) {
      console.log("No user found, returning");
      return;
    }
    
    console.log("Loading groups for user:", user.id);
    
    // D'abord vérifier les memberships
    supabase
      .from("group_members")
      .select("*")
      .eq("profile_id", user.id)
      .then(({ data: members, error }) => {
        console.log("Supabase response - members:", members, "error:", error);
        
        if (error) {
          console.error("Error fetching memberships:", error);
          setGroups([]);
          return;
        }
        
        if (!members || members.length === 0) {
          console.log("No memberships found");
          setGroups([]);
          return;
        }
        
        // Ensuite charger les détails des groupes
        const groupIds = members.map(m => m.group_id);
        console.log("Group IDs to fetch:", groupIds);
        
        return supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .eq("status", "active");
      })
      .then(({ data: groups, error }) => {
        console.log("Supabase response - groups:", groups, "error:", error);
        
        if (error) {
          console.error("Error fetching groups:", error);
          setGroups([]);
          return;
        }
        
        console.log("Active groups:", groups);
        const list = groups || [];
        setGroups(list);
        if (list.length > 0) {
          const fromUrl = groupIdFromUrl && list.find((g) => g.id === groupIdFromUrl);
          setSelectedGroup(fromUrl ?? list[0]);
          if (fromUrl && !appliedGroupFromUrl.current) {
            appliedGroupFromUrl.current = true;
            toast.info(`Groupe « ${fromUrl.name} » sélectionné`);
          }
        }
      })
      .catch(error => {
        console.error("Unexpected error loading groups:", error);
        setGroups([]);
      });
  }, [convexGroups, groupIdFromUrl, user]);

  useEffect(() => { if (profile?.phone) setPhone(profile.phone); }, [profile]);

  const fees = 20;
  const total = (selectedGroup?.contribution_amount || 0) + fees;

  const handleConfirm = async () => {
    console.log("🔥 handleConfirm appelé");
    console.log("🔥 operator:", operator);
    console.log("🔥 user:", user);
    console.log("🔥 selectedGroup:", selectedGroup);
    console.log("🔥 phone:", phone);
    
    const needPhone = operator !== "wallet";
    const digits = phone.replace(/\D/g, "");
    
    if (!user || !selectedGroup) {
      console.log("❌ Pas d'utilisateur ou de groupe");
      toast.error("Sélectionnez un groupe");
      return;
    }
    if (needPhone && digits.length < 8) {
      console.log("❌ Numéro invalide:", digits.length);
      toast.error("Numéro de téléphone invalide");
      return;
    }

    if (operator === "wallet") {
      console.log("💳 Paiement portefeuille");
      setStep("processing");
      if (isConvexConfigured && selectedGroup.id && !selectedGroup.id.includes("-")) {
        if (!currentRound) {
          toast.error("Aucun tour actif pour ce groupe.");
          setStep("form");
          return;
        }
        try {
          await payConvexWallet({
            groupId: selectedGroup.id,
            roundId: currentRound.roundId,
          });
          setPayResult({
            success: true,
            transactionId: `WT-${Date.now().toString(36).toUpperCase()}`,
            status: "wallet_transfer",
            message: "Paiement via portefeuille réussi.",
          });
          setStep("done");
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Échec du paiement portefeuille");
          setStep("error");
        }
        return;
      }
      const result = await payFromWallet({
        amount: total,
        profile_id: user.id,
        group_id: selectedGroup.id,
        transaction_type: "contribution",
        transaction_name: `Cotisation — ${selectedGroup.name}`,
      });

      setPayResult(result);
      if (result.success) {
        await supabase
          .from("group_members")
          .update({ status: "paid", paid_date: new Date().toISOString() })
          .eq("group_id", selectedGroup.id)
          .eq("profile_id", user.id);

        await runTontineAutomation();
        setStep("done");
      } else {
        setStep("error");
      }
    } else {
      if (isConvexConfigured && selectedGroup.id && !selectedGroup.id.includes("-")) {
        if (!currentRound) {
          toast.error("Aucun tour actif pour ce groupe.");
          return;
        }
        setStep("processing");
        try {
          const paymentRequestId = await createConvexRequest({
            groupId: selectedGroup.id,
            roundId: currentRound.roundId,
            amount: selectedGroup.contribution_amount,
            customerPhone: digits,
            operator,
          });
          const result = await verifyConvexPayment({
            paymentRequestId,
            transactionId: `KK-DEMO-${Date.now().toString(36).toUpperCase()}`,
          });
          setPayResult({
            success: result.success,
            transactionId: result.providerReference,
            status: result.status,
            message: result.success ? "Cotisation validée côté serveur Convex." : "Paiement refusé.",
          });
          setStep(result.success ? "done" : "error");
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Échec de la vérification du paiement");
          setStep("error");
        }
        return;
      }
      console.log("📱 Paiement mobile money - ouverture directe du widget");
      console.log("📯 Début du processus:", { step: "processing", showKkiapayWidget: true });
      // Afficher le spinner puis ouvrir le widget Kkiapay
      setStep("processing");
      setShowKkiapayWidget(true);
      console.log("📯 setShowKkiapayWidget appelé");
    }
  };

  
  const handleKkiapaySuccess = async (result: KkiapayResponse) => {
    setPayResult(result);
    setShowKkiapayWidget(false);
    
    if (result.success) {
      await supabase
        .from("group_members")
        .update({ status: "paid", paid_date: new Date().toISOString() })
        .eq("group_id", selectedGroup.id)
        .eq("profile_id", user.id);

      await runTontineAutomation();
      setStep("done");
    } else {
      setStep("error");
    }
  };

  const handleKkiapayError = () => {
    setShowKkiapayWidget(false);
    setStep("error");
  };

  // ─── ÉTAPE 1 : Formulaire ────────────────────────────────────────────────
  if (step === "form") {
    return (
      <div className="animate-slide-up">
        <TopBar title="Cotiser" backTo="/home" backLabel="Accueil" />
        <div className="px-4 pb-6">

          {/* Group selector */}
          <label className="block text-xs font-medium text-muted-foreground mb-2">Choisissez votre groupe</label>
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-4 mb-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-2">Aucun groupe actif</p>
              <p className="text-[11px] text-muted-foreground mb-3">Rejoignez un groupe pour commencer à cotiser et sécuriser votre participation.</p>
              <button onClick={() => navigate("/rechercher")} className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--tc-green))]">
                Rejoindre un groupe →
              </button>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`w-full rounded-3xl p-4 text-left transition-all border-2 shadow-sm ${
                    selectedGroup?.id === g.id
                      ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)]"
                      : "border-border bg-card hover:border-[hsl(var(--tc-green))]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Intl.NumberFormat("fr-FR").format(g.contribution_amount)} FCFA par tour</p>
                    </div>
                    {selectedGroup?.id === g.id && (
                      <div className="w-7 h-7 rounded-full bg-[hsl(var(--tc-green))] flex items-center justify-center text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Phone input */}
          <PhoneInput
            label="Numéro mobile pour le paiement"
            value={phone}
            onChange={setPhone}
            placeholder="01 XX XX XX XX"
            className="mb-4"
          />

          {/* Operator */}
          <label className="block text-xs font-medium text-muted-foreground mb-2">Mode de paiement</label>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {OPERATORS.map((op) => (
              <button
                key={op.id}
                onClick={() => setOperator(op.id)}
                className={`rounded-3xl p-3 text-xs font-semibold transition-all border-2 ${
                  operator === op.id
                    ? "border-[hsl(var(--tc-green))] bg-[hsla(160,84%,39%,0.08)] text-[hsl(var(--tc-green))]"
                    : "border-border bg-card text-muted-foreground hover:border-[hsl(var(--tc-green))]"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-2xl mx-auto mb-2 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: op.color }}
                >
                  {op.shortName}
                </div>
                {op.shortName}
              </button>
            ))}
          </div>

          {/* Summary */}
          {selectedGroup && (
            <div className="rounded-3xl border border-[hsla(160,84%,39%,0.18)] bg-[hsla(160,84%,39%,0.06)] p-4 mb-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Résumé de la cotisation</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Groupe</span>
                  <span className="text-foreground font-medium">{selectedGroup.name}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Cotisation</span>
                  <span className="text-foreground font-medium">{new Intl.NumberFormat("fr-FR").format(selectedGroup.contribution_amount)} FCFA</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Frais réseau</span>
                  <span className="text-foreground font-medium">{fees} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-[hsla(160,84%,39%,0.2)] pt-3 text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-[hsl(var(--tc-green))]">{new Intl.NumberFormat("fr-FR").format(total)} FCFA</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (!selectedGroup) { toast.error("Sélectionnez un groupe"); return; }
              if (operator === "wallet") {
                if (total > (profile?.wallet_balance || 0)) { toast.error("Solde portefeuille insuffisant"); return; }
              } else {
                if (!phone || phone.replace(/\D/g, "").length < 8) { toast.error("Entrez un numéro valide"); return; }
              }
              setStep("confirm");
            }}
            disabled={!selectedGroup || (operator !== "wallet" && !phone)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green disabled:opacity-40"
          >
            Continuer → {selectedGroup ? new Intl.NumberFormat("fr-FR").format(total) + " FCFA" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ─── ÉTAPE 2 : Confirmation ───────────────────────────────────────────────
  if (step === "confirm") {
    const selectedOp = OPERATORS.find((o) => o.id === operator)!;
    return (
      <div className="animate-slide-up">
        <TopBar title="Confirmer le paiement" backTo="/cotiser" backLabel="Retour" />
        <div className="px-4 pb-6">
          <div className="rounded-3xl bg-[hsla(160,84%,39%,0.08)] border border-[hsla(160,84%,39%,0.18)] p-5 text-center mb-6 shadow-sm">
            <p className="text-3xl font-bold text-[hsl(var(--tc-green))]">{new Intl.NumberFormat("fr-FR").format(total)}</p>
            <p className="text-sm text-muted-foreground mt-1">Total à payer</p>
          </div>

          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden mb-5">
            <div className="flex justify-between px-4 py-4 text-sm">
              <span className="text-muted-foreground">Groupe</span>
              <span className="font-semibold">{selectedGroup?.name}</span>
            </div>
            {operator !== "wallet" && (
              <div className="flex justify-between px-4 py-4 text-sm border-t border-border">
                <span className="text-muted-foreground">Téléphone</span>
                <span className="font-semibold">{phone}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-4 text-sm border-t border-border">
              <span className="text-muted-foreground">Moyen</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-2xl" style={{ background: selectedOp.color }} />
                <span className="font-semibold">{selectedOp.name}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl border border-[hsla(38,92%,50%,0.18)] bg-[hsla(38,92%,50%,0.07)] mb-5 text-center text-[11px] text-[hsl(var(--tc-amber))] shadow-sm">
            {operator === "wallet" ? (
              "Le montant sera prélevé immédiatement depuis votre portefeuille Tontine."
            ) : (
              <>📲 Une notification sera envoyée sur <strong className="text-foreground">{phone}</strong> pour valider le paiement.</>
            )}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-3xl text-sm font-bold text-white tc-gradient-green tc-shadow-green mb-3"
          >
            🔒 Confirmer le paiement
          </button>
          <button onClick={() => setStep("form")} className="w-full py-2.5 rounded-3xl text-sm text-muted-foreground border border-border bg-card">
            ← Modifier
          </button>
        </div>
      </div>
    );
  }

  // ─── ÉTAPE 3 : Traitement en cours ───────────────────────────────────────
  if (step === "processing") {
    // Vérifier si le widget Kkiapay doit être affiché
    console.log("🎯 Vérification condition widget en processing:", { 
      showKkiapayWidget, 
      selectedGroup: !!selectedGroup, 
      user: !!user,
      total,
      phone
    });
    if (showKkiapayWidget && selectedGroup && user) {
      console.log("🎯 Affichage du bouton Kkiapay");
      return (
        <div className="flex flex-col min-h-screen items-center justify-center gap-5 animate-fade-in">
          <div className="text-center">
            <KkiapayWidget
              amount={total}
              phone={phone}
              email={user.email || ""}
              onSuccess={handleKkiapaySuccess}
              onError={handleKkiapayError}
              onClose={() => setShowKkiapayWidget(false)}
            />
            <button 
              onClick={() => setShowKkiapayWidget(false)}
              className="mt-4 text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.1)] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[hsl(var(--tc-green))] animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-bold mb-1">Traitement en cours...</p>
          <p className="text-xs text-muted-foreground">Connexion à Kkiapay</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[hsl(var(--tc-green))]"
              style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── ÉTAPE 4 : Succès ────────────────────────────────────────────────────
  if (step === "done" && payResult) {
    const now = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    return (
      <div className="flex flex-col min-h-screen animate-fade-in">
        <div className="flex-1 px-4 pt-10 text-center">
          <div className="w-20 h-20 rounded-full bg-[hsla(160,84%,39%,0.12)] flex items-center justify-center mx-auto mb-4 animate-check-bounce">
            <Check className="w-10 h-10 text-[hsl(var(--tc-green))]" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold mb-1">Paiement initié !</h2>
          
          {(payResult.message?.includes("Test") || payResult.message?.includes("démo") || payResult.message?.includes("direct")) && (
            <div className="mb-4 inline-block px-3 py-1 bg-[hsla(45,35%,88%,0.9)] text-[hsl(35,25%,35%)] text-xs font-medium rounded-full border border-[hsla(35,20%,80%,0.8)]">
              Démo : flux fictif, aucun virement bancaire réel
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mb-6">
            {operator === "wallet"
              ? "Montant prélevé sur votre portefeuille Tontine (pas de crédit supplémentaire)."
              : "Paiement direct : le solde de votre portefeuille Tontine ne change pas ; la cotisation va à la cagnotte du groupe."}
          </p>

          <div className="bg-card border border-border rounded-2xl p-4 text-left mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reçu</p>
            {[
              ["Montant", `${new Intl.NumberFormat("fr-FR").format(total)} FCFA`],
              ["Groupe", selectedGroup?.name],
              ["Moyen", operator === "wallet" ? "Portefeuille" : phone],
              ["Date", now],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">Référence Kkiapay</p>
              <p className="text-[11px] font-mono text-[hsl(var(--tc-purple))] break-all">
                {payResult.reference || "—"}
              </p>
            </div>
          </div>

          {operator !== "wallet" && (
            <div className="flex items-center gap-2 bg-[hsla(45,30%,94%,0.95)] border border-[hsla(35,18%,85%,0.7)] rounded-xl p-3 mb-6 text-left">
              <span aria-hidden>⏳</span>
              <p className="text-[11px] text-muted-foreground font-medium">
                Si vous payez par Mobile Money, validez la demande sur {phone}
              </p>
            </div>
          )}

          <button onClick={() => navigate("/home")} className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green mb-3">
            Retour à l'accueil
          </button>
          <button onClick={() => navigate("/historique")} className="text-xs text-[hsl(var(--tc-green))] font-medium">
            Voir l'historique →
          </button>
        </div>
      </div>
    );
  }

  // ─── ÉTAPE 5 : Erreur ────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="flex flex-col min-h-screen animate-fade-in">
        <div className="flex-1 px-4 pt-10 text-center">
          <div className="w-20 h-20 rounded-full bg-[hsla(0,84%,60%,0.12)] flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Paiement échoué</h2>
          <p className="text-xs text-muted-foreground mb-6">{payResult?.message || "Une erreur est survenue"}</p>
          <button onClick={() => setStep("form")} className="w-full py-3 rounded-xl text-sm font-semibold text-white tc-gradient-green tc-shadow-green mb-3">
            Réessayer
          </button>
          <button onClick={() => navigate("/home")} className="text-xs text-muted-foreground mb-2">Annuler</button>
          
          {/* Bouton de test Kkiapay direct */}
          <button 
            onClick={() => {
              console.log('Test direct Kkiapay depuis Cotiser');
              if (window.kkiapay) {
                window.kkiapay({
                  amount: 1,
                  key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY || '9fa8afd0653111efbf02478c5adba4b8',
                  sandbox: import.meta.env.VITE_KKIAPAY_SANDBOX === "true",
                });
              } else {
                console.error('Kkiapay non disponible');
              }
            }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-blue-600 border border-blue-600 bg-blue-50 mb-2"
          >
            🧪 Test Direct Kkiapay
          </button>
        </div>
      </div>
    );
  }

  // Widget Kkiapay
  console.log("🎯 Vérification condition widget:", { showKkiapayWidget, selectedGroup: !!selectedGroup, user: !!user });
  if (showKkiapayWidget && selectedGroup && user) {
    console.log("🎯 Rendu du KkiapayWidget");
    return (
      <KkiapayWidget
        amount={total}
        phone={phone}
        email={user.email || ""}
        onSuccess={handleKkiapaySuccess}
        onError={handleKkiapayError}
        onClose={() => setShowKkiapayWidget(false)}
      />
    );
  }

  return null;
}