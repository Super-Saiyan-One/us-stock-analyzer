import type {
  UsIndexDailyCandle,
  UsIndexForwardPESignal,
  UsIndexMacroPoint,
  UsIndexReasonTag,
  UsIndexStrategyConfig,
  UsIndexStrategyEvaluation,
  UsIndexStrategyIndicatorPoint,
  UsIndexStrategyStats,
  UsIndexStrategyTemplate,
  UsIndexStrategyZonePoint,
  UsIndexZoneAction,
  UsIndexZoneDegree,
} from "@/types/us-index-strategy";

export const DEFAULT_US_INDEX_STRATEGY_CONFIG: UsIndexStrategyConfig = {
  name: "USIndexZoneResearchOpt",
  fearWeight: 0.45,
  valuationWeight: 0.15,
  technicalWeight: 0.3,
  repairWeight: 0.1,
  bottomThreshold: 46,
  heatThreshold: 56,
  conflictGap: 15,
  rsiPeriod: 14,
  smaLongDays: 200,
  emaFastDays: 20,
  emaSlowDays: 50,
  forwardPeLow: 18,
  forwardPeHigh: 24,
};

const LEGACY_US_INDEX_BALANCED_DEFAULT: UsIndexStrategyConfig = {
  name: "USIndexZoneBalanced",
  fearWeight: 0.4,
  valuationWeight: 0.15,
  technicalWeight: 0.35,
  repairWeight: 0.1,
  bottomThreshold: 60,
  heatThreshold: 60,
  conflictGap: 15,
  rsiPeriod: 14,
  smaLongDays: 200,
  emaFastDays: 20,
  emaSlowDays: 50,
  forwardPeLow: 18,
  forwardPeHigh: 24,
};

export const US_INDEX_STRATEGY_TEMPLATES: UsIndexStrategyTemplate[] = [
  {
    id: "research_opt_v1",
    name: "Research Optimized v1",
    description: "SPY/QQQ joint parameter search from AutoQuantStock using technical, fear, and historical valuation data.",
    defaultConfig: DEFAULT_US_INDEX_STRATEGY_CONFIG,
  },
];

const EMPTY_ZONE: UsIndexStrategyZonePoint = {
  date: "",
  close: 0,
  action: "hold",
  buyDegreePct: 0,
  sellDegreePct: 0,
  bottomScore: 0,
  heatScore: 0,
  reasonTags: [],
};

export function normalizeUsIndexStrategyConfig(
  input: Partial<UsIndexStrategyConfig> = DEFAULT_US_INDEX_STRATEGY_CONFIG
): UsIndexStrategyConfig {
  const merged = { ...DEFAULT_US_INDEX_STRATEGY_CONFIG, ...input };
  const rawWeights = [
    Math.max(0, finiteOr(merged.fearWeight, 0)),
    Math.max(0, finiteOr(merged.valuationWeight, 0)),
    Math.max(0, finiteOr(merged.technicalWeight, 0)),
    Math.max(0, finiteOr(merged.repairWeight, 0)),
  ];
  const sum = rawWeights.reduce((acc, value) => acc + value, 0) || 1;
  return {
    name: merged.name?.trim() || DEFAULT_US_INDEX_STRATEGY_CONFIG.name,
    fearWeight: rawWeights[0] / sum,
    valuationWeight: rawWeights[1] / sum,
    technicalWeight: rawWeights[2] / sum,
    repairWeight: rawWeights[3] / sum,
    bottomThreshold: clamp(merged.bottomThreshold, 0, 100),
    heatThreshold: clamp(merged.heatThreshold, 0, 100),
    conflictGap: clamp(merged.conflictGap, 0, 100),
    rsiPeriod: clampInt(merged.rsiPeriod, 2, 60),
    smaLongDays: clampInt(merged.smaLongDays, 50, 400),
    emaFastDays: clampInt(merged.emaFastDays, 5, 200),
    emaSlowDays: clampInt(merged.emaSlowDays, 10, 300),
    forwardPeLow: clamp(merged.forwardPeLow, 1, 80),
    forwardPeHigh: clamp(merged.forwardPeHigh, 1, 100),
    currentForwardPE: merged.currentForwardPE,
  };
}

export function resolveUsIndexStrategyConfig(
  savedConfig: UsIndexStrategyConfig | null | undefined
): UsIndexStrategyConfig {
  if (!savedConfig) return DEFAULT_US_INDEX_STRATEGY_CONFIG;
  const normalized = normalizeUsIndexStrategyConfig(savedConfig);
  if (isLegacyDefaultConfig(normalized)) return DEFAULT_US_INDEX_STRATEGY_CONFIG;
  return normalized;
}

export function evaluateUsIndexStrategy(
  candles: UsIndexDailyCandle[],
  macroPoints: UsIndexMacroPoint[],
  config: Partial<UsIndexStrategyConfig> = DEFAULT_US_INDEX_STRATEGY_CONFIG
): UsIndexStrategyEvaluation {
  const normalized = normalizeUsIndexStrategyConfig(config);
  const indicators = buildIndicators(candles, macroPoints, normalized);
  const zonePoints = indicators.map((point) => buildZonePoint(point, normalized));
  const latestZone = zonePoints.at(-1) ?? EMPTY_ZONE;
  return {
    config: normalized,
    indicators,
    zonePoints,
    latestZone,
    latest: {
      date: latestZone.date || null,
      price: latestZone.close || null,
      action: latestZone.action,
      buyDegreePct: latestZone.buyDegreePct,
      sellDegreePct: latestZone.sellDegreePct,
      bottomScore: latestZone.bottomScore,
      heatScore: latestZone.heatScore,
    },
    stats: computeStats(zonePoints),
    currentGate: {
      forwardPE: buildForwardPEGate(normalized),
    },
  };
}

function isLegacyDefaultConfig(config: UsIndexStrategyConfig): boolean {
  return (
    config.name === LEGACY_US_INDEX_BALANCED_DEFAULT.name &&
    numberEquals(config.fearWeight, LEGACY_US_INDEX_BALANCED_DEFAULT.fearWeight) &&
    numberEquals(config.valuationWeight, LEGACY_US_INDEX_BALANCED_DEFAULT.valuationWeight) &&
    numberEquals(config.technicalWeight, LEGACY_US_INDEX_BALANCED_DEFAULT.technicalWeight) &&
    numberEquals(config.repairWeight, LEGACY_US_INDEX_BALANCED_DEFAULT.repairWeight) &&
    numberEquals(config.bottomThreshold, LEGACY_US_INDEX_BALANCED_DEFAULT.bottomThreshold) &&
    numberEquals(config.heatThreshold, LEGACY_US_INDEX_BALANCED_DEFAULT.heatThreshold) &&
    numberEquals(config.conflictGap, LEGACY_US_INDEX_BALANCED_DEFAULT.conflictGap) &&
    config.rsiPeriod === LEGACY_US_INDEX_BALANCED_DEFAULT.rsiPeriod &&
    config.smaLongDays === LEGACY_US_INDEX_BALANCED_DEFAULT.smaLongDays &&
    config.emaFastDays === LEGACY_US_INDEX_BALANCED_DEFAULT.emaFastDays &&
    config.emaSlowDays === LEGACY_US_INDEX_BALANCED_DEFAULT.emaSlowDays &&
    numberEquals(config.forwardPeLow, LEGACY_US_INDEX_BALANCED_DEFAULT.forwardPeLow) &&
    numberEquals(config.forwardPeHigh, LEGACY_US_INDEX_BALANCED_DEFAULT.forwardPeHigh)
  );
}

export function resolveUsIndexZoneAction(
  bottomScore: number,
  heatScore: number,
  config: UsIndexStrategyConfig
): UsIndexZoneAction {
  if (
    bottomScore >= config.bottomThreshold &&
    bottomScore - heatScore >= config.conflictGap
  ) {
    return "dca_buy";
  }
  if (
    heatScore >= config.heatThreshold &&
    heatScore - bottomScore >= config.conflictGap
  ) {
    return "dca_sell";
  }
  return "hold";
}

function buildIndicators(
  candles: UsIndexDailyCandle[],
  macroPoints: UsIndexMacroPoint[],
  config: UsIndexStrategyConfig
): UsIndexStrategyIndicatorPoint[] {
  const sorted = [...candles]
    .filter((point) => Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const macroByDate = new Map(macroPoints.map((point) => [point.date, point]));
  const closes = sorted.map((point) => point.close);
  const rsiValues = rsiSeries(closes, config.rsiPeriod);
  const smaLong = smaSeries(closes, config.smaLongDays);
  const emaFast = emaSeries(closes, config.emaFastDays);
  const emaSlow = emaSeries(closes, config.emaSlowDays);

  const vixValues = macroAligned(sorted, macroByDate, "vix");
  const skewValues = macroAligned(sorted, macroByDate, "skew");
  const capeValues = macroAligned(sorted, macroByDate, "cape");
  const trailingPeValues = macroAligned(sorted, macroByDate, "trailingPE");
  const vixPercentiles = percentileSeries(vixValues);
  const skewPercentiles = percentileSeries(skewValues);
  const capePercentiles = percentileSeries(capeValues);
  const trailingPePercentiles = percentileSeries(trailingPeValues);

  return sorted.map((point, index) => {
    const macro = fillMacroAt(sorted, macroByDate, index);
    const return20d = returnPct(sorted, index, 20);
    const return60d = returnPct(sorted, index, 60);
    const distanceFromSmaLongPct =
      smaLong[index] == null ? null : ((point.close - smaLong[index]!) / smaLong[index]!) * 100;
    const scores = computeScores({
      point,
      macro,
      rsi: rsiValues[index],
      emaFast: emaFast[index],
      emaSlow: emaSlow[index],
      return20d,
      return60d,
      distanceFromSmaLongPct,
      vixPercentile: vixPercentiles[index],
      skewPercentile: skewPercentiles[index],
      capePercentile: capePercentiles[index],
      trailingPePercentile: trailingPePercentiles[index],
      config,
    });

    return {
      ...point,
      vix: macro.vix,
      vix3m: macro.vix3m,
      skew: macro.skew,
      fearGreed: macro.fearGreed,
      cape: macro.cape,
      trailingPE: macro.trailingPE,
      rsi: rsiValues[index],
      smaLong: smaLong[index],
      emaFast: emaFast[index],
      emaSlow: emaSlow[index],
      return20d,
      return60d,
      distanceFromSmaLongPct,
      bottomScore: scores.bottomScore,
      heatScore: scores.heatScore,
    };
  });
}

function buildZonePoint(
  point: UsIndexStrategyIndicatorPoint,
  config: UsIndexStrategyConfig
): UsIndexStrategyZonePoint {
  const action = resolveUsIndexZoneAction(point.bottomScore, point.heatScore, config);
  const score = Math.max(point.bottomScore, point.heatScore);
  const degree = action === "hold" ? 0 : toDegree(score);
  return {
    date: point.date,
    close: point.close,
    action,
    buyDegreePct: action === "dca_buy" ? degree : 0,
    sellDegreePct: action === "dca_sell" ? degree : 0,
    bottomScore: round2(point.bottomScore),
    heatScore: round2(point.heatScore),
    reasonTags: getReasonTags(point, action, config),
  };
}

function computeScores({
  point,
  macro,
  rsi,
  emaFast,
  emaSlow,
  return20d,
  return60d,
  distanceFromSmaLongPct,
  vixPercentile,
  skewPercentile,
  capePercentile,
  trailingPePercentile,
  config,
}: {
  point: UsIndexDailyCandle;
  macro: UsIndexMacroPoint;
  rsi: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  return20d: number | null;
  return60d: number | null;
  distanceFromSmaLongPct: number | null;
  vixPercentile: number | null;
  skewPercentile: number | null;
  capePercentile: number | null;
  trailingPePercentile: number | null;
  config: UsIndexStrategyConfig;
}) {
  const vixCurve =
    macro.vix != null && macro.vix3m != null && macro.vix3m > 0 ? macro.vix / macro.vix3m : null;
  const fearScore = averageScore([
    vixPercentile,
    macro.fearGreed == null ? null : 100 - macro.fearGreed,
    vixCurve == null ? null : ((vixCurve - 0.85) / 0.35) * 100,
    skewPercentile == null ? null : skewPercentile * 0.7,
  ]);
  const greedScore = averageScore([
    vixPercentile == null ? null : 100 - vixPercentile,
    macro.fearGreed,
    vixCurve == null ? null : 100 - ((vixCurve - 0.85) / 0.35) * 100,
    skewPercentile,
  ]);
  const cheapScore = averageScore([
    capePercentile == null ? null : 100 - capePercentile,
    trailingPePercentile == null ? null : 100 - trailingPePercentile,
  ]);
  const expensiveScore = averageScore([capePercentile, trailingPePercentile]);
  const oversoldScore = averageScore([
    rsi == null ? null : (50 - rsi) * 2,
    return20d == null ? null : -return20d * 3,
    distanceFromSmaLongPct == null ? null : -distanceFromSmaLongPct * 2,
  ]);
  const overboughtScore = averageScore([
    rsi == null ? null : (rsi - 55) * 2,
    return60d == null ? null : return60d * 2,
    distanceFromSmaLongPct == null ? null : distanceFromSmaLongPct * 2,
  ]);
  const repairScore = averageScore([
    emaFast != null && point.close > emaFast ? 100 : 0,
    emaFast != null && emaSlow != null && emaFast > emaSlow ? 100 : 0,
    return20d != null && return20d > 0 ? 100 : 0,
  ]);
  const weakeningScore = averageScore([
    emaFast != null && point.close < emaFast ? 100 : 0,
    emaFast != null && emaSlow != null && emaFast < emaSlow ? 100 : 0,
    return20d != null && return20d < 0 ? 100 : 0,
  ]);

  return {
    bottomScore: clamp(
      config.fearWeight * fearScore +
        config.valuationWeight * cheapScore +
        config.technicalWeight * oversoldScore +
        config.repairWeight * repairScore,
      0,
      100
    ),
    heatScore: clamp(
      config.fearWeight * greedScore +
        config.valuationWeight * expensiveScore +
        config.technicalWeight * overboughtScore +
        config.repairWeight * weakeningScore,
      0,
      100
    ),
  };
}

function getReasonTags(
  point: UsIndexStrategyIndicatorPoint,
  action: UsIndexZoneAction,
  config: UsIndexStrategyConfig
): UsIndexReasonTag[] {
  const tags: UsIndexReasonTag[] = [];
  const forwardSignal = buildForwardPEGate(config)?.signal;
  if (action === "dca_buy") {
    if (point.vix != null && point.vix >= 25) tags.push("panic");
    if ((point.cape != null && point.cape < 28) || (point.trailingPE != null && point.trailingPE < 22)) {
      tags.push("cheap_valuation");
    }
    if ((point.rsi != null && point.rsi < 45) || (point.return20d != null && point.return20d < -5)) {
      tags.push("oversold");
    }
    if (point.emaFast != null && point.close > point.emaFast) tags.push("trend_repair");
    if (forwardSignal === "undervalued") tags.push("forward_pe_low");
  }
  if (action === "dca_sell") {
    if (point.fearGreed != null && point.fearGreed >= 70) tags.push("greed");
    if ((point.cape != null && point.cape > 35) || (point.trailingPE != null && point.trailingPE > 27)) {
      tags.push("expensive_valuation");
    }
    if ((point.rsi != null && point.rsi > 65) || (point.distanceFromSmaLongPct != null && point.distanceFromSmaLongPct > 15)) {
      tags.push("overbought");
    }
    if (point.emaFast != null && point.close < point.emaFast) tags.push("trend_weakening");
    if (forwardSignal === "overvalued") tags.push("forward_pe_high");
  }
  return tags;
}

function buildForwardPEGate(config: UsIndexStrategyConfig) {
  const gate = config.currentForwardPE;
  if (!gate || gate.value == null || !Number.isFinite(gate.value)) {
    return { date: gate?.date ?? null, value: gate?.value ?? null, signal: "unavailable" as const };
  }
  let signal: UsIndexForwardPESignal = "neutral";
  if (gate.value <= config.forwardPeLow) signal = "undervalued";
  if (gate.value >= config.forwardPeHigh) signal = "overvalued";
  return { date: gate.date, value: gate.value, signal };
}

function computeStats(zonePoints: UsIndexStrategyZonePoint[]): UsIndexStrategyStats {
  const first = zonePoints.find((point) => point.close > 0);
  const last = zonePoints.at(-1);
  const buyHoldReturnPct = first && last ? ((last.close - first.close) / first.close) * 100 : 0;
  let equity = 1;
  let peak = 1;
  let maxDrawdownPct = 0;
  for (let i = 1; i < zonePoints.length; i++) {
    const prev = zonePoints[i - 1];
    const current = zonePoints[i];
    const exposure = prev.action === "dca_buy" ? 1 : prev.action === "dca_sell" ? 0.5 : 0.75;
    const dailyReturn = (current.close - prev.close) / prev.close;
    equity *= 1 + exposure * dailyReturn;
    peak = Math.max(peak, equity);
    maxDrawdownPct = Math.min(maxDrawdownPct, ((equity - peak) / peak) * 100);
  }
  const tradeCount = zonePoints.filter(
    (point, index) => index > 0 && point.action !== zonePoints[index - 1].action
  ).length;
  const totalReturnPct = (equity - 1) * 100;
  return {
    totalReturnPct,
    buyHoldReturnPct,
    excessReturnPct: totalReturnPct - buyHoldReturnPct,
    maxDrawdownPct,
    tradeCount,
  };
}

function macroAligned(
  candles: UsIndexDailyCandle[],
  macroByDate: Map<string, UsIndexMacroPoint>,
  key: keyof Omit<UsIndexMacroPoint, "date">
): (number | null)[] {
  let latest: number | null = null;
  return candles.map((candle) => {
    const value = macroByDate.get(candle.date)?.[key];
    if (typeof value === "number" && Number.isFinite(value)) latest = value;
    return latest;
  });
}

function fillMacroAt(
  candles: UsIndexDailyCandle[],
  macroByDate: Map<string, UsIndexMacroPoint>,
  index: number
): UsIndexMacroPoint {
  for (let i = index; i >= 0; i--) {
    const point = macroByDate.get(candles[i].date);
    if (point) return point;
  }
  return {
    date: candles[index].date,
    vix: null,
    vix3m: null,
    skew: null,
    fearGreed: null,
    cape: null,
    trailingPE: null,
  };
}

function returnPct(candles: UsIndexDailyCandle[], index: number, days: number): number | null {
  const past = candles[index - days];
  if (!past || past.close <= 0) return null;
  return ((candles[index].close - past.close) / past.close) * 100;
}

function rsiSeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  for (let i = period; i < values.length; i++) {
    let gain = 0;
    let loss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const delta = values[j] - values[j - 1];
      if (delta >= 0) gain += delta;
      else loss -= delta;
    }
    if (loss === 0 && gain === 0) result[i] = 50;
    else if (loss === 0) result[i] = 100;
    else {
      const rs = gain / loss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

function smaSeries(values: number[], period: number): (number | null)[] {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) sum += values[i];
    return sum / period;
  });
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((acc, value) => acc + value, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result[i] = ema;
  }
  return result;
}

function percentileSeries(values: (number | null)[], lookback = 756): (number | null)[] {
  return values.map((value, index) => {
    if (value == null || !Number.isFinite(value)) return null;
    const start = Math.max(0, index - lookback + 1);
    const sample = values
      .slice(start, index + 1)
      .filter((item): item is number => item != null && Number.isFinite(item));
    if (sample.length < 20) return 50;
    const min = Math.min(...sample);
    const max = Math.max(...sample);
    if (min === max) return 50;
    return (sample.filter((item) => item <= value).length / sample.length) * 100;
  });
}

function averageScore(values: (number | null | undefined)[]): number {
  const valid = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map((value) => clamp(value, 0, 100));
  if (valid.length === 0) return 50;
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
}

function toDegree(score: number): UsIndexZoneDegree {
  if (score >= 70) return 100;
  if (score >= 55) return 75;
  if (score >= 40) return 50;
  if (score >= 25) return 25;
  return 0;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.000001;
}

function clamp(value: number | undefined, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number | undefined, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
