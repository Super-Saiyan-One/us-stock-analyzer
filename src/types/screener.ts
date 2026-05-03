import type { DataMeta } from "./data-meta";

export type UniverseId = "sp500" | "watchlist" | "custom";

export type ScreenerCategory =
  | "breakout"
  | "squeeze-setup"
  | "value"
  | "quality-growth"
  | "momentum"
  | "vol-rich"
  | "valuation-reset"
  | "neutral";

export interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;

  price: number;
  change1D: number;
  change5D: number;
  change20D: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekPct: number;
  relativeVolume: number;
  avgVolume20D: number;
  volume: number;

  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  beta: number | null;

  shortPercentOfFloat: number | null;
  shortRatio: number | null;

  compositeScore: number;
  category: ScreenerCategory;
  triggers: string[];

  updatedAt: string;
  meta?: DataMeta;
}

export interface ScreenerFilters {
  universe: UniverseId;
  customSymbols?: string[];
  categories?: ScreenerCategory[];
  minScore?: number;
  maxPE?: number;
  minMarketCap?: number;
  sortBy?: keyof ScreenerStock;
  sortDir?: "asc" | "desc";
}

export interface ScreenerResponse {
  stocks: ScreenerStock[];
  universe: UniverseId;
  totalSymbols: number;
  scannedAt: string;
  meta: DataMeta;
}

export interface SignalObservation {
  id?: number;
  symbol: string;
  signalId: string;
  category: string;
  score: number;
  priceAtSignal: number;
  observedAt: string;
  triggers: string[];
  regime?: string;
}

export interface BacktestResult {
  signalId: string;
  sampleCount: number;
  validSamples1D: number;
  validSamples5D: number;
  validSamples20D: number;
  hitRate1D: number;
  hitRate5D: number;
  hitRate20D: number;
  avgReturn1D: number;
  avgReturn5D: number;
  avgReturn20D: number;
  medianReturn1D: number;
  medianReturn5D: number;
  medianReturn20D: number;
  winRate1D: number;
  winRate5D: number;
  winRate20D: number;
  maxDrawdown: number;
  byRegime?: Record<string, Omit<BacktestResult, "signalId" | "byRegime">>;
}

export interface RawScreenData {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  price: number;
  previousClose: number;
  change1D: number;
  change5D: number;
  change20D: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume20D: number;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  beta: number | null;
  shortPercentOfFloat: number | null;
  shortRatio: number | null;
}
