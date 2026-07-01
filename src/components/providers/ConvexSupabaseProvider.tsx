import { type ReactNode } from "react";
import { ConvexProviderWithAuth } from "convex/react";
import { convex, isConvexConfigured } from "@/lib/convex";
import { useAuth } from "@/hooks/useAuth";
import { ConvexUserSync } from "./ConvexUserSync";

function useSupabaseConvexAuth() {
  const { session, loading } = useAuth();

  return {
    isLoading: loading,
    isAuthenticated: Boolean(session?.access_token),
    fetchAccessToken: async () => session?.access_token ?? null,
  };
}

/** Sans VITE_CONVEX_URL, pas de client Convex — évite les erreurs réseau sur la landing. */
export function ConvexSupabaseProvider({ children }: { children: ReactNode }) {
  if (!isConvexConfigured) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseConvexAuth}>
      <ConvexUserSync />
      {children}
    </ConvexProviderWithAuth>
  );
}
