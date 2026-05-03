"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { OptionsSummaryV2 } from "@/types/signals";

export function useOptionsSummary(symbol: string) {
  return useQuery<OptionsSummaryV2>({
    queryKey: ["stock", symbol, "options-summary"],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/options-summary`
      );
      if (!res.ok) throw new Error("Failed to fetch options summary");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.OPTIONS_CHAIN,
  });
}
