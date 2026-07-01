import { useQuery } from "@tanstack/react-query";
import { flashbotApi, type BotStats, type BtcRate, type RecentTontine, type ActivityEvent } from "@/lib/flashbotApi";

export function useBotStats() {
  return useQuery<BotStats>({
    queryKey: ["bot-stats"],
    queryFn: flashbotApi.getStats,
    staleTime: 15_000,
    retry: 2,
  });
}

export function useBotBtcRate() {
  return useQuery<BtcRate>({
    queryKey: ["bot-btc-rate"],
    queryFn: flashbotApi.getBtcRate,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useBotRecentTontines() {
  return useQuery<RecentTontine[]>({
    queryKey: ["bot-recent-tontines"],
    queryFn: flashbotApi.getRecentTontines,
    staleTime: 15_000,
    retry: 2,
  });
}

export function useBotActivity() {
  return useQuery<ActivityEvent[]>({
    queryKey: ["bot-activity"],
    queryFn: flashbotApi.getActivity,
    staleTime: 10_000,
    retry: 2,
  });
}
