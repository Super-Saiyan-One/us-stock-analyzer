"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { StockQuote } from "@/types/stock";

export function useStockQuote(symbol: string) {
  return useQuery<StockQuote>({
    queryKey: ["stock", symbol, "quote"],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}/quote`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.STOCK_QUOTE,
    refetchOnWindowFocus: true,
  });
}
