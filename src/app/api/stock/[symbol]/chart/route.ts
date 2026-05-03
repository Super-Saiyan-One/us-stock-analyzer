import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { YAHOO_CHART_API, CACHE_TTL } from "@/lib/constants";
import { validateSymbol } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";
  const interval = searchParams.get("interval") || "1d";

  const key = `chart:${symbol}:${range}:${interval}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url = `${YAHOO_CHART_API}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 502 }
    );
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    return NextResponse.json({ error: "No data" }, { status: 502 });
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  const data = timestamps.map((t: number, i: number) => ({
    time: t,
    open: quote.open?.[i] ?? 0,
    high: quote.high?.[i] ?? 0,
    low: quote.low?.[i] ?? 0,
    close: quote.close?.[i] ?? 0,
    volume: quote.volume?.[i] ?? 0,
  })).filter((d: { close: number }) => d.close > 0);

  cacheSet(key, data, CACHE_TTL.STOCK_CHART);
  return NextResponse.json(data);
}
