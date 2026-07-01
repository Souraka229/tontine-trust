import { ConvexReactClient } from "convex/react";

const rawConvexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim();

export const convexUrl = rawConvexUrl;
export const isConvexConfigured = Boolean(rawConvexUrl);

if (!isConvexConfigured) {
  console.warn(
    "[TontineChain] VITE_CONVEX_URL est absent. Lancez `npx convex dev` puis copiez l'URL dans .env.local."
  );
}

export const convex = new ConvexReactClient(
  rawConvexUrl || "https://placeholder-convex-url.invalid"
);
