import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";
import { getLatestPoint } from "@/lib/db";
import { computeFeature } from "@/lib/feature-engine";
import { buildMeta } from "@/lib/data-source-registry";
import type {
  RegimeDimensionData,
  RegimeSignal,
  MarketRegime,
} from "@/types/data-meta";

function signal(percentile: number, invert = false): RegimeSignal {
  const p = invert ? 100 - percentile : percentile;
  if (p >= 80) return "risk-off";
  if (p >= 60) return "caution";
  if (p >= 40) return "neutral";
  return "risk-on";
}

function buildDimension(
  dimension: RegimeDimensionData["dimension"],
  seriesId: string,
  sourceId: string,
  invert = false,
): RegimeDimensionData | null {
  const feature = computeFeature(seriesId, 252);
  if (!feature || feature.percentile == null) return null;

  const latest = getLatestPoint(seriesId);
  if (!latest) return null;

  const pct = feature.percentile;
  const sig = signal(pct, invert);

  const dirMap: Record<string, "improving" | "stable" | "deteriorating"> = {
    rising: "deteriorating",
    flat: "stable",
    falling: "improving",
  };
  const dir = invert
    ? dirMap[feature.direction || "flat"]
    : (feature.direction === "rising" ? "improving" : feature.direction === "falling" ? "deteriorating" : "stable");

  const meta = buildMeta(sourceId, latest.date);

  return {
    dimension,
    signal: sig,
    label: dimension,
    detail: `${seriesId}: ${latest.value.toFixed(2)}, ${pct}th pct, z=${feature.zScore}`,
    percentile: pct,
    direction: dir,
    meta: {
      ...meta,
      seriesId,
    },
  };
}

export async function GET() {
  const key = "regime:latest";
  const cached = cacheGet<MarketRegime>(key);
  if (cached) return NextResponse.json(cached);

  const dims: (RegimeDimensionData | null)[] = [
    buildDimension("trend", "VIXCLS", "fred"),
    buildDimension("volatility", "VIXCLS", "fred"),
    buildDimension("credit", "BAMLH0A0HYM2", "fred"),
    buildDimension("rates", "T10Y2Y", "fred", true),
    buildDimension("liquidity", "WALCL", "fred", true),
    buildDimension("valuation", "DGS10", "fred"),
  ];

  const valid = dims.filter((d): d is RegimeDimensionData => d !== null);

  if (valid.length === 0) {
    return NextResponse.json({
      overall: "neutral" as RegimeSignal,
      dimensions: [],
      timestamp: new Date().toISOString(),
      _note: "No data in SQLite yet. FRED data will be cached after first dashboard load.",
    });
  }

  const signalWeights: Record<RegimeSignal, number> = {
    "risk-on": 0,
    neutral: 1,
    caution: 2,
    "risk-off": 3,
  };
  const avgWeight =
    valid.reduce((s, d) => s + signalWeights[d.signal], 0) / valid.length;

  let overall: RegimeSignal = "neutral";
  if (avgWeight >= 2.2) overall = "risk-off";
  else if (avgWeight >= 1.5) overall = "caution";
  else if (avgWeight <= 0.5) overall = "risk-on";

  const regime: MarketRegime = {
    overall,
    dimensions: valid,
    timestamp: new Date().toISOString(),
  };

  cacheSet(key, regime, CACHE_TTL.REGIME);
  return NextResponse.json(regime);
}
