import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { YAHOO_SEARCH_API, CACHE_TTL } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const key = `search:${q.toUpperCase()}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url = `${YAHOO_SEARCH_API}?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return NextResponse.json([]);

  const json = await res.json();
  const quotes = json.quotes || [];
  const data = quotes
    .filter((item: Record<string, unknown>) => item.symbol)
    .map((item: Record<string, unknown>) => ({
      symbol: item.symbol || "",
      name: (item.longname || item.shortname || "") as string,
      exchange: (item.exchange || "") as string,
      type: (item.quoteType || "") as string,
    }));

  cacheSet(key, data, CACHE_TTL.SEARCH);
  return NextResponse.json(data);
}
