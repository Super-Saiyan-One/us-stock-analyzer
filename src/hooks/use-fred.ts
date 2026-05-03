"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import type { FredObservation } from "@/types/market";

function fredQueryFn(series: string, limit = 60, start = "") {
  return async (): Promise<FredObservation[]> => {
    const params = new URLSearchParams({ series, limit: String(limit) });
    if (start) params.set("start", start);
    const res = await fetch(`/api/fred?${params}`);
    if (!res.ok) throw new Error(`FRED ${series} failed`);
    return res.json();
  };
}

export function useFredSeries(series: string, limit = 60, start = "") {
  return useQuery<FredObservation[]>({
    queryKey: ["fred", series, limit, start],
    queryFn: fredQueryFn(series, limit, start),
    staleTime: STALE_TIME.FRED,
  });
}

export function useFredMultiple(
  seriesIds: string[],
  limit = 30,
  start = ""
) {
  return useQueries({
    queries: seriesIds.map((s) => ({
      queryKey: ["fred", s, limit, start],
      queryFn: fredQueryFn(s, limit, start),
      staleTime: STALE_TIME.FRED,
    })),
  });
}

export function useFredLatest(series: string) {
  const { data, ...rest } = useFredSeries(series, 5);
  const latest = data?.[data.length - 1] ?? null;
  const prev = data?.[data.length - 2] ?? null;
  return { latest, prev, data, ...rest };
}
