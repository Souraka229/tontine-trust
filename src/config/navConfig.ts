import type { LucideIcon } from "lucide-react";
import {
  Home,
  Search,
  PlusCircle,
  Wallet,
  User,
  Bitcoin,
  MessageCircle,
  Settings,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

export const mainNavItems: NavItem[] = [
  {
    path: "/home",
    label: "Tableau de bord",
    mobileLabel: "Accueil",
    icon: Home,
    match: (p) =>
      p === "/home" ||
      p.startsWith("/notifications") ||
      p.startsWith("/groupe/") ||
      p.startsWith("/creer"),
  },
  {
    path: "/portefeuille",
    label: "Portefeuille",
    icon: Wallet,
    match: (p) => p.startsWith("/portefeuille"),
  },
  {
    path: "/rechercher",
    label: "Groupes",
    icon: Search,
    match: (p) => p.startsWith("/rechercher") || p.startsWith("/rejoindre/"),
  },
  {
    path: "/cotiser",
    label: "Cotiser",
    icon: PlusCircle,
    match: (p) => p.startsWith("/cotiser") || p.startsWith("/confirmation"),
  },
  {
    path: "/profil",
    label: "Profil & score",
    mobileLabel: "Profil",
    icon: User,
    match: (p) =>
      p.startsWith("/profil") ||
      p.startsWith("/parametres") ||
      p.startsWith("/score") ||
      p.startsWith("/historique") ||
      p.startsWith("/admin") ||
      p.startsWith("/crypto") ||
      p.startsWith("/whatsapp"),
  },
];

export const moduleNavItems: NavItem[] = [
  {
    path: "/crypto",
    label: "Trésor Bitcoin",
    icon: Bitcoin,
    match: (p) => p.startsWith("/crypto"),
  },
  {
    path: "/whatsapp",
    label: "Bot WhatsApp",
    icon: MessageCircle,
    match: (p) => p.startsWith("/whatsapp"),
  },
  {
    path: "/parametres",
    label: "Paramètres",
    icon: Settings,
    match: (p) => p.startsWith("/parametres"),
  },
];

/** Routes sans sidebar / tab bar */
export const fullWidthRoutes = ["/", "/connexion", "/inscription"];
export const noNavRoutes = ["/", "/welcome", "/connexion", "/inscription", "/splash"];
