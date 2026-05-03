import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, PYTHON_API_URL } from "@/lib/constants";
import { validateSymbol } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "chain";
  const expiration = searchParams.get("expiration") || "";

  if (type === "expirations") {
    const key = `options:expirations:${symbol}`;
    const cached = cacheGet(key);
    if (cached) return NextResponse.json(cached);

    const res = await fetch(
      `${PYTHON_API_URL}/stock/${symbol}/options/expirations`
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch expirations" },
        { status: 502 }
      );
    }
    const data = await res.json();
    cacheSet(key, data, CACHE_TTL.OPTIONS_EXPIRATIONS);
    return NextResponse.json(data);
  }

  const key = `options:chain:${symbol}:${expiration}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  const url = expiration
    ? `${PYTHON_API_URL}/stock/${symbol}/options/chain?expiration=${expiration}`
    : `${PYTHON_API_URL}/stock/${symbol}/options/chain`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch options chain" },
      { status: 502 }
    );
  }
  const data = await res.json();
  cacheSet(key, data, CACHE_TTL.OPTIONS_CHAIN);
  return NextResponse.json(data);
}
