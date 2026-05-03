"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { ScreenerResponse, UniverseId } from "@/types/screener";

export function useScreener(
  universe: UniverseId = "sp500",
  customSymbols?: string[]
) {
  const symbolsParam =
    universe === "custom" && customSymbols?.length
      ? `&symbols=${customSymbols.join(",")}`
      : "";

  return useQuery<ScreenerResponse>({
    queryKey: ["screener", universe, customSymbols?.join(",") || ""],
    queryFn: async () => {
      const res = await fetch(
        `/api/screener?universe=${universe}${symbolsParam}`
      );
      if (!res.ok) throw new Error("Failed to fetch screener data");
      return res.json();
    },
    staleTime: STALE_TIME.SCREENER,
  });
}
