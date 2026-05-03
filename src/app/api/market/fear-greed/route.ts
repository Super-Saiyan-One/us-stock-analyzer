import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, YAHOO_CHART_API } from "@/lib/constants";

const CNN_API = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

function vixToFearGreed(vix: number): { score: number; rating: string } {
  const score = Math.round(Math.max(0, Math.min(100, 100 - ((vix - 12) / 38) * 100)));
  let rating: string;
  if (score <= 25) rating = "Extreme Fear";
  else if (score <= 45) rating = "Fear";
  else if (score <= 55) rating = "Neutral";
  else if (score <= 75) rating = "Greed";
  else rating = "Extreme Greed";
  return { score, rating };
}

async function fetchVixFallback() {
  const res = await fetch(
    `${YAHOO_CHART_API}/%5EVIX?range=5d&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) return null;

  const price = result.meta?.regularMarketPrice;
  const prevClose = result.meta?.previousClose || result.meta?.chartPreviousClose || 0;
  if (!price) return null;

  const { score, rating } = vixToFearGreed(price);
  const prev = prevClose ? vixToFearGreed(prevClose) : null;
  return {
    score,
    rating,
    previousClose: prev?.score ?? 0,
    oneWeekAgo: 0,
    oneMonthAgo: 0,
    oneYearAgo: 0,
    timestamp: null,
    source: "vix" as const,
  };
}

export async function GET() {
  const key = "feargreed";
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`${CNN_API}/${today}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("CNN API failed");

    const json = await res.json();
    const fg = json.fear_and_greed;
    const data = {
      score: Math.round(fg?.score ?? 0),
      rating: fg?.rating ?? "N/A",
      previousClose: Math.round(fg?.previous_close ?? 0),
      oneWeekAgo: Math.round(fg?.previous_1_week ?? 0),
      oneMonthAgo: Math.round(fg?.previous_1_month ?? 0),
      oneYearAgo: Math.round(fg?.previous_1_year ?? 0),
      timestamp: json.fear_and_greed_historical?.timestamp ?? null,
      source: "cnn" as const,
    };
    cacheSet(key, data, CACHE_TTL.FEAR_GREED);
    return NextResponse.json(data);
  } catch {
    const fallback = await fetchVixFallback();
    if (fallback) {
      cacheSet(key, fallback, CACHE_TTL.FEAR_GREED);
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { score: null, rating: "N/A", error: "Failed to fetch" },
      { status: 502 }
    );
  }
}
