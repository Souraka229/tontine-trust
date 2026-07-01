import type { GroupFrequency } from "./types.ts";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Chiffres uniquement, format E.164 Bénin (+229XXXXXXXX). */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // +229 01 XX… enregistré avec un 0 national superflu → 2290… (13 chiffres)
  if (digits.startsWith("2290") && digits.length >= 12) {
    digits = `229${digits.slice(4)}`;
  }
  if (digits.startsWith("229")) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+229${digits.slice(1)}`;
  }
  if (digits.length === 8) {
    return `+229${digits}`;
  }
  return phone.replace(/\s/g, "");
}

/** Variantes pour retrouver un profil (WhatsApp Meta vs saisie formulaire). */
export function phoneLookupVariants(phone: string): string[] {
  const canonical = normalizePhone(phone);
  const digits = canonical.replace(/\D/g, "");
  const variants = new Set<string>([
    canonical,
    digits,
    `+${digits}`,
    digits.replace(/^\+/, ""),
  ]);
  if (digits.startsWith("229") && digits.length >= 11) {
    const national = digits.slice(3);
    variants.add(`+2290${national}`);
    variants.add(`2290${national}`);
    variants.add(`+229 ${national.slice(0, 2)} ${national.slice(2)}`);
  }
  return [...variants];
}

export function formatFCFA(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

export function formatBtc(btc: number): string {
  if (btc >= 1) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.001) return `${btc.toFixed(6)} BTC`;
  return `${Math.round(btc * 1e8).toLocaleString("fr-FR")} sats`;
}

export function generateInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return `TONT-${suffix}`;
}

export function parseCommand(raw: string): { cmd: string; args: string[]; raw: string } {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  const parts = upper.split(/\s+/).filter(Boolean);
  const cmd = (parts[0] ?? "").replace(/^\//, "");
  return { cmd, args: parts.slice(1), raw: trimmed };
}

export function isCancelCommand(cmd: string): boolean {
  return ["ANNULER", "CANCEL", "STOP", "QUIT"].includes(cmd);
}

export function isConfirmCommand(cmd: string): boolean {
  return ["OUI", "YES", "OK", "CONFIRMER"].includes(cmd);
}

const FREQ_MAP: Record<string, GroupFrequency> = {
  JOURNALIER: "Journalier",
  JOUR: "Journalier",
  DAILY: "Journalier",
  HEBDOMADAIRE: "Hebdomadaire",
  WEEKLY: "Hebdomadaire",
  SEMAINE: "Hebdomadaire",
  BIMENSUELLE: "Bimensuelle",
  BIMENSUEL: "Bimensuelle",
  MENSUELLE: "Mensuelle",
  MONTHLY: "Mensuelle",
  MOIS: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  TRIMESTRIEL: "Trimestrielle",
};

export function parseFrequency(text: string): GroupFrequency | null {
  return FREQ_MAP[text.toUpperCase().replace(/^\//, "")] ?? null;
}

export const FREQ_LABELS: Record<GroupFrequency, string> = {
  Journalier: "chaque jour",
  Hebdomadaire: "chaque semaine",
  Bimensuelle: "toutes les 2 semaines",
  Mensuelle: "chaque mois",
  Trimestrielle: "chaque trimestre",
};

export function groupInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "GR"
  );
}

const GROUP_COLORS = ["green", "blue", "amber", "purple", "red"];

export function randomGroupColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}
