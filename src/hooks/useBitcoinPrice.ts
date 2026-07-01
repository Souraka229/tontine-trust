import { useQuery } from "@tanstack/react-query";
import { fetchBitcoinMarket, getBitcoinFallback } from "@/lib/bitcoin";

export function useBitcoinPrice() {
  return useQuery({
    queryKey: ["bitcoin-market"],
    queryFn: ({ signal }) => fetchBitcoinMarket(signal),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    retryDelay: 2_000,
    placeholderData: () => getBitcoinFallback(),
  });
}
