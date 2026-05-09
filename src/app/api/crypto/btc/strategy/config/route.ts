import { NextResponse } from "next/server";
import {
  DEFAULT_BTC_STRATEGY_CONFIG,
  getBtcStrategyTemplate,
  normalizeConfig,
} from "@/lib/btc-strategy-engine";
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
    try {
      const { saveBtcStrategyConfig } = await import("@/lib/db");
      saveBtcStrategyConfig(config);
      return NextResponse.json(config);
    } catch (error) {
      console.error("BTC strategy config persistence failed; returning volatile config", error);
      return NextResponse.json(config, {
        headers: { "X-Config-Persistence": "volatile" },
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to save BTC strategy config" },
      { status: 400 }
    );
  }
}
