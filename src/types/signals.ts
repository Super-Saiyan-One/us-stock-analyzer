import type { DataMeta } from "./data-meta";

export type SignalHorizon = "intraday" | "1-5d" | "1-3mo" | "long-term";
export type SignalCategory = "trend" | "volatility" | "positioning" | "valuation" | "event" | "liquidity";
export type SignalStatus = "risk-on" | "neutral" | "crowded" | "fragile" | "event-risk" | "liquidity-risk";

export interface SignalEvidence {
  indicator: string;
  currentValue: string;
  context: string;
}

export interface StockSignal {
  id: string;
  labelKey: string;
  horizon: SignalHorizon;
  category: SignalCategory;
  status: SignalStatus;
  score: number;
  confidence: "high" | "medium" | "low";
  evidence: SignalEvidence[];
  invalidation?: string;
  dataMeta?: DataMeta[];
  requiredInputs?: string[];
  missingInputs?: string[];
  severity?: "low" | "medium" | "high";
  backtestKey?: string;
}

export interface IVTermPoint {
  targetDTE: number;
  actualDTE: number;
  expiration: string;
  atmIV: number | null;
  quality?: "exact" | "approximate" | "duplicate";
}

export interface OptionsSummaryV2 {
  symbol: string;
  hasOptions: boolean;
  underlyingPrice: number;
  nearExpiration: string;
  nearDTE: number;
  putCallOIRatio: number | null;
  putCallVolumeRatio: number | null;
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  atmIV: number | null;
  atmCallIV: number | null;
  atmPutIV: number | null;
  ivTermStructure: IVTermPoint[];
  realizedVol20D: number | null;
  realizedVol60D: number | null;
  ivRvPremium: number | null;
  maxCallOIStrike: { strike: number; oi: number } | null;
  maxPutOIStrike: { strike: number; oi: number } | null;
  meta?: DataMeta;
}
