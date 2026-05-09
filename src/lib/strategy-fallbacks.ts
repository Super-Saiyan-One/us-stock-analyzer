import btcStrategyFallback from "@/data/fallbacks/btc-strategy.json";
import usIndexQqqFallback from "@/data/fallbacks/us-index-strategy-qqq.json";
import usIndexSpyFallback from "@/data/fallbacks/us-index-strategy-spy.json";
import type { BtcStrategyResponse } from "@/types/btc-strategy";
import type {
  UsIndexStrategyResponse,
  UsIndexSymbol,
} from "@/types/us-index-strategy";

export const STATIC_FALLBACK_HEADERS = {
  "X-Data-Fallback": "static-snapshot",
};

export function getBtcStrategyFallback(): BtcStrategyResponse {
  return cloneJson(btcStrategyFallback) as BtcStrategyResponse;
}

export function getUsIndexStrategyFallback(
  symbol: UsIndexSymbol
): UsIndexStrategyResponse {
  return cloneJson(
    symbol === "QQQ" ? usIndexQqqFallback : usIndexSpyFallback
  ) as UsIndexStrategyResponse;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
