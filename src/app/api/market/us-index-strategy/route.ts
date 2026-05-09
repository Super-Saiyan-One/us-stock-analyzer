import { NextResponse } from "next/server";
import {
  US_INDEX_STRATEGY_TEMPLATES,
  evaluateUsIndexStrategy,
  resolveUsIndexStrategyConfig,
} from "@/lib/us-index-strategy-engine";
import {
  getCurrentForwardPE,
  getUsIndexDailyCandles,
  getUsIndexMacroPoints,
} from "@/lib/us-index-market-data";
import {
  getUsIndexStrategyFallback,
  STATIC_FALLBACK_HEADERS,
} from "@/lib/strategy-fallbacks";
import type { UsIndexStrategyResponse, UsIndexSymbol } from "@/types/us-index-strategy";

function parseSymbol(value: string | null): UsIndexSymbol {
  return value === "QQQ" ? "QQQ" : "SPY";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = parseSymbol(searchParams.get("symbol"));
    const [candles, forwardPE] = await Promise.all([
      getUsIndexDailyCandles(symbol),
      getCurrentForwardPE(),
    ]);
    const macro = await getUsIndexMacroPoints(candles);
    const savedConfig = await getSavedConfigOrNull();
    const resolvedConfig = resolveUsIndexStrategyConfig(savedConfig);
    const config = {
      ...resolvedConfig,
      currentForwardPE: forwardPE,
    };
    const evaluation = evaluateUsIndexStrategy(candles, macro, config);
    const response: UsIndexStrategyResponse = {
      symbol,
      ...evaluation,
      templates: US_INDEX_STRATEGY_TEMPLATES,
      dataSource: {
        priceSource: "yahoo",
        macroSource: "yahoo-cnn-shiller-stockmarketperatio",
        priceAsOf: candles.at(-1)?.date ?? null,
        macroAsOf: macro.at(-1)?.date ?? null,
        forwardPEAsOf: forwardPE.date,
        isFallback: false,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    const { searchParams } = new URL(request.url);
    const symbol = parseSymbol(searchParams.get("symbol"));
    console.error("US index strategy live data failed; serving static fallback", error);
    return NextResponse.json(getUsIndexStrategyFallback(symbol), {
      headers: STATIC_FALLBACK_HEADERS,
    });
  }
}

async function getSavedConfigOrNull() {
  try {
    const { getUsIndexStrategyConfig } = await import("@/lib/db");
    return getUsIndexStrategyConfig();
  } catch (error) {
    console.error("US index strategy config read failed; using default config", error);
    return null;
  }
}
