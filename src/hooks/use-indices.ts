"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { IndicesData, FearGreedData } from "@/types/market";

export function useMarketIndices() {
  return useQuery<IndicesData>({
    queryKey: ["market", "indices"],
    queryFn: async () => {
      const res = await fetch("/api/market/indices");
      if (!res.ok) throw new Error("Failed to fetch indices");
      return res.json();
    },
    staleTime: STALE_TIME.MARKET_INDICES,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
}

export function useFearGreed() {
  return useQuery<FearGreedData>({
    queryKey: ["market", "feargreed"],
    queryFn: async () => {
      const res = await fetch("/api/market/fear-greed");
      if (!res.ok) throw new Error("Failed to fetch Fear & Greed");
      return res.json();
    },
    staleTime: STALE_TIME.FEAR_GREED,
  });
}
