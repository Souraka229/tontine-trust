import type { LucideIcon } from "lucide-react";
import { Bitcoin, MessageCircle, Smartphone } from "lucide-react";
import homeMockup from "@/assets/landing/iphone-home-mockup.png";
import whatsappMockup from "@/assets/landing/iphone-whatsapp-mockup.png";
import bitcoinMockup from "@/assets/landing/iphone-bitcoin-mockup.png";

export type MockupTabId = "home" | "whatsapp" | "bitcoin";

export interface LandingMockupSlide {
  id: MockupTabId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  stats: { label: string; value: string }[];
  footnote: string;
  src: string;
  alt: string;
  icon: LucideIcon;
  ctaLabel: string;
  ctaPath: string;
}

export const LANDING_MOCKUP_SLIDES: LandingMockupSlide[] = [
  {
    id: "home",
    label: "Application",
    eyebrow: "Aperçu · Application",
    title: "Tableau de bord et groupes",
    description:
      "Solde FCFA, cotisations, création de groupe et suivi des tours — la même interface que lorsque vous êtes connecté.",
    highlights: [
      "Portefeuille FCFA : solde disponible et montants verrouillés",
      "Créer, rejoindre ou cotiser en un tap depuis l'accueil",
      "Suivi des tours et barre de progression par groupe",
      "Notifications et score de confiance intégrés",
    ],
    stats: [
      { label: "Solde démo", value: "125 000 FCFA" },
      { label: "Groupe actif", value: "Tour 3/8" },
    ],
    footnote: "Compatible MTN MoMo, Moov Money et portefeuille interne.",
    src: homeMockup,
    alt: "Aperçu TontineChain — tableau de bord et groupes",
    icon: Smartphone,
    ctaLabel: "Créer un compte",
    ctaPath: "/inscription",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    eyebrow: "Aperçu · WhatsApp",
    title: "Bot conversationnel",
    description:
      "Consultez solde, groupes, cotisations et cours Bitcoin par message — sans télécharger l'application.",
    highlights: [
      "Commandes /solde, /groupes, /cotiser, /bitcoin",
      "Création et adhésion : CREER, REJOINDRE CODE",
      "Mêmes données que l'app web, synchronisées Supabase",
      "Idéal pour les membres sans smartphone récent",
    ],
    stats: [
      { label: "Commandes", value: "12+" },
      { label: "Réponse", value: "< 3 s" },
    ],
    footnote: "Simulateur disponible sur la page WhatsApp du site.",
    src: whatsappMockup,
    alt: "Aperçu TontineChain Bot — interface WhatsApp",
    icon: MessageCircle,
    ctaLabel: "Ouvrir le simulateur",
    ctaPath: "/whatsapp",
  },
  {
    id: "bitcoin",
    label: "Trésor Bitcoin",
    eyebrow: "Aperçu · Trésor Bitcoin",
    title: "FCFA au quotidien, Bitcoin en réserve",
    description:
      "Indexez les cotisations FCFA sur le cours Bitcoin, vérifiez la réserve sur mempool.space et signez des engagements secp256k1 par groupe.",
    highlights: [
      "Solde trésor vérifiable on-chain (mempool.space)",
      "Prix live CoinGecko en FCFA et en USD",
      "Conversion FCFA → sats et staking dans le registre",
      "Preuves secp256k1 vérifiables par les membres",
    ],
    stats: [
      { label: "Trésor collectif", value: "24,8 M FCFA" },
      { label: "Réserve BTC", value: "0,42 BTC" },
    ],
    footnote: "8,4 % APY estimé sur la réserve Bitcoin du trésor.",
    src: bitcoinMockup,
    alt: "Aperçu Trésor Bitcoin — sats et preuves",
    icon: Bitcoin,
    ctaLabel: "Voir le trésor",
    ctaPath: "/crypto",
  },
];
