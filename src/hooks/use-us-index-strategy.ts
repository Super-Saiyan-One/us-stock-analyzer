"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type {
  UsIndexStrategyConfig,
  UsIndexStrategyResponse,
  UsIndexSymbol,
} from "@/types/us-index-strategy";

export function useUsIndexStrategy(symbol: UsIndexSymbol) {
  return useQuery<UsIndexStrategyResponse>({
    queryKey: ["market", "us-index-strategy", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/us-index-strategy?symbol=${symbol}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch US index strategy");
      return res.json();
    },
    staleTime: STALE_TIME.US_INDEX_STRATEGY,
  });
}

export function useSaveUsIndexStrategyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: UsIndexStrategyConfig) => {
      const res = await fetch("/api/market/us-index-strategy/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save US index strategy config");
      return res.json() as Promise<UsIndexStrategyConfig>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market", "us-index-strategy"] });
    },
  });
}
