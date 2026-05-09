import type {
  BtcDailyCandle,
  BtcStrategyConfig,
  BtcStrategyEvaluation,
  BtcStrategyIndicatorPoint,
  BtcStrategyOpenTrade,
  BtcStrategyStats,
  BtcStrategyTemplate,
  BtcStrategyTemplateId,
  BtcStrategyTrade,
  BtcStrategyZonePoint,
  BtcZoneDegree,
  BtcZoneReasonTag,
  CbbiPoint,
} from "@/types/btc-strategy";

export type {
  BtcDailyCandle,
  BtcStrategyConfig,
  BtcStrategyEvaluation,
  BtcStrategyIndicatorPoint,
  BtcStrategyOpenTrade,
  BtcStrategyStats,
  BtcStrategyTemplate,
  BtcStrategyTemplateId,
  BtcStrategyTrade,
  BtcStrategyZonePoint,
  CbbiPoint,
} from "@/types/btc-strategy";

export const DEFAULT_BTC_STRATEGY_CONFIG: BtcStrategyConfig = {
  templateId: "cbbi_ahr999_daily",
  name: "CbbiAhr999Daily",
  momentumDays: 3,
  exitMomentumDays: 3,
  cbbiEntryMax: 0.65,
  entryAhrMax: 1.2,
  exitMomentumThreshold: -0.02,
  exitCbbi: 0.75,
  exitAhr: 1.3,
  hardStopEnabled: false,
  stoplossPct: -25,
  trendFastDays: 100,
  trendSlowDays: 200,
};

export const BTC_STRATEGY_TEMPLATES: BtcStrategyTemplate[] = [
  {
    id: "cbbi_momentum_opt",
    name: "CbbiMomentumOpt",
    description: "Daily approximation of AutoQuant R104: CBBI momentum + EMA100/200 trend filter.",
    defaultConfig: {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      templateId: "cbbi_momentum_opt",
      name: "CbbiMomentumOpt",
      momentumDays: 3,
      exitMomentumDays: 3,
      cbbiEntryMax: 0.65,
      exitMomentumThreshold: -0.02,
      exitCbbi: 0.8,
      exitAhr: 20,
      stoplossPct: -25,
      trendFastDays: 100,
      trendSlowDays: 200,
    },
  },
  {
    id: "cbbi_momentum",
    name: "CbbiMomentum",
    description: "Daily approximation of the original CBBI momentum strategy from STRATEGY_MAP R99/R100.",
    defaultConfig: {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      templateId: "cbbi_momentum",
      name: "CbbiMomentum",
      momentumDays: 3,
      exitMomentumDays: 4,
      cbbiEntryMax: 0.65,
      exitMomentumThreshold: -0.03,
      exitCbbi: 0.8,
      exitAhr: 20,
      stoplossPct: -25,
      trendFastDays: 100,
      trendSlowDays: 200,
    },
  },
  {
    id: "cbbi_ahr999_daily",
    name: "CbbiAhr999Daily",
    description: "Daily CBBI + AHR999 momentum bottom-fishing strategy.",
    defaultConfig: DEFAULT_BTC_STRATEGY_CONFIG,
  },
  {
    id: "smart_hold",
    name: "SmartHold",
    description: "Bull-market hold template; exits on EMA50/200 death cross plus SMA200 break.",
    defaultConfig: {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      templateId: "smart_hold",
      name: "SmartHold",
      stoplossPct: -99,
      trendFastDays: 50,
      trendSlowDays: 200,
      exitAhr: 20,
      exitCbbi: 1,
    },
  },
  {
    id: "bear01",
    name: "Bear01",
    description: "SMA200 bear-market protection template; funding/stablecoin filters are omitted until those data sources exist.",
    defaultConfig: {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      templateId: "bear01",
      name: "Bear01",
      stoplossPct: -25,
      exitAhr: 20,
      exitCbbi: 1,
    },
  },
  {
    id: "buy_and_hold",
    name: "BuyAndHold",
    description: "Baseline template: enter once and hold.",
    defaultConfig: {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      templateId: "buy_and_hold",
      name: "BuyAndHold",
      stoplossPct: -99,
      exitAhr: 20,
      exitCbbi: 1,
    },
  },
];

const BTC_GENESIS_UTC = Date.UTC(2009, 0, 3);
const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_ZONE_POINT: BtcStrategyZonePoint = {
  date: "",
  close: 0,
  action: "hold",
  buyDegreePct: 0,
  sellDegreePct: 0,
  reasonTags: [],
};

export function evaluateBtcStrategy(
  candles: BtcDailyCandle[],
  cbbiPoints: CbbiPoint[],
  config: BtcStrategyConfig = DEFAULT_BTC_STRATEGY_CONFIG
): BtcStrategyEvaluation {
  const normalized = normalizeConfig(config);
  const indicators = buildIndicators(candles, cbbiPoints, normalized);
  const zonePoints = buildZonePoints(indicators, normalized);
  const { trades, openTrade } = buildTrades(indicators, normalized);
  const latestPoint = indicators.at(-1);
  const latestZone = zonePoints.at(-1) ?? EMPTY_ZONE_POINT;
  const latestTrade = trades.at(-1);
  const latestAction =
    latestPoint && openTrade?.entryDate === latestPoint.date
      ? "buy"
      : latestPoint && latestTrade?.exitDate === latestPoint.date
        ? "sell"
        : "hold";

  return {
    config: normalized,
    indicators,
    zonePoints,
    latestZone,
    trades,
    openTrade,
    latest: {
      date: latestPoint?.date ?? null,
      position: openTrade ? "long" : "cash",
      action: latestAction,
      price: latestPoint?.close ?? null,
      cbbi: latestPoint?.cbbi ?? null,
      ahr999: latestPoint?.ahr999 ?? null,
    },
    stats: computeStats(trades, indicators, openTrade),
  };
}

export function normalizeConfig(
  config: Partial<BtcStrategyConfig> = DEFAULT_BTC_STRATEGY_CONFIG
): BtcStrategyConfig {
  const template = getBtcStrategyTemplate(config.templateId);
  const merged = { ...template.defaultConfig, ...config };
  return {
    templateId: template.id,
    name: merged.name?.trim() || template.name,
    momentumDays: clampInt(merged.momentumDays, 1, 30),
    exitMomentumDays: clampInt(merged.exitMomentumDays, 1, 30),
    cbbiEntryMax: clamp(merged.cbbiEntryMax, 0, 1),
    entryAhrMax: clamp(merged.entryAhrMax, 0.1, 20),
    exitMomentumThreshold: clamp(merged.exitMomentumThreshold, -1, 1),
    exitCbbi: clamp(merged.exitCbbi, 0, 1),
    exitAhr: clamp(merged.exitAhr, 0.1, 20),
    hardStopEnabled: merged.hardStopEnabled === true,
    stoplossPct: clamp(merged.stoplossPct, -99, -1),
    trendFastDays: clampInt(merged.trendFastDays, 1, 400),
    trendSlowDays: clampInt(merged.trendSlowDays, 1, 500),
  };
}

export function getBtcStrategyTemplate(
  id: BtcStrategyTemplateId | string | undefined
): BtcStrategyTemplate {
  return (
    BTC_STRATEGY_TEMPLATES.find((template) => template.id === id) ??
    BTC_STRATEGY_TEMPLATES.find((template) => template.id === "cbbi_ahr999_daily")!
  );
}

function buildIndicators(
  candles: BtcDailyCandle[],
  cbbiPoints: CbbiPoint[],
  config: BtcStrategyConfig
): BtcStrategyIndicatorPoint[] {
  const sortedCandles = [...candles]
    .filter((candle) => Number.isFinite(candle.close))
    .sort((a, b) => a.date.localeCompare(b.date));
  const cbbiByDate = new Map(cbbiPoints.map((point) => [point.date, point.cbbi]));
  const ema50 = emaSeries(sortedCandles, 50);
  const ema100 = emaSeries(sortedCandles, 100);
  const ema200 = emaSeries(sortedCandles, 200);

  let previousEntryCondition = false;

  return sortedCandles.map((candle, index) => {
    const sma200 = averageClose(sortedCandles, index, 200);
    const ahr999 = sma200 == null ? null : computeAhr999(candle.date, candle.close, sma200);
    const cbbi = cbbiByDate.get(candle.date) ?? null;
    const past = sortedCandles[index - config.momentumDays];
    const exitPast = sortedCandles[index - config.exitMomentumDays];
    const pastCbbi = past ? cbbiByDate.get(past.date) ?? null : null;
    const exitPastCbbi = exitPast ? cbbiByDate.get(exitPast.date) ?? null : null;
    const pastSma200 = past ? averageClose(sortedCandles, index - config.momentumDays, 200) : null;
    const pastAhr =
      past && pastSma200 != null
        ? computeAhr999(past.date, past.close, pastSma200)
        : null;
    const cbbiMomentum = cbbi != null && pastCbbi != null ? cbbi - pastCbbi : null;
    const cbbiExitMomentum = cbbi != null && exitPastCbbi != null ? cbbi - exitPastCbbi : null;
    const ahrMomentum = ahr999 != null && pastAhr != null ? ahr999 - pastAhr : null;
    const emaFast = getTrendEma(config.trendFastDays, index, ema50, ema100, ema200);
    const emaSlow = getTrendEma(config.trendSlowDays, index, ema50, ema100, ema200);
    const { entryCondition, exitSignal } = evaluateTemplateCondition({
      point: candle,
      config,
      cbbi,
      ahr999,
      sma200,
      emaFast,
      emaSlow,
      cbbiMomentum,
      cbbiExitMomentum,
      ahrMomentum,
    });
    const entrySignal = entryCondition && !previousEntryCondition;
    previousEntryCondition = entryCondition;

    return {
      ...candle,
      cbbi,
      ahr999,
      sma200,
      ema50: ema50[index] ?? null,
      ema100: ema100[index] ?? null,
      ema200: ema200[index] ?? null,
      cbbiMomentum,
      cbbiExitMomentum,
      ahrMomentum,
      entrySignal,
      exitSignal,
    };
  });
}

function buildZonePoints(
  indicators: BtcStrategyIndicatorPoint[],
  config: BtcStrategyConfig
): BtcStrategyZonePoint[] {
  return indicators.map((point) => {
    const state = evaluateIndicatorCondition(point, config);

    if (state.exitSignal) {
      return {
        date: point.date,
        close: point.close,
        action: "dca_sell",
        buyDegreePct: 0,
        sellDegreePct: computeSellDegree(point, config),
        reasonTags: getSellReasonTags(point, config),
      };
    }

    if (state.entryCondition) {
      return {
        date: point.date,
        close: point.close,
        action: "dca_buy",
        buyDegreePct: computeBuyDegree(point, config),
        sellDegreePct: 0,
        reasonTags: getBuyReasonTags(point, config),
      };
    }

    return {
      date: point.date,
      close: point.close,
      action: "hold",
      buyDegreePct: 0,
      sellDegreePct: 0,
      reasonTags: [],
    };
  });
}

function evaluateIndicatorCondition(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
) {
  return evaluateTemplateCondition({
    point,
    config,
    cbbi: point.cbbi,
    ahr999: point.ahr999,
    sma200: point.sma200,
    emaFast: pickPointEma(point, config.trendFastDays),
    emaSlow: pickPointEma(point, config.trendSlowDays),
    cbbiMomentum: point.cbbiMomentum,
    cbbiExitMomentum: point.cbbiExitMomentum,
    ahrMomentum: point.ahrMomentum,
  });
}

function computeBuyDegree(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): BtcZoneDegree {
  const cbbiDegree = degreeFromLow(point.cbbi, config.cbbiEntryMax);
  const ahrDegree =
    config.templateId === "cbbi_ahr999_daily"
      ? degreeFromLow(point.ahr999, config.entryAhrMax)
      : 0;
  const degree = Math.max(cbbiDegree, ahrDegree);
  return degree > 0 ? toZoneDegree(degree) : 25;
}

function computeSellDegree(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): BtcZoneDegree {
  const cbbiDegree = degreeFromHigh(point.cbbi, config.exitCbbi, 1);
  const ahrDegree = degreeFromHigh(
    point.ahr999,
    config.exitAhr,
    Math.max(config.exitAhr * 2, config.exitAhr + 0.1)
  );
  const fallback = isTrendBroken(point, config) ? 100 : point.exitSignal ? 50 : 0;
  return toZoneDegree(Math.max(cbbiDegree, ahrDegree, fallback));
}

function getBuyReasonTags(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): BtcZoneReasonTag[] {
  const tags: BtcZoneReasonTag[] = [];
  if (point.cbbi != null && point.cbbi <= config.cbbiEntryMax) tags.push("cbbi_low");
  if (point.ahr999 != null && point.ahr999 <= config.entryAhrMax) tags.push("ahr_low");
  if (
    (point.cbbiMomentum != null && point.cbbiMomentum > 0) ||
    (point.ahrMomentum != null && point.ahrMomentum > 0)
  ) {
    tags.push("momentum_rising");
  }
  if (!isTrendBroken(point, config)) tags.push("trend_ok");
  return tags;
}

function getSellReasonTags(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): BtcZoneReasonTag[] {
  const tags: BtcZoneReasonTag[] = [];
  if (point.cbbi != null && point.cbbi > config.exitCbbi) tags.push("cbbi_hot");
  if (point.ahr999 != null && point.ahr999 > config.exitAhr) tags.push("ahr_hot");
  if (
    point.cbbiExitMomentum != null &&
    point.cbbiExitMomentum < config.exitMomentumThreshold
  ) {
    tags.push("momentum_faded");
  }
  if (isTrendBroken(point, config)) tags.push("trend_broken");
  return tags;
}

function degreeFromLow(value: number | null, max: number): number {
  if (value == null || !Number.isFinite(value) || max <= 0 || value > max) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 100;
  if (ratio <= 0.5) return 75;
  if (ratio <= 0.75) return 50;
  return 25;
}

function degreeFromHigh(
  value: number | null,
  threshold: number,
  ceiling: number
): number {
  if (
    value == null ||
    !Number.isFinite(value) ||
    value <= threshold ||
    ceiling <= threshold
  ) {
    return 0;
  }
  const ratio = (value - threshold) / (ceiling - threshold);
  if (ratio >= 0.75) return 100;
  if (ratio >= 0.5) return 75;
  if (ratio >= 0.25) return 50;
  return 25;
}

function toZoneDegree(value: number): BtcZoneDegree {
  if (value >= 100) return 100;
  if (value >= 75) return 75;
  if (value >= 50) return 50;
  if (value >= 25) return 25;
  return 0;
}

function buildTrades(
  indicators: BtcStrategyIndicatorPoint[],
  config: BtcStrategyConfig
): { trades: BtcStrategyTrade[]; openTrade: BtcStrategyOpenTrade | null } {
  const trades: BtcStrategyTrade[] = [];
  let entry: BtcStrategyIndicatorPoint | null = null;

  for (const point of indicators) {
    if (!entry) {
      if (point.entrySignal) entry = point;
      continue;
    }

    const stopPrice = entry.close * (1 + config.stoplossPct / 100);
    const stopHit = config.hardStopEnabled && point.low <= stopPrice;
    const exitReason = getExitReason(point, config);
    if (!stopHit && !exitReason) continue;

    const exitPrice = stopHit ? stopPrice : point.close;
    trades.push({
      entryDate: entry.date,
      exitDate: point.date,
      entryPrice: entry.close,
      exitPrice,
      returnPct: ((exitPrice - entry.close) / entry.close) * 100,
      holdingDays: daysBetween(entry.date, point.date),
      exitReason: stopHit ? "stoploss" : exitReason!,
    });
    entry = null;
  }

  const latest = indicators.at(-1);
  const openTrade =
    entry && latest
      ? {
          entryDate: entry.date,
          entryPrice: entry.close,
          currentDate: latest.date,
          currentPrice: latest.close,
          returnPct: ((latest.close - entry.close) / entry.close) * 100,
          holdingDays: daysBetween(entry.date, latest.date),
        }
      : null;

  return { trades, openTrade };
}

function evaluateTemplateCondition({
  point,
  config,
  cbbi,
  ahr999,
  sma200,
  emaFast,
  emaSlow,
  cbbiMomentum,
  cbbiExitMomentum,
  ahrMomentum,
}: {
  point: BtcDailyCandle;
  config: BtcStrategyConfig;
  cbbi: number | null;
  ahr999: number | null;
  sma200: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  cbbiMomentum: number | null;
  cbbiExitMomentum: number | null;
  ahrMomentum: number | null;
}) {
  const volumeOk = point.volume > 0;
  const trendUp = emaFast != null && emaSlow != null && emaFast > emaSlow;
  const trendDown = emaFast != null && emaSlow != null && emaFast < emaSlow;
  const aboveSma200 = sma200 != null && point.close > sma200;
  const belowSma200 = sma200 != null && point.close < sma200;

  switch (config.templateId) {
    case "cbbi_momentum_opt":
    case "cbbi_momentum": {
      const exitSignal =
        (cbbiExitMomentum != null && cbbiExitMomentum < config.exitMomentumThreshold) ||
        (cbbi != null && cbbi > config.exitCbbi) ||
        trendDown;
      return {
        entryCondition:
          cbbiMomentum != null &&
          cbbiMomentum > 0 &&
          cbbi != null &&
          cbbi < config.cbbiEntryMax &&
          trendUp &&
          volumeOk &&
          !exitSignal,
        exitSignal,
      };
    }
    case "smart_hold": {
      const exitSignal = trendDown && belowSma200;
      return {
        entryCondition: volumeOk && !exitSignal,
        exitSignal,
      };
    }
    case "bear01": {
      const exitSignal = belowSma200;
      return {
        entryCondition: aboveSma200 && volumeOk && !exitSignal,
        exitSignal,
      };
    }
    case "buy_and_hold":
      return {
        entryCondition: volumeOk,
        exitSignal: false,
      };
    case "cbbi_ahr999_daily":
    default: {
      const exitSignal =
        (cbbi != null && cbbi > config.exitCbbi) ||
        (ahr999 != null && ahr999 > config.exitAhr);
      return {
        entryCondition:
          cbbiMomentum != null &&
          ahrMomentum != null &&
          cbbiMomentum > 0 &&
          ahrMomentum > 0 &&
          cbbi != null &&
          cbbi < config.cbbiEntryMax &&
          ahr999 != null &&
          ahr999 < config.entryAhrMax &&
          volumeOk &&
          !exitSignal,
        exitSignal,
      };
    }
  }
}

function getExitReason(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): BtcStrategyTrade["exitReason"] | null {
  switch (config.templateId) {
    case "cbbi_momentum_opt":
    case "cbbi_momentum":
      if (
        point.cbbiExitMomentum != null &&
        point.cbbiExitMomentum < config.exitMomentumThreshold
      ) {
        return "momentum_faded";
      }
      if (point.cbbi != null && point.cbbi > config.exitCbbi) {
        return "cbbi_overheated";
      }
      if (isTrendBroken(point, config)) return "trend_broken";
      return null;
    case "smart_hold":
      return isTrendBroken(point, config) && point.sma200 != null && point.close < point.sma200
        ? "trend_broken"
        : null;
    case "bear01":
      return point.sma200 != null && point.close < point.sma200 ? "trend_broken" : null;
    case "buy_and_hold":
      return null;
    case "cbbi_ahr999_daily":
    default:
      if (point.cbbi != null && point.cbbi > config.exitCbbi) return "cbbi_overheated";
      if (point.ahr999 != null && point.ahr999 > config.exitAhr) return "ahr_overheated";
      return null;
  }
}

function isTrendBroken(
  point: BtcStrategyIndicatorPoint,
  config: BtcStrategyConfig
): boolean {
  const fast = pickPointEma(point, config.trendFastDays);
  const slow = pickPointEma(point, config.trendSlowDays);
  return fast != null && slow != null && fast < slow;
}

function pickPointEma(point: BtcStrategyIndicatorPoint, days: number): number | null {
  if (days === 50) return point.ema50;
  if (days === 100) return point.ema100;
  if (days === 200) return point.ema200;
  return null;
}

function computeStats(
  trades: BtcStrategyTrade[],
  indicators: BtcStrategyIndicatorPoint[],
  openTrade: BtcStrategyOpenTrade | null
): BtcStrategyStats {
  const firstComparable = indicators.find((point) => Number.isFinite(point.close));
  const lastComparable = indicators.at(-1);
  const buyHoldReturnPct =
    firstComparable && lastComparable
      ? ((lastComparable.close - firstComparable.close) / firstComparable.close) * 100
      : 0;
  const markToMarketTrade =
    openTrade
      ? {
          entryDate: openTrade.entryDate,
          exitDate: openTrade.currentDate,
          entryPrice: openTrade.entryPrice,
          exitPrice: openTrade.currentPrice,
          returnPct: openTrade.returnPct,
          holdingDays: openTrade.holdingDays,
          exitReason: "trend_broken" as const,
        }
      : null;
  const returnTrades = markToMarketTrade ? [...trades, markToMarketTrade] : trades;

  if (returnTrades.length === 0) {
    return {
      totalReturnPct: 0,
      buyHoldReturnPct,
      excessReturnPct: -buyHoldReturnPct,
      tradeCount: 0,
      winRatePct: 0,
      averageReturnPct: 0,
    };
  }

  const markedCompounded = returnTrades.reduce(
    (acc, trade) => acc * (1 + trade.returnPct / 100),
    1
  );
  const winners = returnTrades.filter((trade) => trade.returnPct > 0).length;
  const sum = returnTrades.reduce((acc, trade) => acc + trade.returnPct, 0);

  return {
    totalReturnPct: (markedCompounded - 1) * 100,
    buyHoldReturnPct,
    excessReturnPct: (markedCompounded - 1) * 100 - buyHoldReturnPct,
    tradeCount: trades.length,
    winRatePct: (winners / returnTrades.length) * 100,
    averageReturnPct: sum / returnTrades.length,
  };
}

function computeAhr999(date: string, close: number, sma200: number): number | null {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed) || !Number.isFinite(sma200) || sma200 <= 0) {
    return null;
  }
  const days = Math.max(1, (parsed - BTC_GENESIS_UTC) / DAY_MS);
  const growthLine = 10 ** (5.8450937 * Math.log10(days) - 17.015931);
  return (close / sma200) * (close / growthLine);
}

function averageClose(
  candles: BtcDailyCandle[],
  index: number,
  window: number
): number | null {
  if (index < window - 1) return null;
  let sum = 0;
  for (let i = index - window + 1; i <= index; i++) {
    sum += candles[i].close;
  }
  return sum / window;
}

function emaSeries(candles: BtcDailyCandle[], period: number): (number | null)[] {
  const result: (number | null)[] = Array.from({ length: candles.length }, () => null);
  if (candles.length < period) return result;

  const multiplier = 2 / (period + 1);
  let ema = averageClose(candles, period - 1, period);
  result[period - 1] = ema;

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * multiplier + (ema ?? candles[i].close) * (1 - multiplier);
    result[i] = ema;
  }

  return result;
}

function getTrendEma(
  period: number,
  index: number,
  ema50: (number | null)[],
  ema100: (number | null)[],
  ema200: (number | null)[]
): number | null {
  if (period === 50) return ema50[index] ?? null;
  if (period === 100) return ema100[index] ?? null;
  if (period === 200) return ema200[index] ?? null;
  return null;
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round(
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) /
      DAY_MS
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
