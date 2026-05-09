import { cacheGet, cacheSet } from "@/lib/cache";
import {
  CACHE_TTL,
  SHILLER_API_BASE,
  STOCKMARKET_PE_URL,
  YAHOO_CHART_API,
} from "@/lib/constants";
import type {
  UsIndexDailyCandle,
  UsIndexForwardPEGate,
  UsIndexMacroPoint,
  UsIndexQQQPEGate,
  UsIndexSymbol,
} from "@/types/us-index-strategy";

const SYMBOLS: Record<UsIndexSymbol, string> = {
  SPY: "SPY",
  QQQ: "QQQ",
};

const MACRO_SYMBOLS = {
  vix: "^VIX",
  vix3m: "^VIX3M",
  skew: "^SKEW",
} as const;

const CNN_FEAR_GREED_URL =
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata/2021-01-01";
const TRAILING_PE_HISTORY_URL = `${STOCKMARKET_PE_URL}/js/historical-sp-500-pe-ratio-since-1990.js`;
const YAHOO_QUOTE_SUMMARY_URL =
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary/QQQ?modules=defaultKeyStatistics";

interface DateValuePoint {
  date: string;
  value: number;
}

interface RawShillerRecord {
  date_string?: string;
  cape?: number | null;
}

export async function getUsIndexDailyCandles(
  symbol: UsIndexSymbol
): Promise<UsIndexDailyCandle[]> {
  const cacheKey = `us-index:daily:${symbol}`;
  const cached = cacheGet<UsIndexDailyCandle[]>(cacheKey);
  if (cached) return cached;

  const candles = await fetchYahooCandles(SYMBOLS[symbol], "10y");
  cacheSet(cacheKey, candles, CACHE_TTL.US_INDEX_DAILY);
  return candles;
}

export async function getUsIndexMacroPoints(
  candles: UsIndexDailyCandle[]
): Promise<UsIndexMacroPoint[]> {
  const cacheKey = "us-index:macro";
  const cached = cacheGet<UsIndexMacroPoint[]>(cacheKey);
  if (cached) return cached;

  const [vix, vix3m, skew, fearGreed, cape, trailingPE] = await Promise.all([
    fetchYahooSeries(MACRO_SYMBOLS.vix, "vix"),
    fetchYahooSeries(MACRO_SYMBOLS.vix3m, "vix3m"),
    fetchYahooSeries(MACRO_SYMBOLS.skew, "skew"),
    fetchFearGreedHistory().catch(() => []),
    fetchCapeHistory().catch(() => []),
    fetchTrailingPEHistory().catch(() => []),
  ]);

  const macro = mergeMacroByCandleDates(candles, {
    vix,
    vix3m,
    skew,
    fearGreed,
    cape,
    trailingPE,
  });
  cacheSet(cacheKey, macro, CACHE_TTL.US_INDEX_VIX);
  return macro;
}

export async function getCurrentForwardPE(): Promise<UsIndexForwardPEGate> {
  const cacheKey = "us-index:forward-pe:current";
  const cached = cacheGet<UsIndexForwardPEGate>(cacheKey);
  if (cached) return cached;

  const res = await fetch(STOCKMARKET_PE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return { date: null, value: null };
  const html = await res.text();
  const value = html.match(/id="forwardPE"[^>]*>([^<]+)</i)?.[1];
  const date = html.match(/Data as of ([\d-]+)/i)?.[1] ?? null;
  const gate = {
    date,
    value: value ? Number.parseFloat(value.replace(/,/g, "")) : null,
  };
  cacheSet(cacheKey, gate, CACHE_TTL.FORWARD_PE);
  return gate;
}

export async function getCurrentQQQPE(): Promise<UsIndexQQQPEGate> {
  const cacheKey = "us-index:qqq-pe:current";
  const cached = cacheGet<UsIndexQQQPEGate>(cacheKey);
  if (cached) return cached;

  const gate: UsIndexQQQPEGate = {
    date: new Date().toISOString().slice(0, 10),
    value: null,
    source: "Yahoo Finance quoteSummary defaultKeyStatistics trailingPE",
    methodology: "Current QQQ ETF trailing PE snapshot; no stable free history found.",
  };
  try {
    const res = await fetch(YAHOO_QUOTE_SUMMARY_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cacheSet(cacheKey, gate, CACHE_TTL.FORWARD_PE);
      return gate;
    }
    const json = await res.json();
    const raw =
      json.quoteSummary?.result?.[0]?.defaultKeyStatistics?.trailingPE?.raw ??
      json.quoteSummary?.result?.[0]?.defaultKeyStatistics?.trailingPE?.fmt;
    const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    gate.value = Number.isFinite(value) ? value : null;
    cacheSet(cacheKey, gate, CACHE_TTL.FORWARD_PE);
    return gate;
  } catch {
    cacheSet(cacheKey, gate, CACHE_TTL.FORWARD_PE);
    return gate;
  }
}

async function fetchYahooCandles(symbol: string, range: string) {
  const res = await fetch(
    `${YAHOO_CHART_API}/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) throw new Error(`Yahoo chart failed for ${symbol}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0] ?? {};
  return timestamps
    .map((time, index) => ({
      date: new Date(time * 1000).toISOString().slice(0, 10),
      open: Number(quote.open?.[index] ?? 0),
      high: Number(quote.high?.[index] ?? 0),
      low: Number(quote.low?.[index] ?? 0),
      close: Number(quote.close?.[index] ?? 0),
      volume: Number(quote.volume?.[index] ?? 0),
    }))
    .filter((point) => point.close > 0);
}

async function fetchYahooSeries(
  yahooSymbol: string,
  key: keyof Pick<UsIndexMacroPoint, "vix" | "vix3m" | "skew">
): Promise<DateValuePoint[]> {
  const cacheKey = `us-index:series:${key}`;
  const cached = cacheGet<DateValuePoint[]>(cacheKey);
  if (cached) return cached;
  const candles = await fetchYahooCandles(yahooSymbol, "10y");
  const data = candles.map((point) => ({ date: point.date, value: point.close }));
  cacheSet(cacheKey, data, CACHE_TTL.US_INDEX_VIX);
  return data;
}

async function fetchFearGreedHistory(): Promise<DateValuePoint[]> {
  const cacheKey = "us-index:fear-greed:history";
  const cached = cacheGet<DateValuePoint[]>(cacheKey);
  if (cached) return cached;
  const res = await fetch(CNN_FEAR_GREED_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Origin: "https://www.cnn.com",
      Referer: "https://www.cnn.com/markets/fear-and-greed",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("CNN Fear & Greed history failed");
  const json = await res.json();
  const points = json.fear_and_greed_historical?.data ?? [];
  const data = points
    .map((point: { x?: number; y?: number }) => ({
      date: point.x ? new Date(point.x).toISOString().slice(0, 10) : "",
      value: Number(point.y),
    }))
    .filter((point: DateValuePoint) => point.date && Number.isFinite(point.value));
  cacheSet(cacheKey, data, CACHE_TTL.FEAR_GREED);
  return data;
}

async function fetchCapeHistory(): Promise<DateValuePoint[]> {
  const cacheKey = "us-index:cape:history";
  const cached = cacheGet<DateValuePoint[]>(cacheKey);
  if (cached) return cached;
  const res = await fetch(`${SHILLER_API_BASE}/stock_market_data.json`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Shiller CAPE history failed");
  const raw = await res.json();
  const records: RawShillerRecord[] = raw.data ?? raw;
  const data = records
    .map((record) => ({
      date: record.date_string ?? "",
      value: Number(record.cape),
    }))
    .filter((point) => point.date && Number.isFinite(point.value) && point.value > 0);
  cacheSet(cacheKey, data, CACHE_TTL.SHILLER);
  return data;
}

async function fetchTrailingPEHistory(): Promise<DateValuePoint[]> {
  const cacheKey = "us-index:trailing-pe:history";
  const cached = cacheGet<DateValuePoint[]>(cacheKey);
  if (cached) return cached;
  const res = await fetch(TRAILING_PE_HISTORY_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Trailing PE history failed");
  const js = await res.text();
  const points: DateValuePoint[] = [];
  const pattern = /new Date\((\d{4}),(\d{1,2}),(\d{1,2})\),([\d.]+)/g;
  let match;
  while ((match = pattern.exec(js)) !== null) {
    points.push({
      date: `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`,
      value: Number.parseFloat(match[4]),
    });
  }
  cacheSet(cacheKey, points, CACHE_TTL.FORWARD_PE);
  return points;
}

function mergeMacroByCandleDates(
  candles: UsIndexDailyCandle[],
  series: Record<
    "vix" | "vix3m" | "skew" | "fearGreed" | "cape" | "trailingPE",
    DateValuePoint[]
  >
): UsIndexMacroPoint[] {
  const maps = Object.fromEntries(
    Object.entries(series).map(([key, points]) => [
      key,
      new Map(points.map((point) => [point.date, point.value])),
    ])
  ) as Record<string, Map<string, number>>;
  const latest: Record<string, number | null> = {
    vix: null,
    vix3m: null,
    skew: null,
    fearGreed: null,
    cape: null,
    trailingPE: null,
  };

  return candles.map((candle) => {
    for (const key of Object.keys(latest)) {
      const value = maps[key]?.get(candle.date);
      if (value != null && Number.isFinite(value)) latest[key] = value;
    }
    return {
      date: candle.date,
      vix: latest.vix,
      vix3m: latest.vix3m,
      skew: latest.skew,
      fearGreed: latest.fearGreed,
      cape: latest.cape,
      trailingPE: latest.trailingPE,
    };
  });
}
