export const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const SHILLER_API_BASE =
  "https://posix4e.github.io/shiller_wrapper_data/data";

export const YAHOO_CHART_API =
  "https://query1.finance.yahoo.com/v8/finance/chart";

export const YAHOO_SEARCH_API =
  "https://query2.finance.yahoo.com/v1/finance/search";

export const SEC_COMPANY_TICKERS_API =
  "https://www.sec.gov/files/company_tickers.json";

export const SEC_SUBMISSIONS_API =
  "https://data.sec.gov/submissions";

export const SEC_ARCHIVES_BASE =
  "https://www.sec.gov/Archives/edgar/data";

export const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT || "us-stock-analyzer admin@example.com";

export const FINRA_DATA_API =
  "https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest";

export const CACHE_TTL = {
  SHILLER: 24 * 60 * 60 * 1000,
  SP500_MARKET_HOURS: 30 * 1000,
  SP500_OFF_HOURS: 5 * 60 * 1000,
  STOCK_QUOTE: 15 * 1000,
  STOCK_FINANCIALS: 5 * 60 * 1000,
  STOCK_CHART: 5 * 60 * 1000,
  OPTIONS_CHAIN: 60 * 1000,
  OPTIONS_EXPIRATIONS: 60 * 60 * 1000,
  SEARCH: 24 * 60 * 60 * 1000,
  MARKET_INDICES: 30 * 1000,
  FEAR_GREED: 30 * 60 * 1000,
  REGIME: 5 * 60 * 1000,
  FRED_DAILY: 2 * 60 * 60 * 1000,
  FRED_WEEKLY: 12 * 60 * 60 * 1000,
  FRED_MONTHLY: 24 * 60 * 60 * 1000,
  FORWARD_PE: 6 * 60 * 60 * 1000,
  SEC_TICKERS: 24 * 60 * 60 * 1000,
  SEC_EVENTS: 30 * 60 * 1000,
  SHORT_INTEREST: 12 * 60 * 60 * 1000,
  SCREENER: 5 * 60 * 1000,
  SIGNAL_LAB: 30 * 60 * 1000,
} as const;

export const STOCKMARKET_PE_URL = "https://www.stockmarketperatio.com";

// staleTime >= 对应的 CACHE_TTL，避免客户端重复请求服务端缓存未刷新的数据
export const STALE_TIME = {
  SHILLER: 60 * 60 * 1000,
  SP500: 30 * 1000,
  STOCK_QUOTE: 15 * 1000,
  STOCK_FINANCIALS: 5 * 60 * 1000,
  STOCK_CHART: 5 * 60 * 1000,
  OPTIONS_CHAIN: 60 * 1000,
  OPTIONS_EXPIRATIONS: 60 * 60 * 1000,
  MARKET_INDICES: 30 * 1000,
  FEAR_GREED: 30 * 60 * 1000,
  REGIME: 5 * 60 * 1000,
  SEARCH: 24 * 60 * 60 * 1000,
  FRED: 30 * 60 * 1000,
  FORWARD_PE: 6 * 60 * 60 * 1000,
  SEC_EVENTS: 30 * 60 * 1000,
  SHORT_INTEREST: 12 * 60 * 60 * 1000,
  SCREENER: 5 * 60 * 1000,
  SIGNAL_LAB: 30 * 60 * 1000,
} as const;
