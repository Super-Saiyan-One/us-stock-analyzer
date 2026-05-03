"use client";

import { useStockQuote } from "@/hooks/use-stock-quote";
import { useT } from "@/i18n/context";
import { formatPrice, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useWatchlistStore } from "@/stores/watchlist-store";

export function StockQuoteHeader({ symbol }: { symbol: string }) {
  const { data, isLoading } = useStockQuote(symbol);
  const t = useT();
  const { has, add, remove } = useWatchlistStore();
  const inWatchlist = has(symbol.toUpperCase());

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.change >= 0;

  return (
    <div className="flex items-start justify-between p-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">{data.symbol}</h1>
          <span className="text-sm text-muted-foreground">{data.longName}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {data.marketState === "REGULAR"
              ? t("market.open")
              : data.marketState === "PRE"
                ? t("market.pre")
                : t("market.closed")}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {formatPrice(data.price)}
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? "+" : ""}
            {data.change.toFixed(2)} ({formatPercent(data.changePercent)})
          </span>
        </div>
      </div>
      <button
        onClick={() =>
          inWatchlist
            ? remove(symbol.toUpperCase())
            : add(symbol.toUpperCase())
        }
        aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        className="rounded-full p-2 transition-colors hover:bg-muted"
      >
        <Star
          className={cn(
            "h-5 w-5",
            inWatchlist ? "fill-warning text-warning" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}
