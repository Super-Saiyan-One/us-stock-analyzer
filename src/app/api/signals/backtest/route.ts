import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";
import {
  getSignalObservations,
  getDistinctSignalIds,
  getForwardReturns,
} from "@/lib/db";
import type { BacktestResult } from "@/types/screener";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeStats(
  returns: (number | null)[]
): { avg: number; med: number; winRate: number; hitRate: number } {
  const valid = returns.filter((r): r is number => r !== null);
  if (valid.length === 0) return { avg: 0, med: 0, winRate: 0, hitRate: 0 };

  const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
  const med = median(valid);
  const wins = valid.filter((r) => r > 0).length;
  const winRate = (wins / valid.length) * 100;
  const hitRate = (valid.length / returns.length) * 100;

  return {
    avg: Math.round(avg * 100) / 100,
    med: Math.round(med * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    hitRate: Math.round(hitRate * 10) / 10,
  };
}

export async function GET() {
  const cacheKey = "signals:backtest";
  const cached = cacheGet<BacktestResult[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const signalIds = getDistinctSignalIds();
  const results: BacktestResult[] = [];

  for (const signalId of signalIds) {
    const observations = getSignalObservations(signalId, undefined, 1000);
    if (observations.length < 3) continue;

    const returns1D: (number | null)[] = [];
    const returns5D: (number | null)[] = [];
    const returns20D: (number | null)[] = [];
    let maxDD = 0;

    const byRegimeMap = new Map<
      string,
      { r1: (number | null)[]; r5: (number | null)[]; r20: (number | null)[] }
    >();

    for (const obs of observations) {
      const fwd = getForwardReturns(obs.symbol, obs.observedAt, obs.priceAtSignal);
      returns1D.push(fwd.return1D);
      returns5D.push(fwd.return5D);
      returns20D.push(fwd.return20D);

      if (fwd.return20D != null && fwd.return20D < maxDD) {
        maxDD = fwd.return20D;
      }

      const regime = obs.regime || "unknown";
      if (!byRegimeMap.has(regime)) {
        byRegimeMap.set(regime, { r1: [], r5: [], r20: [] });
      }
      const rg = byRegimeMap.get(regime)!;
      rg.r1.push(fwd.return1D);
      rg.r5.push(fwd.return5D);
      rg.r20.push(fwd.return20D);
    }

    const stats1 = computeStats(returns1D);
    const stats5 = computeStats(returns5D);
    const stats20 = computeStats(returns20D);

    const byRegime: Record<string, Omit<BacktestResult, "signalId" | "byRegime">> = {};
    for (const [regime, data] of byRegimeMap) {
      const rs1 = computeStats(data.r1);
      const rs5 = computeStats(data.r5);
      const rs20 = computeStats(data.r20);
      const validCount = data.r1.filter((r) => r !== null).length;
      if (validCount < 2) continue;
      byRegime[regime] = {
        sampleCount: data.r1.length,
        hitRate1D: rs1.hitRate, hitRate5D: rs5.hitRate, hitRate20D: rs20.hitRate,
        avgReturn1D: rs1.avg, avgReturn5D: rs5.avg, avgReturn20D: rs20.avg,
        medianReturn1D: rs1.med, medianReturn5D: rs5.med, medianReturn20D: rs20.med,
        winRate1D: rs1.winRate, winRate5D: rs5.winRate, winRate20D: rs20.winRate,
        maxDrawdown: Math.min(...data.r20.filter((r): r is number => r !== null), 0),
      };
    }

    results.push({
      signalId,
      sampleCount: observations.length,
      hitRate1D: stats1.hitRate, hitRate5D: stats5.hitRate, hitRate20D: stats20.hitRate,
      avgReturn1D: stats1.avg, avgReturn5D: stats5.avg, avgReturn20D: stats20.avg,
      medianReturn1D: stats1.med, medianReturn5D: stats5.med, medianReturn20D: stats20.med,
      winRate1D: stats1.winRate, winRate5D: stats5.winRate, winRate20D: stats20.winRate,
      maxDrawdown: maxDD,
      byRegime: Object.keys(byRegime).length > 0 ? byRegime : undefined,
    });
  }

  results.sort((a, b) => b.sampleCount - a.sampleCount);

  cacheSet(cacheKey, results, CACHE_TTL.SIGNAL_LAB);
  return NextResponse.json(results);
}
