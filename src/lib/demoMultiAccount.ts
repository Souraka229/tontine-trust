/**
 * Comptes multiples sur un même appareil — UNIQUEMENT en développement local.
 * Les mots de passe sont stockés en clair dans localStorage (jamais en production).
 */
export function isDemoAccountsEnabled(): boolean {
  return import.meta.env.DEV;
}

const STORAGE_KEY = "tontine_trust_demo_accounts_v1";
const MAX_ACCOUNTS = 12;

export interface DemoAccountRecord {
  email: string;
  password: string;
  label: string;
  savedAt: string;
}

export function getDemoAccounts(): DemoAccountRecord[] {
  if (!isDemoAccountsEnabled()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const filtered = arr.filter(
      (x): x is DemoAccountRecord =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as DemoAccountRecord).email === "string" &&
        typeof (x as DemoAccountRecord).password === "string"
    );
    return filtered.map((x) => ({
      email: x.email,
      password: String(x.password),
      label:
        typeof x.label === "string" && x.label.trim()
          ? x.label.trim().slice(0, 40)
          : x.email.split("@")[0] || "Compte",
      savedAt: typeof x.savedAt === "string" ? x.savedAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function persist(list: DemoAccountRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ACCOUNTS)));
  } catch (e) {
    console.warn("[demoMultiAccount] localStorage:", e);
  }
}

/** Ajoute ou remplace le compte (identifié par l’email, insensible à la casse). */
export function saveDemoAccount(email: string, password: string, label?: string) {
  if (!isDemoAccountsEnabled()) return;
  try {
    const trimmed = email.trim();
    const norm = trimmed.toLowerCase();
    const rest = getDemoAccounts().filter((a) => a.email.toLowerCase() !== norm);
    const displayLabel = (label?.trim() || trimmed.split("@")[0] || "Compte").slice(0, 40);
    const next: DemoAccountRecord = {
      email: trimmed,
      password,
      label: displayLabel,
      savedAt: new Date().toISOString(),
    };
    persist([next, ...rest]);
  } catch (e) {
    console.warn("[demoMultiAccount] saveDemoAccount:", e);
  }
}

export function removeDemoAccount(email: string) {
  if (!isDemoAccountsEnabled()) return;
  const norm = email.trim().toLowerCase();
  persist(getDemoAccounts().filter((a) => a.email.toLowerCase() !== norm));
}

export function clearDemoAccounts() {
  if (!isDemoAccountsEnabled()) return;
  localStorage.removeItem(STORAGE_KEY);
}
