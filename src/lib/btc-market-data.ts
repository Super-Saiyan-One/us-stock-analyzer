import { cacheGet, cacheSet } from "@/lib/cache";
import {
  BINANCE_KLINES_API,
  CACHE_TTL,
  CBBI_LATEST_API,
  YAHOO_CHART_API,
} from "@/lib/constants";
import type { BtcDailyCandle, CbbiPoint } from "@/types/btc-strategy";

interface BtcPriceData {
  candles: BtcDailyCandle[];
  source: "binance" | "yahoo";
  asOf: string | null;
}

interface CbbiData {
  points: CbbiPoint[];
  asOf: string | null;
}

const BTC_START_MS = Date.UTC(2020, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getBtcDailyCandles(): Promise<BtcPriceData> {
  const cached = cacheGet<BtcPriceData>("btc:daily-candles");
  if (cached) return cached;

  try {
    const binance = await fetchBinanceDailyCandles();
    cacheSet("btc:daily-candles", binance, CACHE_TTL.BTC_DAILY);
    return binance;
  } catch {
    const yahoo = await fetchYahooDailyCandles();
    cacheSet("btc:daily-candles", yahoo, CACHE_TTL.BTC_DAILY);
    return yahoo;
  }
}

export async function getCbbiDaily(): Promise<CbbiData> {
  const cached = cacheGet<CbbiData>("btc:cbbi-daily");
  if (cached) return cached;

  const res = await fetch(CBBI_LATEST_API, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Failed to fetch CBBI data");

  const json = await res.json();
  const rawSeries: Record<string, number> = json.Confidence ?? json;
  const byDate = new Map<string, number>();

  for (const [timestamp, value] of Object.entries(rawSeries)) {
    const numericTimestamp = Number(timestamp);
    if (!Number.isFinite(numericTimestamp) || !Number.isFinite(value)) continue;
    const date = new Date(numericTimestamp * 1000).toISOString().slice(0, 10);
    byDate.set(date, Number(value));
  }

  const points = [...byDate.entries()]
    .map(([date, cbbi]) => ({ date, cbbi }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const data = { points, asOf: points.at(-1)?.date ?? null };
  cacheSet("btc:cbbi-daily", data, CACHE_TTL.BTC_CBBI);
  return data;
}

async function fetchBinanceDailyCandles(): Promise<BtcPriceData> {
  const candles: BtcDailyCandle[] = [];
  let startTime = BTC_START_MS;
  const now = Date.now();

  while (startTime < now) {
    const url = new URL(BINANCE_KLINES_API);
    url.searchParams.set("symbol", "BTCUSDT");
    url.searchParams.set("interval", "1d");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("startTime", String(startTime));

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error("Failed to fetch Binance BTC candles");

    const rows = (await res.json()) as unknown[][];
    if (rows.length === 0) break;

    for (const row of rows) {
      const closeTime = Number(row[6]);
      if (!Number.isFinite(closeTime) || closeTime >= now) continue;
      candles.push({
        date: new Date(Number(row[0])).toISOString().slice(0, 10),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      });
    }

    const lastOpen = Number(rows.at(-1)?.[0]);
    if (!Number.isFinite(lastOpen) || lastOpen < startTime) break;
    startTime = lastOpen + DAY_MS;
  }

  if (candles.length === 0) throw new Error("No Binance BTC candles");

  return {
    candles: dedupeCandles(candles),
    source: "binance",
    asOf: candles.at(-1)?.date ?? null,
  };
}

async function fetchYahooDailyCandles(): Promise<BtcPriceData> {
  const res = await fetch(`${YAHOO_CHART_API}/BTC-USD?range=max&interval=1d`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Failed to fetch Yahoo BTC candles");

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error("No Yahoo BTC candles");

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const candles = timestamps
    .map((timestamp: number, i: number) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: Number(quote.open?.[i]),
      high: Number(quote.high?.[i]),
      low: Number(quote.low?.[i]),
      close: Number(quote.close?.[i]),
      volume: Number(quote.volume?.[i] ?? 0),
    }))
    .filter((candle: BtcDailyCandle) => Number.isFinite(candle.close));

  return {
    candles: dedupeCandles(candles),
    source: "yahoo",
    asOf: candles.at(-1)?.date ?? null,
  };
}

function dedupeCandles(candles: BtcDailyCandle[]): BtcDailyCandle[] {
  const byDate = new Map<string, BtcDailyCandle>();
  for (const candle of candles) {
    if (
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ) {
      byDate.set(candle.date, candle);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
