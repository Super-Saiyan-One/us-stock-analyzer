"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { ShortInterestResponse } from "@/types/events";

export function useShortInterest(symbol: string) {
  return useQuery<ShortInterestResponse>({
    queryKey: ["stock", symbol, "short-interest"],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/short-interest`
      );
      if (!res.ok) throw new Error("Failed to fetch short interest");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.SHORT_INTEREST,
  });
}
