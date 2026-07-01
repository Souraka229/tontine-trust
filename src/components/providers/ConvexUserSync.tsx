import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { isConvexConfigured } from "@/lib/convex";

export function ConvexUserSync() {
  const { user, profile, session } = useAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  useEffect(() => {
    if (!isConvexConfigured || !user || !session?.access_token) return;

    void syncCurrentUser({
      supabaseUserId: user.id,
      email: user.email ?? profile?.email ?? "",
      name: profile?.name ?? user.user_metadata?.name,
      phone: profile?.phone ?? user.user_metadata?.phone,
    }).catch((error) => {
      console.warn("[ConvexUserSync]", error);
    });
  }, [profile, session?.access_token, syncCurrentUser, user]);

  return null;
}
