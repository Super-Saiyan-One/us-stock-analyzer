import type { DataFrequency, DataConfidence } from "@/types/data-meta";

export type SourceFrequency = DataFrequency;
export type SourceConfidence = DataConfidence;

export interface DataSourceDef {
  id: string;
  name: string;
  provider: string;
  license: "free-personal" | "free-commercial" | "paid" | "public-domain";
  frequency: SourceFrequency;
  releaseLag: string;
  confidence: SourceConfidence;
  authRequired: boolean;
  rateLimit?: string;
  note?: string;
}

const SOURCES: Record<string, DataSourceDef> = {
  "yahoo-chart": {
    id: "yahoo-chart",
    name: "Yahoo Finance Chart API",
    provider: "Yahoo Finance",
    license: "free-personal",
    frequency: "15min",
    releaseLag: "15-20 min during market hours",
    confidence: "high",
    authRequired: false,
    rateLimit: "~2 req/sec (undocumented)",
    note: "v8 chart endpoint, no crumb required",
  },
  "yahoo-search": {
    id: "yahoo-search",
    name: "Yahoo Finance Search API",
    provider: "Yahoo Finance",
    license: "free-personal",
    frequency: "realtime",
    releaseLag: "none",
    confidence: "high",
    authRequired: false,
  },
  yfinance: {
    id: "yfinance",
    name: "yfinance (Python)",
    provider: "Yahoo Finance (via yfinance)",
    license: "free-personal",
    frequency: "15min",
    releaseLag: "15-20 min during market hours",
    confidence: "high",
    authRequired: false,
    note: "Handles crumb/cookie auth transparently",
  },
  "yfinance-options": {
    id: "yfinance-options",
    name: "yfinance Options Chain",
    provider: "Yahoo Finance (via yfinance)",
    license: "free-personal",
    frequency: "daily",
    releaseLag: "OI reflects prior day settlement, not intraday",
    confidence: "medium",
    authRequired: false,
    note: "Not real-time OPRA data. OI updates overnight.",
  },
  fred: {
    id: "fred",
    name: "FRED (Federal Reserve Economic Data)",
    provider: "Federal Reserve Bank of St. Louis",
    license: "public-domain",
    frequency: "daily",
    releaseLag: "varies by series (same-day to 1 month)",
    confidence: "high",
    authRequired: true,
    rateLimit: "120 req/min",
  },
  shiller: {
    id: "shiller",
    name: "Shiller CAPE Data",
    provider: "Robert Shiller / Yale",
    license: "public-domain",
    frequency: "monthly",
    releaseLag: "~3 weeks (monthly update)",
    confidence: "high",
    authRequired: false,
    note: "GitHub mirror of Yale data, updated weekly",
  },
  "sec-edgar": {
    id: "sec-edgar",
    name: "SEC EDGAR",
    provider: "U.S. Securities and Exchange Commission",
    license: "public-domain",
    frequency: "realtime",
    releaseLag: "filings available within minutes of acceptance",
    confidence: "high",
    authRequired: false,
    rateLimit: "10 req/sec with User-Agent header",
    note: "Integrated for Event Radar filings and PIT event capture.",
  },
  "finra-short": {
    id: "finra-short",
    name: "FINRA Short Interest",
    provider: "FINRA",
    license: "free-personal",
    frequency: "bimonthly",
    releaseLag: "~10 business days after settlement",
    confidence: "medium",
    authRequired: false,
    note: "Integrated for squeeze-risk monitoring. Published mid-month and month-end.",
  },
  "cftc-cot": {
    id: "cftc-cot",
    name: "CFTC Commitments of Traders",
    provider: "CFTC",
    license: "public-domain",
    frequency: "weekly",
    releaseLag: "Friday release, reflects Tuesday positions (3-day lag)",
    confidence: "high",
    authRequired: false,
    note: "Not yet integrated. Weekly futures positioning data.",
  },
};

export function getSource(id: string): DataSourceDef | undefined {
  return SOURCES[id];
}

export function getAllSources(): DataSourceDef[] {
  return Object.values(SOURCES);
}

export function getIntegratedSources(): DataSourceDef[] {
  return Object.values(SOURCES).filter(
    (s) => !s.note?.includes("Not yet integrated")
  );
}

export function getPlannedSources(): DataSourceDef[] {
  return Object.values(SOURCES).filter(
    (s) => s.note?.includes("Not yet integrated") ?? false
  );
}

export function buildMeta(
  sourceId: string,
  asOf: string,
  overrides?: Partial<DataSourceDef>
) {
  const src = SOURCES[sourceId];
  if (!src) {
    return {
      source: sourceId,
      asOf,
      fetchedAt: new Date().toISOString(),
      frequency: "daily" as SourceFrequency,
      confidence: "low" as SourceConfidence,
    };
  }
  return {
    source: overrides?.name ?? src.name,
    provider: src.provider,
    asOf,
    fetchedAt: new Date().toISOString(),
    frequency: overrides?.frequency ?? src.frequency,
    releaseLag: overrides?.releaseLag ?? src.releaseLag,
    confidence: overrides?.confidence ?? src.confidence,
    note: overrides?.note ?? src.note,
  };
}
