import { NextResponse } from "next/server";
import { getBtcDailyCandles, getCbbiDaily } from "@/lib/btc-market-data";
import {
  BTC_STRATEGY_TEMPLATES,
  DEFAULT_BTC_STRATEGY_CONFIG,
  evaluateBtcStrategy,
  normalizeConfig,
} from "@/lib/btc-strategy-engine";
import {
  getBtcStrategyFallback,
  STATIC_FALLBACK_HEADERS,
} from "@/lib/strategy-fallbacks";
import type {
  BtcStrategyConfig,
  BtcStrategyResponse,
} from "@/types/btc-strategy";

export async function GET() {
  try {
    const config = await getConfigOrDefault();
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
        isFallback: false,
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("BTC strategy live data failed; serving static fallback", error);
    return NextResponse.json(getBtcStrategyFallback(), {
      headers: {
        ...STATIC_FALLBACK_HEADERS,
        "Cache-Control": "no-store",
      },
    });
  }
}

async function getConfigOrDefault(): Promise<BtcStrategyConfig> {
  try {
    const { getBtcStrategyConfig } = await import("@/lib/db");
    return normalizeConfig(getBtcStrategyConfig() ?? DEFAULT_BTC_STRATEGY_CONFIG);
  } catch (error) {
    console.error("BTC strategy config read failed; using default config", error);
    return normalizeConfig(DEFAULT_BTC_STRATEGY_CONFIG);
  }
}
