import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, PYTHON_API_URL } from "@/lib/constants";
import { validateSymbol } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const key = `financials:${symbol}`;

  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const res = await fetch(`${PYTHON_API_URL}/stock/${symbol}/financials`);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch financials" },
      { status: 502 }
    );
  }
  const data = await res.json();
  cacheSet(key, data, CACHE_TTL.STOCK_FINANCIALS);
  return NextResponse.json(data);
}
