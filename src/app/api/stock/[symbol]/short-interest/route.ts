import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { CACHE_TTL, FINRA_DATA_API, PYTHON_API_URL } from "@/lib/constants";
import { validateSymbol } from "@/lib/api";
import { buildMeta } from "@/lib/data-source-registry";
import type { ShortInterestRecord, ShortInterestResponse } from "@/types/events";

interface FinraShortInterestRow {
  symbolCode?: string;
  issueName?: string;
  settlementDate?: string;
  currentShortPositionQuantity?: number;
  previousShortPositionQuantity?: number;
  changePreviousNumber?: number;
  changePercent?: number;
  averageDailyVolumeQuantity?: number;
  daysToCoverQuantity?: number;
  marketClassCode?: string;
}

interface YFinanceFinancialsShortFields {
  symbol?: string;
  longName?: string;
  sharesShort?: number | null;
  sharesShortPriorMonth?: number | null;
  shortRatio?: number | null;
  dateShortInterest?: number | null;
}

const FALLBACK_SHORT_AVERAGE_VOLUME = null;
const FALLBACK_MARKET_CLASS_CODE = null;

function toRecord(row: FinraShortInterestRow): ShortInterestRecord | null {
  if (!row.symbolCode || !row.settlementDate || row.currentShortPositionQuantity == null) {
    return null;
  }
  return {
    symbol: row.symbolCode,
    issueName: row.issueName ?? row.symbolCode,
    settlementDate: row.settlementDate,
    currentShortPosition: row.currentShortPositionQuantity,
    previousShortPosition: row.previousShortPositionQuantity ?? null,
    changePrevious: row.changePreviousNumber ?? null,
    changePercent: row.changePercent ?? null,
    averageDailyVolume: row.averageDailyVolumeQuantity ?? null,
    daysToCover: row.daysToCoverQuantity ?? null,
    marketClassCode: row.marketClassCode ?? null,
  };
}

async function fetchFinra(symbol: string): Promise<ShortInterestRecord[]> {
  const res = await fetch(FINRA_DATA_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit: 200,
      compareFilters: [
        {
          fieldName: "symbolCode",
          fieldValue: symbol,
          compareType: "EQUAL",
        },
      ],
    }),
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as FinraShortInterestRow[];
  return rows
    .map(toRecord)
    .filter((r): r is ShortInterestRecord => r !== null)
    .sort((a, b) => b.settlementDate.localeCompare(a.settlementDate));
}

function epochSecondsToDate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return new Date().toISOString().split("T")[0];
  }

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return date.toISOString().split("T")[0];
}

async function fetchYFinanceFallback(symbol: string): Promise<ShortInterestRecord | null> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/stock/${encodeURIComponent(symbol)}/financials`);
    if (!res.ok) return null;

    const data = (await res.json()) as YFinanceFinancialsShortFields;
    if (data.sharesShort == null) return null;

    const previousShort = data.sharesShortPriorMonth ?? null;
    const changePrevious =
      previousShort != null ? data.sharesShort - previousShort : null;
    const changePercent =
      previousShort != null && previousShort !== 0 && changePrevious != null
        ? (changePrevious / previousShort) * 100
        : null;

    // 仅作为官方 FINRA 无结果时的降级展示，不把它伪装成实时 short interest。
    return {
      symbol: data.symbol ?? symbol,
      issueName: data.longName ?? symbol,
      settlementDate: epochSecondsToDate(data.dateShortInterest),
      currentShortPosition: data.sharesShort,
      previousShortPosition: previousShort,
      changePrevious,
      changePercent,
      averageDailyVolume: FALLBACK_SHORT_AVERAGE_VOLUME,
      daysToCover: data.shortRatio ?? null,
      marketClassCode: FALLBACK_MARKET_CLASS_CODE,
    };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const cacheKey = `short-interest:${symbol}`;

  const cached = cacheGet<ShortInterestResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const records = await fetchFinra(symbol);
  const fallback = records.length === 0 ? await fetchYFinanceFallback(symbol) : null;
  const latest = records[0] ?? fallback;
  const asOf = latest?.settlementDate ?? new Date().toISOString().split("T")[0];
  const sourceStatus = records.length > 0
    ? "official"
    : fallback
      ? "fallback"
      : "unavailable";

  const data: ShortInterestResponse = {
    symbol,
    records: (records.length > 0 ? records : fallback ? [fallback] : []).slice(0, 24),
    latest: latest ?? null,
    sourceStatus,
    meta: buildMeta(sourceStatus === "fallback" ? "yfinance" : "finra-short", asOf, {
      confidence: sourceStatus === "official" ? "medium" : "low",
      note: sourceStatus === "fallback"
        ? "Fallback from yfinance quote summary because FINRA official rows were unavailable."
        : undefined,
    }),
  };

  cacheSet(cacheKey, data, CACHE_TTL.SHORT_INTEREST);
  return NextResponse.json(data);
}
