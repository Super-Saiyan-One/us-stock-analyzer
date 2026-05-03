import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { YAHOO_CHART_API, CACHE_TTL } from "@/lib/constants";
import { validateSymbol } from "@/lib/api";
import { buildMeta } from "@/lib/data-source-registry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const key = `quote:${symbol}`;

  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url = `${YAHOO_CHART_API}/${encodeURIComponent(symbol)}?range=1d&interval=5m`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 502 }
    );
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    return NextResponse.json({ error: "No data" }, { status: 502 });
  }

  const yahooMeta = result.meta;
  const prevClose = yahooMeta.previousClose || yahooMeta.chartPreviousClose || 0;
  const price = yahooMeta.regularMarketPrice || 0;
  const asOf = yahooMeta.regularMarketTime
    ? new Date(yahooMeta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  const data = {
    symbol: yahooMeta.symbol,
    longName: yahooMeta.longName || yahooMeta.shortName || symbol.toUpperCase(),
    price,
    previousClose: prevClose,
    change: price - prevClose,
    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    volume: yahooMeta.regularMarketVolume || 0,
    marketCap: 0,
    fiftyTwoWeekHigh: yahooMeta.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: yahooMeta.fiftyTwoWeekLow || 0,
    currency: yahooMeta.currency || "USD",
    marketState: yahooMeta.marketState || "CLOSED",
    meta: buildMeta("yahoo-chart", asOf),
  };

  cacheSet(key, data, CACHE_TTL.STOCK_QUOTE);
  return NextResponse.json(data);
}
