import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, MailCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import PhoneInput from "@/components/ui/PhoneInput";
import { saveDemoAccount } from "@/lib/demoMultiAccount";
import AuthLayout, {
  AuthField,
  authInputClass,
  AuthSubmitButton,
  SupabaseAlert,
  AuthTrustBadges,
} from "@/components/auth/AuthLayout";

export default function Inscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [memoDemo, setMemoDemo] = useState(true);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    if (!isSupabaseConfigured) {
      toast.error("Configuration Supabase manquante. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.");
      return;
    }
    if (!normalizedEmail || !normalizedName || !normalizedPhone || password.length < 6) {
      toast.error("Veuillez remplir tous les champs et entrer un mot de passe d'au moins 6 caractères");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: normalizedName, phone: normalizedPhone },
        },
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("Un compte existe déjà avec cette adresse email. Allez à la connexion.");
        setLoading(false);
        return;
      }

      if (data.session) {
        if (memoDemo) {
          saveDemoAccount(normalizedEmail, password, normalizedName);
        }
        toast.success("Compte créé ! Bienvenue.");
        const next = searchParams.get("next");
        const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
        navigate(dest, { replace: true });
        return;
      }

      setIsSuccess(true);
      toast.success("Vérifiez vos emails pour confirmer votre compte !");
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "Erreur lors de la création du compte";
      const message =
        raw === "Failed to fetch"
          ? "Impossible de joindre Supabase. Redémarrez npm run dev après avoir vérifié .env, ou vérifiez votre connexion internet."
          : raw;
      if (message.toLowerCase().includes("already registered")) {
        toast.error("Ce compte existe déjà. Connectez-vous ou supprimez l'utilisateur dans Supabase Auth > Users.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = password.length >= 6 && !!email && !!name && !!phone.trim();

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez HACKBIT en quelques secondes. Votre portefeuille FCFA sera prêt immédiatement."
      footer={
        !isSuccess ? (
          <p className="text-sm text-slate-500">
            Déjà membre ?{" "}
            <button
              type="button"
              onClick={() => navigate("/connexion")}
              className="font-semibold text-[hsl(266_62%_33%)] hover:underline"
            >
              Se connecter
            </button>
          </p>
        ) : undefined
      }
    >
      {!isSupabaseConfigured && <SupabaseAlert />}

      {!isSuccess ? (
        <>
          <AuthField label="Nom complet" icon={User}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ama Kossou"
              autoComplete="name"
              className={authInputClass(true)}
            />
          </AuthField>

          <AuthField label="Adresse email" icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="ama.kossou@email.com"
              autoComplete="email"
              className={authInputClass(true)}
            />
          </AuthField>

          <PhoneInput
            label="Numéro de téléphone"
            value={phone}
            onChange={setPhone}
            premium
            className="mb-5"
          />

          <AuthField label="Mot de passe" icon={Lock}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              autoComplete="new-password"
              className={authInputClass(true)}
            />
          </AuthField>

          {password.length > 0 && password.length < 6 && (
            <p className="text-[10px] text-amber-600 -mt-3 mb-4">Encore {6 - password.length} caractère(s) requis</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-violet-50/60 border border-violet-100/80 mb-2">
            <input
              type="checkbox"
              checked={memoDemo}
              onChange={(e) => setMemoDemo(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-violet-200 text-[hsl(266_62%_33%)] accent-[hsl(266_62%_33%)]"
            />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Mémoriser sur cet appareil (démo)</span>
              <br />
              Reconnexion rapide pour la présentation. Stockage local non sécurisé.
            </span>
          </label>

          <AuthSubmitButton loading={loading} disabled={!canSubmit} onClick={handleSignUp}>
            <span className="inline-flex items-center justify-center gap-2">
              Créer mon compte <ArrowRight className="w-4 h-4" />
            </span>
          </AuthSubmitButton>

          <AuthTrustBadges />
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5 animate-check-bounce">
            <MailCheck className="w-8 h-8 text-[hsl(266_62%_33%)]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Vérifiez vos emails</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Un lien de confirmation a été envoyé à{" "}
            <span className="font-semibold text-slate-800">{email}</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate("/connexion")}
            className="text-sm font-semibold text-[hsl(266_62%_33%)] hover:underline inline-flex items-center gap-1"
          >
            Aller à la connexion <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
