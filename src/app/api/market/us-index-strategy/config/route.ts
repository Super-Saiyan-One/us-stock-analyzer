import { NextResponse } from "next/server";
import {
  DEFAULT_US_INDEX_STRATEGY_CONFIG,
  normalizeUsIndexStrategyConfig,
} from "@/lib/us-index-strategy-engine";
import type { UsIndexStrategyConfig } from "@/types/us-index-strategy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<UsIndexStrategyConfig>;
    const config = normalizeUsIndexStrategyConfig({
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      ...body,
      currentForwardPE: undefined,
      currentQQQPE: undefined,
    });
    try {
      const { saveUsIndexStrategyConfig } = await import("@/lib/db");
      saveUsIndexStrategyConfig(config);
      return NextResponse.json(config);
    } catch (error) {
      console.error("US index strategy config persistence failed; returning volatile config", error);
      return NextResponse.json(config, {
        headers: { "X-Config-Persistence": "volatile" },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save US index strategy config" },
      { status: 400 }
    );
  }
}
