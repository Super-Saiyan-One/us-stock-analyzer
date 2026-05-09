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
  const fallback = cloneJson(btcStrategyFallback) as BtcStrategyResponse;
  return {
    ...fallback,
    dataSource: {
      ...fallback.dataSource,
      isFallback: true,
    },
  };
}

export function getUsIndexStrategyFallback(
  symbol: UsIndexSymbol
): UsIndexStrategyResponse {
  const fallback = cloneJson(
    symbol === "QQQ" ? usIndexQqqFallback : usIndexSpyFallback
  ) as UsIndexStrategyResponse;
  return {
    ...fallback,
    dataSource: {
      ...fallback.dataSource,
      isFallback: true,
    },
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
