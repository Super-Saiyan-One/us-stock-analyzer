import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/constants";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const key = `options-summary:${symbol.toUpperCase()}`;

  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const res = await fetch(
    `${PYTHON_API}/stock/${encodeURIComponent(symbol)}/options/summary`
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch options summary" },
      { status: 502 }
    );
  }
  const data = await res.json();
  cacheSet(key, data, CACHE_TTL.OPTIONS_CHAIN);
  return NextResponse.json(data);
}
