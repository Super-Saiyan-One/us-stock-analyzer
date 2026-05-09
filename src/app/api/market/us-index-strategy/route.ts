import { NextResponse } from "next/server";
import {
  DEFAULT_US_INDEX_STRATEGY_CONFIG,
  US_INDEX_STRATEGY_TEMPLATES,
  evaluateUsIndexStrategy,
} from "@/lib/us-index-strategy-engine";
import {
  getCurrentForwardPE,
  getUsIndexDailyCandles,
  getUsIndexMacroPoints,
} from "@/lib/us-index-market-data";
import { getUsIndexStrategyConfig } from "@/lib/db";
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
    const savedConfig = getUsIndexStrategyConfig();
    const config = {
      ...(savedConfig ?? DEFAULT_US_INDEX_STRATEGY_CONFIG),
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
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate US index strategy" },
      { status: 502 }
    );
  }
}
