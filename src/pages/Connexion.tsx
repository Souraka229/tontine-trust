import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Users, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { getDemoAccounts, removeDemoAccount, saveDemoAccount, type DemoAccountRecord } from "@/lib/demoMultiAccount";
import AuthLayout, {
  AuthField,
  authInputClass,
  AuthSubmitButton,
  SupabaseAlert,
  AuthTrustBadges,
} from "@/components/auth/AuthLayout";

export default function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [memoDemo, setMemoDemo] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<DemoAccountRecord[]>([]);

  const refreshSaved = useCallback(() => {
    setSavedAccounts(getDemoAccounts());
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    refreshSaved();
  }, [refreshSaved]);

  const finishLogin = (loggedEmail: string, loggedPassword: string) => {
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", loggedEmail);
    } else {
      localStorage.removeItem("rememberedEmail");
    }
    if (memoDemo) {
      saveDemoAccount(loggedEmail, loggedPassword);
      refreshSaved();
    }
    toast.success("Connexion réussie !");
    navigate("/home");
  };

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Configuration Supabase manquante. Vérifiez le fichier .env.");
      return;
    }
    if (password.length < 6 || !email) {
      toast.error("Veuillez entrer une adresse email valide et un mot de passe (min. 6 caractères)");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      finishLogin(email, password);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Identifiants incorrects";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (acc: DemoAccountRecord) => {
    if (!isSupabaseConfigured) {
      toast.error("Configuration Supabase manquante.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: acc.email,
        password: acc.password,
      });
      if (error) throw error;
      setEmail(acc.email);
      if (rememberMe) localStorage.setItem("rememberedEmail", acc.email);
      toast.success(`Connecté · ${acc.label}`);
      navigate("/home");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Connexion impossible";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = (e: React.MouseEvent, accEmail: string) => {
    e.stopPropagation();
    removeDemoAccount(accEmail);
    refreshSaved();
    toast("Compte retiré de cet appareil", { duration: 2500 });
  };

  return (
    <AuthLayout
      title="Bon retour !"
      subtitle="Connectez-vous pour accéder à vos groupes, votre portefeuille FCFA et le trésor Bitcoin."
      footer={
        <p className="text-sm text-slate-500">
          Pas encore de compte ?{" "}
          <button
            type="button"
            onClick={() => navigate("/inscription")}
            className="font-semibold text-[hsl(266_62%_33%)] hover:underline"
          >
            Créer un compte
          </button>
        </p>
      }
    >
      {!isSupabaseConfigured && <SupabaseAlert />}

      {savedAccounts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[hsl(266_62%_33%)]" />
            <p className="text-xs font-semibold text-slate-800">Comptes sur cet appareil</p>
          </div>
          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            Connexion en un clic pour la démo. Stockage local uniquement.
          </p>
          <ul className="flex flex-col gap-2">
            {savedAccounts.map((acc) => (
              <li
                key={acc.email}
                className="flex items-center gap-2 rounded-xl bg-white border border-violet-100 px-3 py-2.5 shadow-sm"
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(acc)}
                  className="flex-1 text-left min-w-0 disabled:opacity-50"
                >
                  <p className="text-xs font-semibold text-slate-900 truncate">{acc.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleRemoveSaved(e, acc.email)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={`Retirer ${acc.email}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AuthField label="Adresse email" icon={Mail}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ama.kossou@email.com"
          autoComplete="username"
          className={authInputClass(true)}
        />
      </AuthField>

      <AuthField label="Mot de passe" icon={Lock}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          className={authInputClass(true)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
      </AuthField>

      <div className="space-y-3 mb-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-violet-200 text-[hsl(266_62%_33%)] accent-[hsl(266_62%_33%)]"
          />
          <span className="text-xs text-slate-600">Se souvenir de mon email</span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-violet-50/60 border border-violet-100/80">
          <input
            type="checkbox"
            checked={memoDemo}
            onChange={(e) => setMemoDemo(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-violet-200 text-[hsl(266_62%_33%)] accent-[hsl(266_62%_33%)]"
          />
          <span className="text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-800">Mémoriser ce compte (démo)</span>
            <br />
            Reconnexion rapide pour la présentation.
          </span>
        </label>
      </div>

      <AuthSubmitButton loading={loading} disabled={password.length < 6 || !email} onClick={handleLogin}>
        <span className="inline-flex items-center justify-center gap-2">
          Se connecter <ArrowRight className="w-4 h-4" />
        </span>
      </AuthSubmitButton>

      <AuthTrustBadges />
    </AuthLayout>
  );
}
