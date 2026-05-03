"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { MarketRegime } from "@/types/data-meta";

export function useMarketRegime() {
  return useQuery<MarketRegime>({
    queryKey: ["market", "regime"],
    queryFn: async () => {
      const res = await fetch("/api/market/regime");
      if (!res.ok) throw new Error("Failed to fetch regime");
      return res.json();
    },
    staleTime: STALE_TIME.REGIME,
    refetchInterval: STALE_TIME.REGIME,
  });
}
