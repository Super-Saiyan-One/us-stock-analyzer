"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { FinancialMetrics } from "@/types/stock";

interface FinancialsResponse extends FinancialMetrics {
  symbol: string;
  longName: string;
  price: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  floatShares?: number | null;
  sharesOutstanding?: number | null;
  sharesShort?: number | null;
  sharesShortPriorMonth?: number | null;
  shortRatio?: number | null;
  shortPercentOfFloat?: number | null;
  dateShortInterest?: number | null;
  sector: string | null;
  industry: string | null;
}

export function useStockFinancials(symbol: string) {
  return useQuery<FinancialsResponse>({
    queryKey: ["stock", symbol, "financials"],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/financials`
      );
      if (!res.ok) throw new Error("Failed to fetch financials");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.STOCK_FINANCIALS,
  });
}
