import type { DataMeta } from "./data-meta";

export interface StockEvent {
  id: string;
  symbol: string;
  cik: string;
  companyName: string;
  form: string;
  filingDate: string;
  reportDate: string | null;
  acceptanceDateTime: string | null;
  accessionNumber: string;
  primaryDocument: string;
  description: string;
  url: string;
  severity: "low" | "medium" | "high";
}

export interface StockEventsResponse {
  symbol: string;
  cik: string | null;
  companyName: string | null;
  events: StockEvent[];
  meta: DataMeta;
}

export interface ShortInterestRecord {
  symbol: string;
  issueName: string;
  settlementDate: string;
  currentShortPosition: number;
  previousShortPosition: number | null;
  changePrevious: number | null;
  changePercent: number | null;
  averageDailyVolume: number | null;
  daysToCover: number | null;
  marketClassCode: string | null;
}

export interface ShortInterestResponse {
  symbol: string;
  records: ShortInterestRecord[];
  latest: ShortInterestRecord | null;
  sourceStatus: "official" | "fallback" | "unavailable";
  meta: DataMeta;
}
