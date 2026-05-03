"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { STALE_TIME } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settings-store";
import { useT } from "@/i18n/context";
import type { StockSearchResult } from "@/types/stock";

function useStockSearch(q: string) {
  return useQuery<StockSearchResult[]>({
    queryKey: ["stock", "search", q],
    queryFn: async () => {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: q.length >= 1,
    staleTime: STALE_TIME.SEARCH,
  });
}

export default function StockSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: results } = useStockSearch(query);
  const { recentSearches, addRecentSearch } = useSettingsStore();

  const handleSelect = useCallback(
    (symbol: string) => {
      addRecentSearch(symbol);
      router.push(`/stock/${symbol}`);
    },
    [addRecentSearch, router]
  );

  const t = useT();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-bold">{t("stock.search")}</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder={t("stock.searchPlaceholder")}
          aria-label="Search stocks"
          className="h-10 w-full rounded-lg border bg-card pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      {results && results.length > 0 && (
        <div className="mt-2 rounded-lg border bg-card">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className="flex w-full items-center justify-between border-b px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted"
            >
              <div>
                <span className="font-semibold">{r.symbol}</span>
                <span className="ml-2 text-muted-foreground">{r.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}

      {!query && recentSearches.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("stock.recentSearches")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
