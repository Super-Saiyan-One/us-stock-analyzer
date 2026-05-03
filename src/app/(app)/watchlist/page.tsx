"use client";

import Link from "next/link";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { useStockQuote } from "@/hooks/use-stock-quote";
import { useT } from "@/i18n/context";
import { formatPrice, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Star, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

function WatchlistItem({ symbol }: { symbol: string }) {
  const { data, isLoading } = useStockQuote(symbol);
  const { remove } = useWatchlistStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.change >= 0;

  return (
    <div className="flex items-center border-b transition-colors hover:bg-muted/50">
      <Link
        href={`/stock/${symbol}`}
        className="flex flex-1 items-center justify-between px-4 py-3"
      >
        <div>
          <span className="font-semibold">{symbol}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {data.longName}
          </span>
        </div>
        <div className="text-right">
          <div className="font-medium tabular-nums">
            {formatPrice(data.price)}
          </div>
          <div
            className={cn(
              "text-xs font-medium tabular-nums",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {formatPercent(data.changePercent)}
          </div>
        </div>
      </Link>
      <button
        onClick={() => remove(symbol)}
        aria-label={`Remove ${symbol}`}
        className="mr-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function WatchlistPage() {
  const { symbols } = useWatchlistStore();
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-bold">{t("watchlist.title")}</h1>
      {symbols.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t("watchlist.empty")}
          action={
            <Link
              href="/stock"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("watchlist.searchStocks")}
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          {symbols.map((s) => (
            <WatchlistItem key={s} symbol={s} />
          ))}
        </div>
      )}
    </div>
  );
}
