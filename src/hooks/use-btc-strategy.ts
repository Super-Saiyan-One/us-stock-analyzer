"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type {
  BtcStrategyConfig,
  BtcStrategyResponse,
} from "@/types/btc-strategy";

export function useBtcStrategy() {
  return useQuery<BtcStrategyResponse>({
    queryKey: ["crypto", "btc", "strategy"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/btc/strategy", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch BTC strategy");
      return res.json();
    },
    staleTime: STALE_TIME.BTC_STRATEGY,
  });
}

export function useSaveBtcStrategyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: BtcStrategyConfig) => {
      const res = await fetch("/api/crypto/btc/strategy/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save BTC strategy config");
      return res.json() as Promise<BtcStrategyConfig>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crypto", "btc", "strategy"] });
      await queryClient.refetchQueries({
        queryKey: ["crypto", "btc", "strategy"],
        type: "active",
      });
    },
  });
}
