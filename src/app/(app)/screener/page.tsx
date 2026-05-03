"use client";

import { useState, useCallback } from "react";
import { useScreener } from "@/hooks/use-screener";
import { ScreenerTable } from "@/components/screener/screener-table";
import { ScreenerFilters } from "@/components/screener/screener-filters";
import { useT } from "@/i18n/context";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { Radar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScreenerCategory, UniverseId } from "@/types/screener";

export default function ScreenerPage() {
  const t = useT();
  const ts = (key: string) => t(`screener.${key}`);
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);

  const [universe, setUniverse] = useState<UniverseId>("sp500");
  const [activeCategories, setActiveCategories] = useState<Set<ScreenerCategory>>(new Set());
  const [minScore, setMinScore] = useState(0);

  const customSymbols = universe === "watchlist" ? watchlistSymbols : undefined;
  const { data, isLoading, isFetching, refetch } = useScreener(
    universe === "watchlist" ? "custom" : universe,
    customSymbols
  );

  const handleToggleCategory = useCallback((c: ScreenerCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{ts("title")}</h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          {ts("refresh")}
        </button>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <ScreenerFilters
          universe={universe}
          onUniverseChange={setUniverse}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          minScore={minScore}
          onMinScoreChange={setMinScore}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border bg-muted" />
          ))}
          <p className="text-center text-sm text-muted-foreground">{ts("loading")}</p>
        </div>
      ) : data ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {ts("scannedAt")} {new Date(data.scannedAt).toLocaleTimeString()}
            </span>
            <span>
              {data.totalSymbols} {ts("symbolsScanned")}
            </span>
            <span>
              {ts("source")}: {data.meta.source}
            </span>
          </div>
          <ScreenerTable
            stocks={data.stocks}
            activeCategories={activeCategories}
            minScore={minScore}
          />
        </>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {ts("noData")}
        </div>
      )}
    </div>
  );
}
