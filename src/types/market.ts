export interface ShillerLatest {
  date: string;
  sp500: number;
  dividend: number;
  earnings: number;
  cpi: number;
  long_interest_rate: number;
  real_price: number;
  real_dividend: number;
  real_earnings: number;
  cape: number;
}

export interface ShillerHistoryPoint {
  date: string;
  sp500: number;
  earnings: number;
  cape: number;
}

export interface FredObservation {
  date: string;
  value: number;
}

export interface IndexData {
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketState: string;
  sparkline: { time: number; value: number }[];
}

export type IndicesData = Record<string, IndexData | null>;

export interface FearGreedData {
  score: number | null;
  rating: string;
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  oneYearAgo: number;
}

export interface ForwardPEData {
  date: string;
  sp500Price: number;
  trailingEarnings: number;
  trailingPE: number;
  forwardEarnings: number;
  forwardPE: number;
  impliedGrowth: number;
}

export interface ForwardPEHistory {
  forward: { date: string; value: number }[];
  trailing: { date: string; value: number }[];
}

export interface SP500Data {
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketState: string;
  sparkline: { time: number; value: number }[];
}
