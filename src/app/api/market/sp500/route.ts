import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { YAHOO_CHART_API, CACHE_TTL } from "@/lib/constants";

const CACHE_KEY = "sp500:quote";

export async function GET() {
  const cached = cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const url = `${YAHOO_CHART_API}/%5EGSPC?range=1d&interval=5m`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch S&P 500 data" },
      { status: 502 }
    );
  }
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    return NextResponse.json({ error: "No data" }, { status: 502 });
  }

  const meta = result.meta;
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const sparkline = timestamps
    .map((t: number, i: number) => ({
      time: t,
      value: closes[i],
    }))
    .filter((p: { value: number | null }) => p.value != null);

  const prevClose = meta.previousClose || meta.chartPreviousClose || 0;
  const price = meta.regularMarketPrice || 0;
  const data = {
    price,
    previousClose: prevClose,
    change: price - prevClose,
    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
    marketState: meta.marketState,
    sparkline,
  };

  const ttl =
    meta.marketState === "REGULAR"
      ? CACHE_TTL.SP500_MARKET_HOURS
      : CACHE_TTL.SP500_OFF_HOURS;
  cacheSet(CACHE_KEY, data, ttl);
  return NextResponse.json(data);
}
