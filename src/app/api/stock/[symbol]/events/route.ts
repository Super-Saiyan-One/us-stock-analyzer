import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  CACHE_TTL,
  SEC_ARCHIVES_BASE,
  SEC_COMPANY_TICKERS_API,
  SEC_SUBMISSIONS_API,
  SEC_USER_AGENT,
} from "@/lib/constants";
import { validateSymbol } from "@/lib/api";
import { buildMeta } from "@/lib/data-source-registry";
import { insertPitEvent } from "@/lib/db";
import type { StockEvent, StockEventsResponse } from "@/types/events";

interface SecTickerItem {
  cik_str: number;
  ticker: string;
  title: string;
}

interface SecSubmissionRecent {
  accessionNumber?: string[];
  filingDate?: string[];
  reportDate?: string[];
  acceptanceDateTime?: string[];
  form?: string[];
  primaryDocument?: string[];
  primaryDocDescription?: string[];
}

interface SecSubmissionResponse {
  cik: string;
  name: string;
  tickers?: string[];
  filings?: {
    recent?: SecSubmissionRecent;
  };
}

const WATCHED_FORMS = new Set([
  "10-K",
  "10-K/A",
  "10-Q",
  "10-Q/A",
  "8-K",
  "8-K/A",
  "13D",
  "13D/A",
  "13G",
  "13G/A",
  "4",
  "4/A",
  "S-3",
  "S-3/A",
  "424B2",
  "424B5",
  "DEF 14A",
]);

function secHeaders() {
  return {
    "User-Agent": SEC_USER_AGENT,
    Accept: "application/json",
  };
}

async function getCik(symbol: string) {
  const cacheKey = "sec:company-tickers";
  const cached = cacheGet<SecTickerItem[]>(cacheKey);
  let tickers = cached;

  if (!tickers) {
    const res = await fetch(SEC_COMPANY_TICKERS_API, {
      headers: secHeaders(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, SecTickerItem>;
    tickers = Object.values(json);
    cacheSet(cacheKey, tickers, CACHE_TTL.SEC_TICKERS);
  }

  const item = tickers.find((t) => t.ticker.toUpperCase() === symbol);
  if (!item) return null;
  return {
    cik: String(item.cik_str).padStart(10, "0"),
    title: item.title,
  };
}

function severityFor(form: string): StockEvent["severity"] {
  if (form.startsWith("8-K") || form.startsWith("13D") || form.startsWith("13G")) {
    return "high";
  }
  if (form.startsWith("S-3") || form.startsWith("424B")) return "high";
  if (form.startsWith("10-") || form === "DEF 14A") return "medium";
  if (form === "4" || form === "4/A") return "medium";
  return "low";
}

function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string) {
  const cikNumber = String(Number(cik));
  const accessionPath = accessionNumber.replaceAll("-", "");
  return `${SEC_ARCHIVES_BASE}/${cikNumber}/${accessionPath}/${primaryDocument}`;
}

function parseEvents(
  symbol: string,
  cik: string,
  companyName: string,
  recent: SecSubmissionRecent | undefined
): StockEvent[] {
  const forms = recent?.form ?? [];
  const filings: StockEvent[] = [];

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i] ?? "";
    if (!WATCHED_FORMS.has(form)) continue;

    const accessionNumber = recent?.accessionNumber?.[i] ?? "";
    const primaryDocument = recent?.primaryDocument?.[i] ?? "";
    const filingDate = recent?.filingDate?.[i] ?? "";
    if (!accessionNumber || !primaryDocument || !filingDate) continue;

    filings.push({
      id: `${cik}-${accessionNumber}`,
      symbol,
      cik,
      companyName,
      form,
      filingDate,
      reportDate: recent?.reportDate?.[i] || null,
      acceptanceDateTime: recent?.acceptanceDateTime?.[i] || null,
      accessionNumber,
      primaryDocument,
      description: recent?.primaryDocDescription?.[i] || form,
      url: buildFilingUrl(cik, accessionNumber, primaryDocument),
      severity: severityFor(form),
    });
  }

  return filings.slice(0, 12);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  const symbol = validateSymbol(rawSymbol);
  const cacheKey = `sec:events:${symbol}`;

  const cached = cacheGet<StockEventsResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const cikInfo = await getCik(symbol);
  if (!cikInfo) {
    const empty: StockEventsResponse = {
      symbol,
      cik: null,
      companyName: null,
      events: [],
      meta: buildMeta("sec-edgar", new Date().toISOString().split("T")[0], {
        confidence: "low",
      }),
    };
    cacheSet(cacheKey, empty, CACHE_TTL.SEC_EVENTS);
    return NextResponse.json(empty);
  }

  const res = await fetch(`${SEC_SUBMISSIONS_API}/CIK${cikInfo.cik}.json`, {
    headers: secHeaders(),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch SEC submissions" },
      { status: 502 }
    );
  }

  const json = (await res.json()) as SecSubmissionResponse;
  const companyName = json.name || cikInfo.title;
  const events = parseEvents(symbol, cikInfo.cik, companyName, json.filings?.recent);

  for (const event of events) {
    insertPitEvent({
      entity: symbol,
      eventType: `filing:${event.form}`,
      observedAt: event.filingDate,
      availableAt: event.acceptanceDateTime ?? event.filingDate,
      source: "sec-edgar",
      data: {
        accessionNumber: event.accessionNumber,
        form: event.form,
        reportDate: event.reportDate,
        primaryDocument: event.primaryDocument,
        url: event.url,
      },
    });
  }

  const latestDate = events[0]?.filingDate ?? new Date().toISOString().split("T")[0];
  const data: StockEventsResponse = {
    symbol,
    cik: cikInfo.cik,
    companyName,
    events,
    meta: buildMeta("sec-edgar", latestDate),
  };

  cacheSet(cacheKey, data, CACHE_TTL.SEC_EVENTS);
  return NextResponse.json(data);
}
