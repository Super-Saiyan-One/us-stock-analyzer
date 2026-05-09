import { NextResponse } from "next/server";
import { getBtcDailyCandles, getCbbiDaily } from "@/lib/btc-market-data";
import {
  BTC_STRATEGY_TEMPLATES,
  DEFAULT_BTC_STRATEGY_CONFIG,
  evaluateBtcStrategy,
  normalizeConfig,
} from "@/lib/btc-strategy-engine";
import { getBtcStrategyConfig } from "@/lib/db";
import type { BtcStrategyResponse } from "@/types/btc-strategy";

export async function GET() {
  try {
    const config = normalizeConfig(
      getBtcStrategyConfig() ?? DEFAULT_BTC_STRATEGY_CONFIG
    );
    const [priceData, cbbiData] = await Promise.all([
      getBtcDailyCandles(),
      getCbbiDaily(),
    ]);
    const evaluation = evaluateBtcStrategy(
      priceData.candles,
      cbbiData.points,
      config
    );
    const response: BtcStrategyResponse = {
      ...evaluation,
      templates: BTC_STRATEGY_TEMPLATES,
      dataSource: {
        priceSource: priceData.source,
        priceAsOf: priceData.asOf,
        cbbiAsOf: cbbiData.asOf,
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate BTC strategy",
      },
      { status: 502 }
    );
  }
}
