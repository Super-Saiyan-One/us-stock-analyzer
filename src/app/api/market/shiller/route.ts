import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { SHILLER_API_BASE, CACHE_TTL } from "@/lib/constants";

const LATEST_KEY = "shiller:latest";
const HISTORY_KEY = "shiller:history";

interface ShillerRawRecord {
  date: number;
  date_string?: string;
  sp500: number;
  earnings: number;
  dividend: number;
  cpi: number;
  long_interest_rate: number;
  real_price: number;
  real_earnings: number;
  cape: number | null;
}

async function fetchHistory() {
  const cached = cacheGet<{ date: string; sp500: number; earnings: number; cape: number }[]>(HISTORY_KEY);
  if (cached) return cached;

  const res = await fetch(`${SHILLER_API_BASE}/stock_market_data.json`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const raw = await res.json();
  const records: ShillerRawRecord[] = raw.data || raw;

  const data = records
    .filter((item) => item.cape != null && Number(item.cape) > 0)
    .map((item) => ({
      date: item.date_string || String(item.date),
      sp500: Number(item.sp500) || 0,
      earnings: Number(item.earnings) || 0,
      cape: Number(item.cape) || 0,
    }));

  cacheSet(HISTORY_KEY, data, CACHE_TTL.SHILLER);
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "latest";

  if (type === "latest") {
    const cached = cacheGet(LATEST_KEY);
    if (cached) return NextResponse.json(cached);

    const res = await fetch(`${SHILLER_API_BASE}/latest.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Shiller data" },
        { status: 502 }
      );
    }
    const raw = await res.json();
    const sm = raw.stock_market || {};

    // latest API often has null earnings — fall back to most recent history record with valid earnings
    let earnings = Number(sm.earnings) || 0;
    if (!earnings) {
      const history = await fetchHistory();
      if (history) {
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].earnings > 0) {
            earnings = history[i].earnings;
            break;
          }
        }
      }
    }

    const sp500 = sm.sp500 || 0;
    const cape = sm.cape || 0;

    const data = {
      date: sm.date || "",
      sp500,
      dividend: Number(sm.dividend_yield) || 0,
      earnings,
      cpi: Number(sm.cpi) || 0,
      long_interest_rate: 0,
      real_price: 0,
      real_dividend: 0,
      real_earnings: 0,
      cape,
    };
    cacheSet(LATEST_KEY, data, CACHE_TTL.SHILLER);
    return NextResponse.json(data);
  }

  if (type === "history") {
    const data = await fetchHistory();
    if (!data) {
      return NextResponse.json(
        { error: "Failed to fetch Shiller history" },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
