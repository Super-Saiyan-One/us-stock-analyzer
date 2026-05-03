"use client";

import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { ShillerLatest, ShillerHistoryPoint, SP500Data, ForwardPEData, ForwardPEHistory } from "@/types/market";

export function useShillerLatest() {
  return useQuery<ShillerLatest>({
    queryKey: ["market", "shiller", "latest"],
    queryFn: async () => {
      const res = await fetch("/api/market/shiller?type=latest");
      if (!res.ok) throw new Error("Failed to fetch Shiller data");
      return res.json();
    },
    staleTime: STALE_TIME.SHILLER,
  });
}

export function useShillerHistory() {
  return useQuery<ShillerHistoryPoint[]>({
    queryKey: ["market", "shiller", "history"],
    queryFn: async () => {
      const res = await fetch("/api/market/shiller?type=history");
      if (!res.ok) throw new Error("Failed to fetch Shiller history");
      return res.json();
    },
    staleTime: STALE_TIME.SHILLER,
  });
}

export function useForwardPE() {
  return useQuery<ForwardPEData>({
    queryKey: ["market", "forward-pe", "current"],
    queryFn: async () => {
      const res = await fetch("/api/market/forward-pe?type=current");
      if (!res.ok) throw new Error("Failed to fetch Forward PE");
      return res.json();
    },
    staleTime: STALE_TIME.FORWARD_PE,
  });
}

export function useForwardPEHistory() {
  return useQuery<ForwardPEHistory>({
    queryKey: ["market", "forward-pe", "history"],
    queryFn: async () => {
      const res = await fetch("/api/market/forward-pe?type=history");
      if (!res.ok) throw new Error("Failed to fetch Forward PE history");
      return res.json();
    },
    staleTime: STALE_TIME.FORWARD_PE,
  });
}

export function useSP500() {
  return useQuery<SP500Data>({
    queryKey: ["market", "sp500"],
    queryFn: async () => {
      const res = await fetch("/api/market/sp500");
      if (!res.ok) throw new Error("Failed to fetch S&P 500 data");
      return res.json();
    },
    staleTime: STALE_TIME.SP500,
    refetchOnWindowFocus: true,
  });
}
