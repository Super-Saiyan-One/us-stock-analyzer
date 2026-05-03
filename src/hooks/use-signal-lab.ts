"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { BacktestResult } from "@/types/screener";

interface EnrichedObservation {
  id: number;
  symbol: string;
  signalId: string;
  category: string;
  score: number;
  priceAtSignal: number;
  observedAt: string;
  triggers: string[];
  regime: string | null;
  createdAt: string;
  forwardReturn1D: number | null;
  forwardReturn5D: number | null;
  forwardReturn20D: number | null;
}

export function useBacktestResults() {
  return useQuery<BacktestResult[]>({
    queryKey: ["signals", "backtest"],
    queryFn: async () => {
      const res = await fetch("/api/signals/backtest");
      if (!res.ok) throw new Error("Failed to fetch backtest results");
      return res.json();
    },
    staleTime: STALE_TIME.SIGNAL_LAB,
  });
}

export function useSignalObservations(signalId?: string, limit = 50) {
  return useQuery<EnrichedObservation[]>({
    queryKey: ["signals", "observations", signalId || "all", limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (signalId) params.set("signalId", signalId);
      const res = await fetch(`/api/signals/observations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch observations");
      return res.json();
    },
    staleTime: STALE_TIME.SIGNAL_LAB,
  });
}
