import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { YAHOO_CHART_API, CACHE_TTL } from "@/lib/constants";

const INDICES: Record<string, string> = {
  sp500: "%5EGSPC",
  nasdaq: "%5EIXIC",
  vix: "%5EVIX",
  vix3m: "%5EVIX3M",
  skew: "%5ESKEW",
  dji: "%5EDJI",
};

async function fetchIndex(yahooSymbol: string) {
  const res = await fetch(
    `${YAHOO_CHART_API}/${yahooSymbol}?range=5d&interval=5m`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const prevClose = meta.previousClose || meta.chartPreviousClose || 0;
  const price = meta.regularMarketPrice || 0;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const sparkline = timestamps
    .map((t: number, i: number) => ({ time: t, value: closes[i] }))
    .filter((p: { value: number | null }) => p.value != null);

  return {
    price,
    previousClose: prevClose,
    change: price - prevClose,
    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    marketState: meta.marketState || "CLOSED",
    sparkline,
  };
}

export async function GET() {
  const key = "market:indices";
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const results = await Promise.all(
    Object.entries(INDICES).map(async ([name, symbol]) => {
      const data = await fetchIndex(symbol);
      return [name, data] as const;
    })
  );

  const data: Record<string, unknown> = {};
  for (const [name, result] of results) {
    data[name] = result;
  }

  cacheSet(key, data, CACHE_TTL.MARKET_INDICES);
  return NextResponse.json(data);
}
