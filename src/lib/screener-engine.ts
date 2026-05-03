import type {
  RawScreenData,
  ScreenerStock,
  ScreenerCategory,
} from "@/types/screener";

interface ScoreBreakdown {
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  valuationScore: number;
  qualityScore: number;
}

function computeScores(s: RawScreenData): ScoreBreakdown {
  const range = s.fiftyTwoWeekHigh - s.fiftyTwoWeekLow;
  const fiftyTwoWeekPct =
    range > 0
      ? ((s.price - s.fiftyTwoWeekLow) / range) * 100
      : 50;

  // Trend: near 52W high = strong trend
  let trendScore = 50;
  if (fiftyTwoWeekPct > 90) trendScore = 85;
  else if (fiftyTwoWeekPct > 75) trendScore = 70;
  else if (fiftyTwoWeekPct < 15) trendScore = 20;
  else if (fiftyTwoWeekPct < 30) trendScore = 35;

  // Momentum: based on 5D and 20D returns
  let momentumScore = 50;
  if (s.change5D > 5) momentumScore += 15;
  else if (s.change5D > 2) momentumScore += 8;
  else if (s.change5D < -5) momentumScore -= 15;
  else if (s.change5D < -2) momentumScore -= 8;

  if (s.change20D > 10) momentumScore += 15;
  else if (s.change20D > 5) momentumScore += 8;
  else if (s.change20D < -10) momentumScore -= 15;
  else if (s.change20D < -5) momentumScore -= 8;

  momentumScore = Math.max(0, Math.min(100, momentumScore));

  // Volume: relative volume surge
  const relVol = s.avgVolume20D > 0 ? s.volume / s.avgVolume20D : 1;
  let volumeScore = 50;
  if (relVol > 3) volumeScore = 90;
  else if (relVol > 2) volumeScore = 75;
  else if (relVol > 1.5) volumeScore = 65;
  else if (relVol < 0.5) volumeScore = 30;

  // Valuation: lower PE with growth = better
  let valuationScore = 50;
  if (s.forwardPE != null && s.forwardPE > 0) {
    if (s.forwardPE < 10) valuationScore = 85;
    else if (s.forwardPE < 15) valuationScore = 75;
    else if (s.forwardPE < 20) valuationScore = 60;
    else if (s.forwardPE > 40) valuationScore = 25;
    else if (s.forwardPE > 30) valuationScore = 35;

    if (s.pegRatio != null && s.pegRatio > 0 && s.pegRatio < 1) {
      valuationScore += 10;
    }
  }
  valuationScore = Math.min(100, valuationScore);

  // Quality: margins + ROE + low debt
  let qualityScore = 50;
  if (s.profitMargins != null) {
    if (s.profitMargins > 0.25) qualityScore += 15;
    else if (s.profitMargins > 0.15) qualityScore += 8;
    else if (s.profitMargins < 0) qualityScore -= 15;
  }
  if (s.returnOnEquity != null) {
    if (s.returnOnEquity > 0.25) qualityScore += 10;
    else if (s.returnOnEquity > 0.15) qualityScore += 5;
    else if (s.returnOnEquity < 0) qualityScore -= 10;
  }
  if (s.revenueGrowth != null) {
    if (s.revenueGrowth > 0.2) qualityScore += 10;
    else if (s.revenueGrowth > 0.1) qualityScore += 5;
    else if (s.revenueGrowth < -0.1) qualityScore -= 10;
  }
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return { trendScore, momentumScore, volumeScore, valuationScore, qualityScore };
}

function classifyCategory(
  s: RawScreenData,
  scores: ScoreBreakdown
): { category: ScreenerCategory; triggers: string[] } {
  const range = s.fiftyTwoWeekHigh - s.fiftyTwoWeekLow;
  const fiftyTwoWeekPct =
    range > 0
      ? ((s.price - s.fiftyTwoWeekLow) / range) * 100
      : 50;
  const relVol = s.avgVolume20D > 0 ? s.volume / s.avgVolume20D : 1;

  const triggers: string[] = [];

  // Breakout: near 52W high + volume surge
  if (fiftyTwoWeekPct > 85 && relVol > 1.5) {
    triggers.push("near-52w-high", "volume-surge");
    if (s.change1D > 2) triggers.push("strong-day");
    return { category: "breakout", triggers };
  }

  // Squeeze setup: high short interest + price rising
  if (
    s.shortPercentOfFloat != null &&
    s.shortPercentOfFloat > 0.1 &&
    s.shortRatio != null &&
    s.shortRatio > 3 &&
    s.change5D > 0
  ) {
    triggers.push("high-short-interest", "short-ratio-elevated", "price-rising");
    return { category: "squeeze-setup", triggers };
  }

  // Momentum: strong recent performance
  if (s.change5D > 5 && s.change20D > 8) {
    triggers.push("strong-5d-momentum", "strong-20d-momentum");
    if (relVol > 1.3) triggers.push("above-avg-volume");
    return { category: "momentum", triggers };
  }

  // Quality growth: good margins + growth + reasonable valuation
  if (
    scores.qualityScore > 65 &&
    s.revenueGrowth != null &&
    s.revenueGrowth > 0.1 &&
    s.profitMargins != null &&
    s.profitMargins > 0.15
  ) {
    triggers.push("high-margins", "revenue-growth");
    if (s.returnOnEquity != null && s.returnOnEquity > 0.2) triggers.push("high-roe");
    return { category: "quality-growth", triggers };
  }

  // Value: low PE + decent fundamentals
  if (
    scores.valuationScore > 65 &&
    s.forwardPE != null &&
    s.forwardPE < 15 &&
    s.forwardPE > 0
  ) {
    triggers.push("low-forward-pe");
    if (s.pegRatio != null && s.pegRatio > 0 && s.pegRatio < 1) triggers.push("low-peg");
    if (s.earningsGrowth != null && s.earningsGrowth > 0) triggers.push("positive-earnings-growth");
    return { category: "value", triggers };
  }

  // Valuation reset: PE compression but growth intact
  if (
    s.trailingPE != null &&
    s.forwardPE != null &&
    s.forwardPE > 0 &&
    s.trailingPE > 0 &&
    s.forwardPE < s.trailingPE * 0.8 &&
    s.earningsGrowth != null &&
    s.earningsGrowth > 0.1
  ) {
    triggers.push("pe-compression", "earnings-growth-strong");
    return { category: "valuation-reset", triggers };
  }

  return { category: "neutral", triggers: ["no-strong-signal"] };
}

export function scoreStock(raw: RawScreenData): ScreenerStock {
  const scores = computeScores(raw);
  const { category, triggers } = classifyCategory(raw, scores);

  const range = raw.fiftyTwoWeekHigh - raw.fiftyTwoWeekLow;
  const fiftyTwoWeekPct =
    range > 0
      ? Math.round(((raw.price - raw.fiftyTwoWeekLow) / range) * 100)
      : 50;
  const relativeVolume =
    raw.avgVolume20D > 0
      ? Math.round((raw.volume / raw.avgVolume20D) * 100) / 100
      : 1;

  const weights = { trend: 0.25, momentum: 0.25, volume: 0.15, valuation: 0.2, quality: 0.15 };
  const compositeScore = Math.round(
    scores.trendScore * weights.trend +
      scores.momentumScore * weights.momentum +
      scores.volumeScore * weights.volume +
      scores.valuationScore * weights.valuation +
      scores.qualityScore * weights.quality
  );

  return {
    symbol: raw.symbol,
    name: raw.name,
    sector: raw.sector,
    industry: raw.industry,
    price: raw.price,
    change1D: Math.round(raw.change1D * 100) / 100,
    change5D: Math.round(raw.change5D * 100) / 100,
    change20D: Math.round(raw.change20D * 100) / 100,
    fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: raw.fiftyTwoWeekLow,
    fiftyTwoWeekPct,
    relativeVolume,
    avgVolume20D: raw.avgVolume20D,
    volume: raw.volume,
    marketCap: raw.marketCap,
    trailingPE: raw.trailingPE,
    forwardPE: raw.forwardPE,
    pegRatio: raw.pegRatio,
    revenueGrowth: raw.revenueGrowth,
    earningsGrowth: raw.earningsGrowth,
    profitMargins: raw.profitMargins,
    returnOnEquity: raw.returnOnEquity,
    debtToEquity: raw.debtToEquity,
    beta: raw.beta,
    shortPercentOfFloat: raw.shortPercentOfFloat,
    shortRatio: raw.shortRatio,
    compositeScore,
    category,
    triggers,
    updatedAt: new Date().toISOString(),
  };
}

export function scoreStocks(rawList: RawScreenData[]): ScreenerStock[] {
  return rawList
    .map(scoreStock)
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
