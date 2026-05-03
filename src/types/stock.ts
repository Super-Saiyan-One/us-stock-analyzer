export interface StockQuote {
  symbol: string;
  longName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
  marketState: string;
  meta?: import("./data-meta").DataMeta;
}

export interface FinancialMetrics {
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  freeCashflow: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  beta: number | null;
  floatShares?: number | null;
  sharesOutstanding?: number | null;
  sharesShort?: number | null;
  sharesShortPriorMonth?: number | null;
  shortRatio?: number | null;
  shortPercentOfFloat?: number | null;
  dateShortInterest?: number | null;
  meta?: import("./data-meta").DataMeta;
}

export interface EarningsRecord {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  revenue: number | null;
  revenueEstimate: number | null;
}

export interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}
