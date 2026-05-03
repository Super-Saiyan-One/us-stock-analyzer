"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { StockEventsResponse } from "@/types/events";

export function useStockEvents(symbol: string) {
  return useQuery<StockEventsResponse>({
    queryKey: ["stock", symbol, "events"],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}/events`);
      if (!res.ok) throw new Error("Failed to fetch stock events");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.SEC_EVENTS,
  });
}
