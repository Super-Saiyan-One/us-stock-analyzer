export type UsIndexSymbol = "SPY" | "QQQ";

export interface UsIndexDailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface UsIndexMacroPoint {
  date: string;
  vix: number | null;
  vix3m: number | null;
  skew: number | null;
  fearGreed: number | null;
  cape: number | null;
  trailingPE: number | null;
}

export interface UsIndexForwardPEGate {
  date: string | null;
  value: number | null;
}

export type UsIndexZoneAction = "dca_buy" | "hold" | "dca_sell";
export type UsIndexZoneDegree = 0 | 25 | 50 | 75 | 100;
export type UsIndexForwardPESignal = "undervalued" | "neutral" | "overvalued" | "unavailable";
export type UsIndexReasonTag =
  | "panic"
  | "panic_bottom"
  | "pullback_bottom"
  | "cheap_valuation"
  | "oversold"
  | "trend_repair"
  | "greed"
  | "expensive_valuation"
  | "overbought"
  | "trend_weakening"
  | "forward_pe_low"
  | "forward_pe_high";

export interface UsIndexStrategyConfig {
  name: string;
  fearWeight: number;
  valuationWeight: number;
  technicalWeight: number;
  repairWeight: number;
  bottomThreshold: number;
  panicBottomThreshold: number;
  pullbackBottomThreshold: number;
  heatThreshold: number;
  conflictGap: number;
  rsiPeriod: number;
  smaLongDays: number;
  emaFastDays: number;
  emaSlowDays: number;
  forwardPeLow: number;
  forwardPeHigh: number;
  currentForwardPE?: UsIndexForwardPEGate;
}

export interface UsIndexStrategyTemplate {
  id: string;
  name: string;
  description: string;
  defaultConfig: UsIndexStrategyConfig;
}

export interface UsIndexStrategyIndicatorPoint extends UsIndexDailyCandle {
  vix: number | null;
  vix3m: number | null;
  skew: number | null;
  fearGreed: number | null;
  cape: number | null;
  trailingPE: number | null;
  rsi: number | null;
  smaLong: number | null;
  emaFast: number | null;
  emaSlow: number | null;
  return20d: number | null;
  return60d: number | null;
  distanceFromSmaLongPct: number | null;
  drawdown63dPct: number | null;
  drawdown126dPct: number | null;
  panicBottomScore: number;
  pullbackBottomScore: number;
  bottomScore: number;
  heatScore: number;
}

export interface UsIndexStrategyZonePoint {
  date: string;
  close: number;
  action: UsIndexZoneAction;
  buyDegreePct: UsIndexZoneDegree;
  sellDegreePct: UsIndexZoneDegree;
  bottomScore: number;
  heatScore: number;
  reasonTags: UsIndexReasonTag[];
}

export interface UsIndexStrategyStats {
  totalReturnPct: number;
  buyHoldReturnPct: number;
  excessReturnPct: number;
  maxDrawdownPct: number;
  tradeCount: number;
}

export interface UsIndexStrategyLatest {
  date: string | null;
  price: number | null;
  action: UsIndexZoneAction;
  buyDegreePct: UsIndexZoneDegree;
  sellDegreePct: UsIndexZoneDegree;
  bottomScore: number;
  heatScore: number;
}

export interface UsIndexStrategyCurrentGate {
  forwardPE: {
    date: string | null;
    value: number | null;
    signal: UsIndexForwardPESignal;
  } | null;
}

export interface UsIndexStrategyEvaluation {
  config: UsIndexStrategyConfig;
  indicators: UsIndexStrategyIndicatorPoint[];
  zonePoints: UsIndexStrategyZonePoint[];
  latestZone: UsIndexStrategyZonePoint;
  latest: UsIndexStrategyLatest;
  stats: UsIndexStrategyStats;
  currentGate: UsIndexStrategyCurrentGate;
}

export interface UsIndexStrategyDataSource {
  priceSource: "yahoo";
  macroSource: "yahoo-cnn-shiller-stockmarketperatio";
  priceAsOf: string | null;
  macroAsOf: string | null;
  forwardPEAsOf: string | null;
  isFallback?: boolean;
}

export interface UsIndexStrategyResponse extends UsIndexStrategyEvaluation {
  symbol: UsIndexSymbol;
  templates: UsIndexStrategyTemplate[];
  dataSource: UsIndexStrategyDataSource;
}
