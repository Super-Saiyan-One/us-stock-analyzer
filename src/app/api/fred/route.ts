import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";
import {
  upsertTimeSeries,
  getTimeSeries,
  getSeriesCount,
} from "@/lib/db";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const FRED_KEY = process.env.FRED_API_KEY || "";

const WEEKLY_SERIES = new Set([
  "WALCL", "WTREGEN", "RRPONTSYD", "ICSA", "IC4WSA", "WM2NS",
]);
const MONTHLY_SERIES = new Set([
  "M2SL", "CPIAUCSL", "CPILFESL", "PCEPILFE", "FEDFUNDS",
]);

function getSeriesTTL(seriesId: string): number {
  if (MONTHLY_SERIES.has(seriesId)) return CACHE_TTL.FRED_MONTHLY;
  if (WEEKLY_SERIES.has(seriesId)) return CACHE_TTL.FRED_WEEKLY;
  return CACHE_TTL.FRED_DAILY;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get("series");
  const limit = parseInt(searchParams.get("limit") || "60");
  const startDate = searchParams.get("start") || "";

  if (!seriesId) {
    return NextResponse.json({ error: "series parameter required" }, { status: 400 });
  }

  if (!FRED_KEY) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured" },
      { status: 500 }
    );
  }

  const memKey = `fred:${seriesId}:${limit}:${startDate}`;
  const memCached = cacheGet(memKey);
  if (memCached) return NextResponse.json(memCached);

  // Check SQLite for recent data
  const dbCount = getSeriesCount(seriesId);
  const dbData = getTimeSeries(seriesId, limit, startDate || undefined);

  const needsFetch = dbCount === 0 || shouldRefresh(seriesId, dbData);

  let observations: { date: string; value: number }[];

  if (needsFetch) {
    const fetchLimit = Math.max(limit, 500);
    let url = `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=${fetchLimit}`;
    if (startDate) url += `&observation_start=${startDate}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (dbData.length > 0) {
        cacheSet(memKey, dbData, 60000);
        return NextResponse.json(dbData);
      }
      return NextResponse.json(
        { error: `Failed to fetch FRED series ${seriesId}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    observations = (json.observations || [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: parseFloat(o.value),
      }))
      .reverse();

    upsertTimeSeries(seriesId, observations, "FRED");

    observations = observations.slice(-limit);
  } else {
    observations = dbData;
  }

  cacheSet(memKey, observations, getSeriesTTL(seriesId));
  return NextResponse.json(observations);
}

function shouldRefresh(
  seriesId: string,
  data: { date: string; value: number }[]
): boolean {
  if (data.length === 0) return true;
  const latest = data[data.length - 1];
  const latestDate = new Date(latest.date);
  const now = new Date();
  const ageMs = now.getTime() - latestDate.getTime();
  const oneDay = 86400000;

  const ttl = getSeriesTTL(seriesId);
  if (ttl >= CACHE_TTL.FRED_MONTHLY) return ageMs > 7 * oneDay;
  if (ttl >= CACHE_TTL.FRED_WEEKLY) return ageMs > 3 * oneDay;
  return ageMs > 1.5 * oneDay;
}
