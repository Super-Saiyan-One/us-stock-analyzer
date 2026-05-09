import type {
  UsIndexDailyCandle,
  UsIndexForwardPESignal,
  UsIndexMacroPoint,
  UsIndexQQQPESignal,
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
  fearWeight: 0.3,
  valuationWeight: 0.15,
  technicalWeight: 0.4,
  repairWeight: 0.15,
  bottomThreshold: 50,
  panicBottomThreshold: 50,
  pullbackBottomThreshold: 34,
  heatThreshold: 52,
  conflictGap: 5,
  rsiPeriod: 14,
  smaLongDays: 200,
  emaFastDays: 20,
  emaSlowDays: 50,
  forwardPeLow: 18,
  forwardPeHigh: 24,
  qqqPeWarning: 38,
  vixPanicThreshold: 30,
  vixComplacencyThreshold: 14,
  fearExtremeThreshold: 20,
  greedExtremeThreshold: 80,
};

const LEGACY_US_INDEX_BALANCED_DEFAULT: UsIndexStrategyConfig = {
  name: "USIndexZoneBalanced",
  fearWeight: 0.4,
  valuationWeight: 0.15,
  technicalWeight: 0.35,
  repairWeight: 0.1,
  bottomThreshold: 60,
  panicBottomThreshold: 60,
  pullbackBottomThreshold: 60,
  heatThreshold: 60,
  conflictGap: 15,
  rsiPeriod: 14,
  smaLongDays: 200,
  emaFastDays: 20,
  emaSlowDays: 50,
  forwardPeLow: 18,
  forwardPeHigh: 24,
  qqqPeWarning: 38,
  vixPanicThreshold: 30,
  vixComplacencyThreshold: 14,
  fearExtremeThreshold: 20,
  greedExtremeThreshold: 80,
};

const LEGACY_US_INDEX_RESEARCH_DEFAULT: UsIndexStrategyConfig = {
  name: "USIndexZoneResearchOpt",
  fearWeight: 0.45,
  valuationWeight: 0.15,
  technicalWeight: 0.3,
  repairWeight: 0.1,
  bottomThreshold: 46,
  panicBottomThreshold: 50,
  pullbackBottomThreshold: 34,
  heatThreshold: 56,
  conflictGap: 15,
  rsiPeriod: 14,
  smaLongDays: 200,
  emaFastDays: 20,
  emaSlowDays: 50,
  forwardPeLow: 18,
  forwardPeHigh: 24,
  qqqPeWarning: 38,
  vixPanicThreshold: 30,
  vixComplacencyThreshold: 14,
  fearExtremeThreshold: 20,
  greedExtremeThreshold: 80,
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
    panicBottomThreshold: clamp(merged.panicBottomThreshold, 0, 100),
    pullbackBottomThreshold: clamp(merged.pullbackBottomThreshold, 0, 100),
    heatThreshold: clamp(merged.heatThreshold, 0, 100),
    conflictGap: clamp(merged.conflictGap, 0, 100),
    rsiPeriod: clampInt(merged.rsiPeriod, 2, 60),
    smaLongDays: clampInt(merged.smaLongDays, 50, 400),
    emaFastDays: clampInt(merged.emaFastDays, 5, 200),
    emaSlowDays: clampInt(merged.emaSlowDays, 10, 300),
    forwardPeLow: clamp(merged.forwardPeLow, 1, 80),
    forwardPeHigh: clamp(merged.forwardPeHigh, 1, 100),
    qqqPeWarning: clamp(merged.qqqPeWarning, 1, 100),
    vixPanicThreshold: clamp(merged.vixPanicThreshold, 0, 100),
    vixComplacencyThreshold: clamp(merged.vixComplacencyThreshold, 0, 100),
    fearExtremeThreshold: clamp(merged.fearExtremeThreshold, 0, 100),
    greedExtremeThreshold: clamp(merged.greedExtremeThreshold, 0, 100),
    currentForwardPE: merged.currentForwardPE,
    currentQQQPE: merged.currentQQQPE,
  };
}

export function resolveUsIndexStrategyConfig(
  savedConfig: Partial<UsIndexStrategyConfig> | null | undefined
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
  const currentGate = {
    forwardPE: buildForwardPEGate(normalized),
    qqqPE: buildQQQPEGate(normalized),
    sentiment: buildCurrentSentimentGate(indicators.at(-1), normalized),
  };
  const latestZone = applyCurrentOnlyGates(zonePoints.at(-1) ?? EMPTY_ZONE, currentGate.qqqPE);
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
    currentGate,
  };
}

function isLegacyDefaultConfig(config: UsIndexStrategyConfig): boolean {
  return (
    matchesConfig(config, LEGACY_US_INDEX_BALANCED_DEFAULT) ||
    matchesConfig(config, LEGACY_US_INDEX_RESEARCH_DEFAULT)
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
  const drawdown63d = drawdownFromHighSeries(closes, 63);
  const drawdown126d = drawdownFromHighSeries(closes, 126);

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
      drawdown63dPct: drawdown63d[index],
      drawdown126dPct: drawdown126d[index],
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
      drawdown63dPct: drawdown63d[index],
      drawdown126dPct: drawdown126d[index],
      panicBottomScore: scores.panicBottomScore,
      pullbackBottomScore: scores.pullbackBottomScore,
      bottomScore: scores.bottomScore,
      heatScore: scores.heatScore,
    };
  });
}

function buildZonePoint(
  point: UsIndexStrategyIndicatorPoint,
  config: UsIndexStrategyConfig
): UsIndexStrategyZonePoint {
  const action = resolveUsIndexZoneActionForPoint(point, config);
  const score =
    action === "dca_buy"
      ? Math.max(point.panicBottomScore, point.pullbackBottomScore, point.bottomScore)
      : point.heatScore;
  const degree = action === "hold" ? 0 : toDegree(score);
  const reasonTags = getReasonTags(point, action, config);
  const boostedDegree =
    action === "dca_buy" && hasBuyEnhancer(point, config)
      ? increaseDegree(degree)
      : action === "dca_sell" && hasSellEnhancer(point, config)
        ? increaseDegree(degree)
        : degree;
  return {
    date: point.date,
    close: point.close,
    action,
    buyDegreePct: action === "dca_buy" ? boostedDegree : 0,
    sellDegreePct: action === "dca_sell" ? boostedDegree : 0,
    bottomScore: round2(point.bottomScore),
    heatScore: round2(point.heatScore),
    reasonTags,
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
  drawdown63dPct,
  drawdown126dPct,
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
  drawdown63dPct: number | null;
  drawdown126dPct: number | null;
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
  const panicBottomScore = clamp(
    0.55 * fearScore + 0.3 * oversoldScore + 0.15 * cheapScore,
    0,
    100
  );
  const pullbackDrawdownScore = averageScore([
    drawdown63dPct == null ? null : -drawdown63dPct * 10,
    drawdown126dPct == null ? null : -drawdown126dPct * 8,
  ]);
  const pullbackRawScore =
    0.35 * pullbackDrawdownScore +
    0.2 * averageScore([return20d == null ? null : -return20d * 5]) +
    0.2 * averageScore([rsi == null ? null : (50 - rsi) * 3]) +
    0.15 * averageScore([macro.fearGreed == null ? vixPercentile : 100 - macro.fearGreed]) +
    0.1 * averageScore([return60d == null ? null : -return60d * 3]);
  const valuationDrag = Math.max(0, expensiveScore - 65) * 0.08;
  const pullbackBottomScore = clamp(pullbackRawScore - valuationDrag, 0, 100);
  const weightedBottomScore = clamp(
    config.fearWeight * fearScore +
      config.valuationWeight * cheapScore +
      config.technicalWeight * oversoldScore +
      config.repairWeight * repairScore,
    0,
    100
  );

  return {
    panicBottomScore,
    pullbackBottomScore,
    bottomScore: Math.max(weightedBottomScore, panicBottomScore, pullbackBottomScore),
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

function resolveUsIndexZoneActionForPoint(
  point: UsIndexStrategyIndicatorPoint,
  config: UsIndexStrategyConfig
): UsIndexZoneAction {
  const panicActive =
    point.panicBottomScore >= config.panicBottomThreshold ||
    (point.bottomScore >= config.bottomThreshold && point.panicBottomScore >= point.pullbackBottomScore);
  const pullbackActive = point.pullbackBottomScore >= config.pullbackBottomThreshold;
  if (panicActive || pullbackActive) return "dca_buy";
  if (
    point.heatScore >= config.heatThreshold &&
    point.heatScore - point.bottomScore >= config.conflictGap
  ) {
    return "dca_sell";
  }
  return "hold";
}

function getReasonTags(
  point: UsIndexStrategyIndicatorPoint,
  action: UsIndexZoneAction,
  config: UsIndexStrategyConfig
): UsIndexReasonTag[] {
  const tags: UsIndexReasonTag[] = [];
  const forwardSignal = buildForwardPEGate(config)?.signal;
  if (action === "dca_buy") {
    if (point.panicBottomScore >= config.panicBottomThreshold || (point.vix != null && point.vix >= 25)) {
      tags.push("panic_bottom");
    }
    if (
      point.pullbackBottomScore >= config.pullbackBottomThreshold ||
      ((point.return20d != null && point.return20d < -5) &&
        (point.cape != null && point.cape >= 35))
    ) {
      tags.push("pullback_bottom");
    }
    if ((point.cape != null && point.cape < 28) || (point.trailingPE != null && point.trailingPE < 22)) {
      tags.push("cheap_valuation");
    }
    if ((point.cape != null && point.cape > 35) || (point.trailingPE != null && point.trailingPE > 27)) {
      tags.push("expensive_valuation");
    }
    if ((point.rsi != null && point.rsi < 45) || (point.return20d != null && point.return20d < -5)) {
      tags.push("oversold");
    }
    if (point.emaFast != null && point.close > point.emaFast) tags.push("trend_repair");
    if (forwardSignal === "undervalued") tags.push("forward_pe_low");
    if (point.vix != null && point.vix >= config.vixPanicThreshold) tags.push("vix_panic");
    if (point.fearGreed != null && point.fearGreed <= config.fearExtremeThreshold) tags.push("fear_extreme");
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
    if (point.vix != null && point.vix <= config.vixComplacencyThreshold) tags.push("vix_complacency");
    if (point.fearGreed != null && point.fearGreed >= config.greedExtremeThreshold) tags.push("greed_extreme");
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

function buildQQQPEGate(config: UsIndexStrategyConfig) {
  const gate = config.currentQQQPE;
  if (!gate || gate.value == null || !Number.isFinite(gate.value)) {
    return {
      date: gate?.date ?? null,
      value: gate?.value ?? null,
      source: gate?.source ?? null,
      methodology: gate?.methodology ?? null,
      signal: "unavailable" as const,
    };
  }
  const signal: UsIndexQQQPESignal = gate.value >= config.qqqPeWarning ? "warning" : "neutral";
  return {
    date: gate.date,
    value: gate.value,
    source: gate.source,
    methodology: gate.methodology,
    signal,
  };
}

function buildCurrentSentimentGate(
  point: UsIndexStrategyIndicatorPoint | undefined,
  config: UsIndexStrategyConfig
) {
  if (!point) return null;
  return {
    date: point.date,
    vix: point.vix,
    fearGreed: point.fearGreed,
    vixSignal:
      point.vix == null
        ? "unavailable"
        : point.vix >= config.vixPanicThreshold
          ? "panic"
          : point.vix <= config.vixComplacencyThreshold
            ? "complacency"
            : "neutral",
    fearGreedSignal:
      point.fearGreed == null
        ? "unavailable"
        : point.fearGreed <= config.fearExtremeThreshold
          ? "panic"
          : point.fearGreed >= config.greedExtremeThreshold
            ? "complacency"
            : "neutral",
  } as const;
}

function applyCurrentOnlyGates(
  zone: UsIndexStrategyZonePoint,
  qqqPE: ReturnType<typeof buildQQQPEGate> | null
): UsIndexStrategyZonePoint {
  if (qqqPE?.signal !== "warning") return zone;
  const reasonTags = zone.reasonTags.includes("qqq_pe_warning")
    ? zone.reasonTags
    : [...zone.reasonTags, "qqq_pe_warning" as const];
  if (zone.action === "dca_buy") {
    return {
      ...zone,
      buyDegreePct: decreaseDegreeSoft(zone.buyDegreePct),
      reasonTags,
    };
  }
  if (zone.action === "dca_sell") {
    return {
      ...zone,
      sellDegreePct: increaseDegree(zone.sellDegreePct),
      reasonTags,
    };
  }
  return { ...zone, reasonTags };
}

function hasBuyEnhancer(point: UsIndexStrategyIndicatorPoint, config: UsIndexStrategyConfig): boolean {
  return (
    (point.vix != null && point.vix >= config.vixPanicThreshold) ||
    (point.fearGreed != null && point.fearGreed <= config.fearExtremeThreshold)
  );
}

function hasSellEnhancer(point: UsIndexStrategyIndicatorPoint, config: UsIndexStrategyConfig): boolean {
  return (
    (point.vix != null && point.vix <= config.vixComplacencyThreshold) ||
    (point.fearGreed != null && point.fearGreed >= config.greedExtremeThreshold)
  );
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

function drawdownFromHighSeries(values: number[], lookback: number): (number | null)[] {
  return values.map((value, index) => {
    if (index < lookback - 1 || value <= 0) return null;
    const high = Math.max(...values.slice(index - lookback + 1, index + 1));
    if (high <= 0) return null;
    return (value / high - 1) * 100;
  });
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

function increaseDegree(degree: UsIndexZoneDegree): UsIndexZoneDegree {
  if (degree >= 75) return 100;
  if (degree >= 50) return 75;
  if (degree >= 25) return 50;
  return 25;
}

function decreaseDegreeSoft(degree: UsIndexZoneDegree): UsIndexZoneDegree {
  if (degree >= 100) return 75;
  if (degree >= 75) return 50;
  if (degree >= 50) return 25;
  return degree;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.000001;
}

function matchesConfig(config: UsIndexStrategyConfig, expected: UsIndexStrategyConfig): boolean {
  return (
    config.name === expected.name &&
    numberEquals(config.fearWeight, expected.fearWeight) &&
    numberEquals(config.valuationWeight, expected.valuationWeight) &&
    numberEquals(config.technicalWeight, expected.technicalWeight) &&
    numberEquals(config.repairWeight, expected.repairWeight) &&
    numberEquals(config.bottomThreshold, expected.bottomThreshold) &&
    numberEquals(config.heatThreshold, expected.heatThreshold) &&
    numberEquals(config.conflictGap, expected.conflictGap) &&
    config.rsiPeriod === expected.rsiPeriod &&
    config.smaLongDays === expected.smaLongDays &&
    config.emaFastDays === expected.emaFastDays &&
    config.emaSlowDays === expected.emaSlowDays &&
    numberEquals(config.forwardPeLow, expected.forwardPeLow) &&
    numberEquals(config.forwardPeHigh, expected.forwardPeHigh) &&
    numberEquals(config.qqqPeWarning, expected.qqqPeWarning) &&
    numberEquals(config.vixPanicThreshold, expected.vixPanicThreshold) &&
    numberEquals(config.vixComplacencyThreshold, expected.vixComplacencyThreshold) &&
    numberEquals(config.fearExtremeThreshold, expected.fearExtremeThreshold) &&
    numberEquals(config.greedExtremeThreshold, expected.greedExtremeThreshold)
  );
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
