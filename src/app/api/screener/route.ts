import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { PYTHON_API_URL, CACHE_TTL } from "@/lib/constants";
import { scoreStocks } from "@/lib/screener-engine";
import { SP500_TOP100 } from "@/lib/universes";
import {
  insertSignalObservation,
  upsertPriceSnapshots,
} from "@/lib/db";
import type {
  RawScreenData,
  ScreenerResponse,
  ScreenerStock,
} from "@/types/screener";

interface PriceResult {
  symbol: string;
  price: number;
  previousClose: number;
  change1D: number;
  change5D: number;
  change20D: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume20D: number;
  priceHistory?: { date: string; close: number }[];
}

interface FundamentalResult {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  beta: number | null;
  shortPercentOfFloat: number | null;
  shortRatio: number | null;
}

interface BatchPriceResult {
  results: PriceResult[];
  totalRequested: number;
  chunksSucceeded: number;
  chunksFailed: number;
  errors: string[];
}

async function fetchBatchPrices(symbols: string[]): Promise<BatchPriceResult> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 50) {
    chunks.push(symbols.slice(i, i + 50));
  }

  const results: PriceResult[] = [];
  let chunksSucceeded = 0;
  let chunksFailed = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${PYTHON_API_URL}/screener/batch/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        results.push(...(data.results || []));
        chunksSucceeded++;
      } else {
        chunksFailed++;
        errors.push(`batch/screen returned ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      chunksFailed++;
      errors.push(`batch/screen failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }
  return { results, totalRequested: symbols.length, chunksSucceeded, chunksFailed, errors };
}

async function fetchBatchFundamentals(
  symbols: string[]
): Promise<Map<string, FundamentalResult>> {
  const map = new Map<string, FundamentalResult>();
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 30) {
    chunks.push(symbols.slice(i, i + 30));
  }

  const promises = chunks.map(async (chunk) => {
    try {
      const res = await fetch(`${PYTHON_API_URL}/screener/batch/fundamentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const r of data.results || []) {
          map.set(r.symbol, r);
        }
      }
    } catch {
      // continue
    }
  });

  await Promise.all(promises);
  return map;
}

function persistPriceSnapshots(prices: PriceResult[]) {
  const snapshots: { symbol: string; date: string; close: number }[] = [];
  for (const p of prices) {
    if (p.priceHistory) {
      for (const h of p.priceHistory) {
        if (h.close != null) {
          snapshots.push({ symbol: p.symbol, date: h.date, close: h.close });
        }
      }
    }
  }
  if (snapshots.length > 0) {
    upsertPriceSnapshots(snapshots);
  }
}

function recordSignalObservations(stocks: ScreenerStock[], regime?: string) {
  const now = new Date().toISOString().split("T")[0];
  for (const s of stocks) {
    if (s.category !== "neutral" && s.compositeScore >= 60) {
      insertSignalObservation({
        symbol: s.symbol,
        signalId: `screener:${s.category}`,
        category: s.category,
        score: s.compositeScore,
        priceAtSignal: s.price,
        observedAt: now,
        triggers: s.triggers,
        regime: regime ?? null,
      });
    }
  }
}

const SUPPORTED_UNIVERSES = new Set(["sp500", "custom"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const universe = searchParams.get("universe") || "sp500";
  const customSymbols = searchParams.get("symbols")?.split(",").filter(Boolean);

  if (!SUPPORTED_UNIVERSES.has(universe)) {
    return NextResponse.json(
      { error: `Unsupported universe: "${universe}". Supported: sp500, custom (with symbols param).` },
      { status: 400 }
    );
  }

  let symbols: string[];
  if (universe === "custom" && customSymbols?.length) {
    symbols = customSymbols.map((s) => s.toUpperCase().trim());
  } else {
    symbols = [...SP500_TOP100];
  }

  const cacheKey = `screener:${universe}:${symbols.slice(0, 5).join(",")}:${symbols.length}`;
  const cached = cacheGet<ScreenerResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [priceResult, fundamentals] = await Promise.all([
    fetchBatchPrices(symbols),
    fetchBatchFundamentals(symbols),
  ]);

  if (priceResult.results.length === 0) {
    return NextResponse.json(
      {
        error: "Failed to fetch price data from upstream. Python API may be unavailable.",
        sourceStatus: "unavailable",
        details: priceResult.errors,
      },
      { status: 502 }
    );
  }

  persistPriceSnapshots(priceResult.results);

  const isDegraded = priceResult.chunksFailed > 0;

  const rawList: RawScreenData[] = priceResult.results.map((p) => {
    const f = fundamentals.get(p.symbol);
    return {
      symbol: p.symbol,
      name: f?.name || p.symbol,
      sector: f?.sector ?? null,
      industry: f?.industry ?? null,
      price: p.price,
      previousClose: p.previousClose,
      change1D: p.change1D,
      change5D: p.change5D,
      change20D: p.change20D,
      fiftyTwoWeekHigh: p.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: p.fiftyTwoWeekLow,
      volume: p.volume,
      avgVolume20D: p.avgVolume20D,
      marketCap: f?.marketCap ?? null,
      trailingPE: f?.trailingPE ?? null,
      forwardPE: f?.forwardPE ?? null,
      pegRatio: f?.pegRatio ?? null,
      revenueGrowth: f?.revenueGrowth ?? null,
      earningsGrowth: f?.earningsGrowth ?? null,
      profitMargins: f?.profitMargins ?? null,
      returnOnEquity: f?.returnOnEquity ?? null,
      debtToEquity: f?.debtToEquity ?? null,
      beta: f?.beta ?? null,
      shortPercentOfFloat: f?.shortPercentOfFloat ?? null,
      shortRatio: f?.shortRatio ?? null,
    };
  });

  const scored = scoreStocks(rawList);
  recordSignalObservations(scored);

  const response: ScreenerResponse = {
    stocks: scored,
    universe: universe as ScreenerResponse["universe"],
    totalSymbols: symbols.length,
    scannedAt: new Date().toISOString(),
    meta: {
      source: "yfinance (Yahoo Finance)",
      asOf: new Date().toISOString().split("T")[0],
      fetchedAt: new Date().toISOString(),
      frequency: "on-demand",
      confidence: isDegraded ? "low" : "medium",
      note: isDegraded
        ? `Partial data: ${priceResult.chunksSucceeded}/${priceResult.chunksSucceeded + priceResult.chunksFailed} chunks succeeded`
        : undefined,
    },
  };

  cacheSet(cacheKey, response, CACHE_TTL.SCREENER);
  return NextResponse.json(response);
}
