import { NextResponse } from "next/server";
import {
  DEFAULT_US_INDEX_STRATEGY_CONFIG,
  normalizeUsIndexStrategyConfig,
} from "@/lib/us-index-strategy-engine";
import { saveUsIndexStrategyConfig } from "@/lib/db";
import type { UsIndexStrategyConfig } from "@/types/us-index-strategy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<UsIndexStrategyConfig>;
    const config = normalizeUsIndexStrategyConfig({
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      ...body,
      currentForwardPE: undefined,
    });
    saveUsIndexStrategyConfig(config);
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save US index strategy config" },
      { status: 400 }
    );
  }
}
