export interface BtcDailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CbbiPoint {
  date: string;
  cbbi: number;
}

export type BtcStrategyTemplateId =
  | "cbbi_momentum_opt"
  | "cbbi_momentum"
  | "cbbi_ahr999_daily"
  | "smart_hold"
  | "bear01"
  | "buy_and_hold";

export interface BtcStrategyConfig {
  templateId: BtcStrategyTemplateId;
  name: string;
  momentumDays: number;
  exitMomentumDays: number;
  cbbiEntryMax: number;
  entryAhrMax: number;
  exitMomentumThreshold: number;
  exitCbbi: number;
  exitAhr: number;
  hardStopEnabled: boolean;
  stoplossPct: number;
  trendFastDays: number;
  trendSlowDays: number;
}

export interface BtcStrategyTemplate {
  id: BtcStrategyTemplateId;
  name: string;
  description: string;
  defaultConfig: BtcStrategyConfig;
}

export interface BtcStrategyIndicatorPoint extends BtcDailyCandle {
  cbbi: number | null;
  ahr999: number | null;
  sma200: number | null;
  ema50: number | null;
  ema100: number | null;
  ema200: number | null;
  cbbiMomentum: number | null;
  cbbiExitMomentum: number | null;
  ahrMomentum: number | null;
  entrySignal: boolean;
  exitSignal: boolean;
}

export type BtcTradeExitReason =
  | "cbbi_overheated"
  | "ahr_overheated"
  | "momentum_faded"
  | "trend_broken"
  | "stoploss";

export interface BtcStrategyTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  holdingDays: number;
  exitReason: BtcTradeExitReason;
}

export interface BtcStrategyOpenTrade {
  entryDate: string;
  entryPrice: number;
  currentDate: string;
  currentPrice: number;
  returnPct: number;
  holdingDays: number;
}

export type BtcZoneAction = "dca_buy" | "hold" | "dca_sell";
export type BtcZoneDegree = 0 | 25 | 50 | 75 | 100;
export type BtcZoneReasonTag =
  | "cbbi_low"
  | "ahr_low"
  | "momentum_rising"
  | "trend_ok"
  | "cbbi_hot"
  | "ahr_hot"
  | "momentum_faded"
  | "trend_broken";

export interface BtcStrategyZonePoint {
  date: string;
  close: number;
  action: BtcZoneAction;
  buyDegreePct: BtcZoneDegree;
  sellDegreePct: BtcZoneDegree;
  reasonTags: BtcZoneReasonTag[];
}

export interface BtcStrategyLatest {
  date: string | null;
  position: "long" | "cash";
  action: "buy" | "sell" | "hold";
  price: number | null;
  cbbi: number | null;
  ahr999: number | null;
}

export interface BtcStrategyStats {
  totalReturnPct: number;
  buyHoldReturnPct: number;
  excessReturnPct: number;
  tradeCount: number;
  winRatePct: number;
  averageReturnPct: number;
}

export interface BtcStrategyEvaluation {
  config: BtcStrategyConfig;
  indicators: BtcStrategyIndicatorPoint[];
  zonePoints: BtcStrategyZonePoint[];
  latestZone: BtcStrategyZonePoint;
  trades: BtcStrategyTrade[];
  openTrade: BtcStrategyOpenTrade | null;
  latest: BtcStrategyLatest;
  stats: BtcStrategyStats;
}

export interface BtcStrategyDataSource {
  priceSource: "binance" | "yahoo";
  priceAsOf: string | null;
  cbbiAsOf: string | null;
  isFallback?: boolean;
}

export interface BtcStrategyResponse extends BtcStrategyEvaluation {
  templates: BtcStrategyTemplate[];
  dataSource: BtcStrategyDataSource;
}
