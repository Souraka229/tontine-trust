import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { linkWhatsappProfile } from "@/lib/linkWhatsappProfile";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  email: string;
  initials: string;
  phone: string | null;
  wallet_balance: number;
  total_locked: number;
  score: number;
  max_score: number;
  groups_count: number;
  cycles_completed: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string, email?: string, name?: string, phone?: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("fetchProfile:", error.message);
        }

        if (data) {
          setProfile(data as Profile);
          const linked = await linkWhatsappProfile();
          if (linked > 0) {
            toast.success(`${linked} groupe(s) WhatsApp relié(s) à votre compte`);
            const { data: refreshed } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            if (refreshed) setProfile(refreshed as Profile);
          }
          return;
        }

        if (userId) {
          const v_name = name || email?.split("@")[0] || "Utilisateur";
          const v_initials = v_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);

          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: email || "",
              name: v_name,
              initials: v_initials,
              phone: phone || null,
              wallet_balance: 0,
              score: 500,
            })
            .select()
            .single();

          if (newProfile) {
            setProfile(newProfile as Profile);
          } else if (insertError) {
            console.error("Critical error during profile repair:", insertError);
          }
        }
      } catch (err) {
        console.error("Unexpected error in fetchProfile:", err);
      }
    },
    []
  );

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let cancelled = false;

    const safeSetLoading = (v: boolean) => {
      if (!cancelled) setLoading(v);
    };

    const applySession = async (next: Session | null) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        await fetchProfile(
          next.user.id,
          next.user.email ?? undefined,
          next.user.user_metadata?.name,
          next.user.user_metadata?.phone
        );
      } else {
        setProfile(null);
      }
    };

    const bootstrap = async () => {
      const timeout = window.setTimeout(() => {
        if (!cancelled) {
          console.warn("[AuthProvider] getSession timeout — mode invité");
          safeSetLoading(false);
        }
      }, 8_000);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;
        await applySession(data.session);
      } catch (e) {
        console.error("[AuthProvider] getSession:", e);
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        window.clearTimeout(timeout);
        safeSetLoading(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        await Promise.resolve();
        if (cancelled) return;
        try {
          await applySession(nextSession);
        } catch (e) {
          console.error("[AuthProvider] onAuthStateChange:", e);
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
