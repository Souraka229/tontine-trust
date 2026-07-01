/** Routes accessibles sans compte (lecture / découverte). */
export const PUBLIC_PATHS = [
  "/",
  "/welcome",
  "/connexion",
  "/inscription",
  "/crypto",
  "/whatsapp",
  "/rechercher",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  if (pathname.startsWith("/rejoindre/")) return true;
  return false;
}

/** Actions qui exigent un compte (mutations, données personnelles). */
export function requiresAuth(pathname: string): boolean {
  return !isPublicPath(pathname);
}
