/**
 * FlashBot API client — connects the frontend to the WhatsApp bot's Flask backend.
 * All tontine metrics, payments, and wallet data come from FlashBot's real SQLite DB.
 */

const FLASHBOT_API_BASE = (import.meta.env.VITE_FLASHBOT_API_URL as string | undefined)?.trim()
  || "http://localhost:5000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FLASHBOT_API_BASE}${path}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`FlashBot API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface BotStats {
  total_tontines: number;
  active_tontines: number;
  waiting_tontines: number;
  completed_tontines: number;
  total_members: number;
  total_sats_managed: number;
  total_payments: number;
  pending_payments: number;
  wallet_balance: number | null;
}

export interface BtcRate {
  btc_fcfa: number;
  sat_fcfa: number;
  change_24h: number;
  source: string;
  fetched_at: number;
}

export interface TontinePayment {
  display: string;
  status: string;
  amount_sats: number;
  paid_at: string | null;
}

export interface TontineRound {
  round_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  payments: TontinePayment[];
}

export interface TontineCurrentRound {
  round_number: number;
  status: string;
  started_at: string;
  paid_count: number;
  total_members: number;
  payments: TontinePayment[];
}

export interface TontineMember {
  id: number;
  whatsapp_number: string;
  lightning_wallet: string;
  turn_order: number;
  display: string;
}

export interface TimelinePoint {
  timestamp: string;
  amount: number;
  cumulative: number;
}

export interface TontineDetail {
  id: number;
  name: string;
  code: string;
  amount_sats: number;
  max_members: number;
  current_round: number;
  status: string;
  frequency: string;
  schedule_time: string;
  created_at: string;
  members: TontineMember[];
  current_round_data: TontineCurrentRound | null;
  rounds_history: TontineRound[];
  timeline: TimelinePoint[];
  total_pot: number;
}

export interface RecentTontine {
  name: string;
  code: string;
  status: string;
  amount_sats: number;
  member_count: number;
  max_members: number;
  current_round: number;
  created_at: string;
}

export interface ActivityEvent {
  display: string;
  amount_sats: number;
  paid_at: string;
  tontine_name: string;
  tontine_code: string;
}

export const flashbotApi = {
  getStats: () => apiFetch<BotStats>("/api/stats"),
  getBtcRate: () => apiFetch<BtcRate>("/api/btc-rate"),
  getTontine: (code: string) => apiFetch<TontineDetail>(`/api/tontine/${code}`),
  getRecentTontines: () => apiFetch<RecentTontine[]>("/api/tontines/recent"),
  getActivity: () => apiFetch<ActivityEvent[]>("/api/activity"),
  getHealth: () => apiFetch<{ status: string; service: string; version: string }>("/health"),
};
