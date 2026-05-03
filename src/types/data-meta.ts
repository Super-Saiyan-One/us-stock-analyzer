export type DataFrequency = "realtime" | "15min" | "on-demand" | "daily" | "weekly" | "bimonthly" | "monthly" | "quarterly";
export type DataConfidence = "high" | "medium" | "low";

export interface DataMeta {
  source: string;
  provider?: string;
  seriesId?: string;
  asOf: string;
  fetchedAt: string;
  frequency: DataFrequency;
  releaseLag?: string;
  confidence: DataConfidence;
  note?: string;
}

export interface MetricWithMeta<T = number> {
  value: T;
  prev?: T;
  change?: number;
  percentile?: number;
  meta: DataMeta;
}

export type RegimeDimension =
  | "trend"
  | "volatility"
  | "credit"
  | "rates"
  | "liquidity"
  | "valuation";

export type RegimeSignal = "risk-on" | "neutral" | "caution" | "risk-off";

export interface RegimeDimensionData {
  dimension: RegimeDimension;
  signal: RegimeSignal;
  label: string;
  detail: string;
  percentile: number;
  direction: "improving" | "stable" | "deteriorating";
  meta: DataMeta;
}

export interface MarketRegime {
  overall: RegimeSignal;
  dimensions: RegimeDimensionData[];
  timestamp: string;
}
