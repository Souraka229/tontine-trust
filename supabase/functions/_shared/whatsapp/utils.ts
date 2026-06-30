import type { GroupFrequency } from "./types.ts";

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "");
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
