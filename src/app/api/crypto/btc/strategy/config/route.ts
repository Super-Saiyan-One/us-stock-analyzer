import { NextResponse } from "next/server";
import {
  DEFAULT_BTC_STRATEGY_CONFIG,
  getBtcStrategyTemplate,
  normalizeConfig,
} from "@/lib/btc-strategy-engine";
import { saveBtcStrategyConfig } from "@/lib/db";
import type { BtcStrategyConfig } from "@/types/btc-strategy";

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<BtcStrategyConfig>;
    const template = getBtcStrategyTemplate(body.templateId);
    const config = normalizeConfig({
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      ...template.defaultConfig,
      ...body,
    });
    saveBtcStrategyConfig(config);
    return NextResponse.json(config);
  } catch {
    return NextResponse.json(
      { error: "Failed to save BTC strategy config" },
      { status: 400 }
    );
  }
}
