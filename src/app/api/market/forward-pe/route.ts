import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, STOCKMARKET_PE_URL } from "@/lib/constants";
import {
  upsertTimeSeries,
  getTimeSeries,
  getLatestPoint,
  getSeriesCount,
} from "@/lib/db";

const SERIES_FORWARD = "SP500_FORWARD_PE";
const SERIES_TRAILING = "SP500_TRAILING_PE";
const HISTORY_JS_URL = `${STOCKMARKET_PE_URL}/js/historical-sp-500-pe-ratio-since-1990.js`;

interface PEData {
  date: string;
  sp500Price: number;
  trailingEarnings: number;
  trailingPE: number;
  forwardEarnings: number;
  forwardPE: number;
  impliedGrowth: number;
}

function parseHTML(html: string): PEData | null {
  const get = (id: string) => {
    const re = new RegExp(`id="${id}"[^>]*>([^<]+)<`, "i");
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };

  const price = parseFloat(get("price").replace(/[$,]/g, ""));
  const trailing = parseFloat(get("trailing").replace(/[$,]/g, ""));
  const trailingPE = parseFloat(get("trailingPE"));
  const forward = parseFloat(get("forward").replace(/[$,]/g, ""));
  const forwardPE = parseFloat(get("forwardPE"));
  const growth = parseFloat(get("growth").replace(/[%\s]/g, ""));

  if (!trailingPE || !forwardPE) return null;

  const dateMatch = html.match(/Data as of ([\d-]+)/);
  const date = dateMatch
    ? dateMatch[1]
    : new Date().toISOString().split("T")[0];

  return {
    date,
    sp500Price: price || 0,
    trailingEarnings: trailing || 0,
    trailingPE,
    forwardEarnings: forward || 0,
    forwardPE,
    impliedGrowth: growth || 0,
  };
}

function parseHistoryJS(
  js: string
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  // Pattern: [new Date(YYYY,M,D),PE_VALUE,AVG]
  const re = /new Date\((\d{4}),(\d{1,2}),(\d{1,2})\),([\d.]+)/g;
  let m;
  while ((m = re.exec(js)) !== null) {
    const year = parseInt(m[1]);
    // JS months are 0-indexed in Date constructor, but this site uses 1-indexed
    const month = parseInt(m[2]);
    const pe = parseFloat(m[4]);
    if (year > 0 && pe > 0) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
      points.push({ date: dateStr, value: pe });
    }
  }
  return points;
}

async function scrapeCurrentPE(): Promise<PEData | null> {
  const res = await fetch(STOCKMARKET_PE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return parseHTML(await res.text());
}

async function seedTrailingHistory(): Promise<void> {
  const count = getSeriesCount(SERIES_TRAILING);
  if (count >= 100) return;

  const res = await fetch(HISTORY_JS_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return;

  const js = await res.text();
  const points = parseHistoryJS(js);
  if (points.length > 0) {
    upsertTimeSeries(SERIES_TRAILING, points, "stockmarketperatio.com");
  }
}

function shouldRefresh(seriesId: string): boolean {
  const latest = getLatestPoint(seriesId);
  if (!latest) return true;
  const ageMs = Date.now() - new Date(latest.date).getTime();
  return ageMs > 3 * 86400000;
}

async function refreshIfNeeded(): Promise<void> {
  if (!shouldRefresh(SERIES_FORWARD)) return;

  const scraped = await scrapeCurrentPE();
  if (!scraped) return;

  upsertTimeSeries(
    SERIES_FORWARD,
    [{ date: scraped.date, value: scraped.forwardPE }],
    "stockmarketperatio.com"
  );
  upsertTimeSeries(
    SERIES_TRAILING,
    [{ date: scraped.date, value: scraped.trailingPE }],
    "stockmarketperatio.com"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "current";

  await seedTrailingHistory();

  if (type === "history") {
    const limit = parseInt(searchParams.get("limit") || "600");
    const memKey = `forward-pe:history:${limit}`;
    const memCached = cacheGet(memKey);
    if (memCached) return NextResponse.json(memCached);

    await refreshIfNeeded();

    const data = {
      forward: getTimeSeries(SERIES_FORWARD, limit),
      trailing: getTimeSeries(SERIES_TRAILING, limit),
    };
    cacheSet(memKey, data, CACHE_TTL.FORWARD_PE);
    return NextResponse.json(data);
  }

  // type === "current"
  const memKey = "forward-pe:current";
  const memCached = cacheGet<PEData>(memKey);
  if (memCached) return NextResponse.json(memCached);

  await refreshIfNeeded();

  const scraped = await scrapeCurrentPE();
  if (scraped) {
    cacheSet(memKey, scraped, CACHE_TTL.FORWARD_PE);
    return NextResponse.json(scraped);
  }

  const latestForward = getLatestPoint(SERIES_FORWARD);
  const latestTrailing = getLatestPoint(SERIES_TRAILING);
  if (latestForward && latestTrailing) {
    const fallback: PEData = {
      date: latestForward.date,
      sp500Price: 0,
      trailingEarnings: 0,
      trailingPE: latestTrailing.value,
      forwardEarnings: 0,
      forwardPE: latestForward.value,
      impliedGrowth: 0,
    };
    cacheSet(memKey, fallback, CACHE_TTL.FORWARD_PE);
    return NextResponse.json(fallback);
  }

  return NextResponse.json(
    { error: "Failed to fetch PE data" },
    { status: 502 }
  );
}
