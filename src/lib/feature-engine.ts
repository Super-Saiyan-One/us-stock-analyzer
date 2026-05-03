import { computePercentile, getTimeSeries } from "./db";

export interface Feature {
  name: string;
  value: number;
  percentile?: number;
  zScore?: number;
  direction?: "rising" | "flat" | "falling";
  lookbackDays: number;
}

export function computeFeature(
  seriesId: string,
  lookbackDays = 252
): Feature | null {
  const data = getTimeSeries(seriesId, lookbackDays + 10);
  if (data.length < 10) return null;

  const latest = data[data.length - 1];
  const values = data.map((d) => d.value);
  const pct = computePercentile(seriesId, latest.value, lookbackDays);

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const zScore = std > 0 ? (latest.value - mean) / std : 0;

  const recent5 = data.slice(-5).map((d) => d.value);
  const earlier5 = data.slice(-10, -5).map((d) => d.value);
  const recentAvg = recent5.reduce((s, v) => s + v, 0) / recent5.length;
  const earlierAvg = earlier5.reduce((s, v) => s + v, 0) / earlier5.length;
  const changePct = earlierAvg !== 0
    ? ((recentAvg - earlierAvg) / Math.abs(earlierAvg)) * 100
    : 0;

  let direction: Feature["direction"] = "flat";
  if (changePct > 2) direction = "rising";
  else if (changePct < -2) direction = "falling";

  return {
    name: seriesId,
    value: latest.value,
    percentile: pct >= 0 ? pct : undefined,
    zScore: Math.round(zScore * 100) / 100,
    direction,
    lookbackDays,
  };
}

export interface VolatilityFeatures {
  atmIV: number | null;
  rv20d: number | null;
  rv60d: number | null;
  ivRvRatio: number | null;
  ivPercentile?: number;
  ivZScore?: number;
}

export function classifyIvRv(ratio: number | null): string {
  if (ratio == null) return "unknown";
  if (ratio > 1.5) return "very-rich";
  if (ratio > 1.2) return "rich";
  if (ratio > 0.9) return "fair";
  if (ratio > 0.7) return "cheap";
  return "very-cheap";
}

export interface PositioningFeatures {
  putCallOI: number | null;
  putCallVolume: number | null;
  callWallStrike: number | null;
  putWallStrike: number | null;
  callWallDistance: number | null;
  putWallDistance: number | null;
}

export function classifyPutCall(ratio: number | null): string {
  if (ratio == null) return "unknown";
  if (ratio > 1.5) return "heavy-put-skew";
  if (ratio > 1.0) return "put-skew";
  if (ratio > 0.6) return "balanced";
  if (ratio > 0.3) return "call-skew";
  return "heavy-call-skew";
}

export interface PriceFeatures {
  price: number;
  fiftyTwoWeekPct: number;
  distFromHigh: number;
  distFromLow: number;
}

export function computePriceFeatures(
  price: number,
  high52w: number,
  low52w: number
): PriceFeatures | null {
  const range = high52w - low52w;
  if (range <= 0) return null;
  return {
    price,
    fiftyTwoWeekPct: ((price - low52w) / range) * 100,
    distFromHigh: ((high52w - price) / high52w) * 100,
    distFromLow: ((price - low52w) / low52w) * 100,
  };
}
