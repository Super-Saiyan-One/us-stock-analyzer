"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { OptionsChain, OptionsExpirations } from "@/types/options";

export function useOptionsExpirations(symbol: string) {
  return useQuery<OptionsExpirations>({
    queryKey: ["stock", symbol, "options", "expirations"],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/options?type=expirations`
      );
      if (!res.ok) throw new Error("Failed to fetch expirations");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.OPTIONS_EXPIRATIONS,
  });
}

export function useOptionsChain(symbol: string, expiration: string) {
  return useQuery<OptionsChain>({
    queryKey: ["stock", symbol, "options", "chain", expiration],
    queryFn: async () => {
      const params = expiration ? `&expiration=${expiration}` : "";
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/options?type=chain${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch options chain");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.OPTIONS_CHAIN,
    refetchOnWindowFocus: true,
  });
}
