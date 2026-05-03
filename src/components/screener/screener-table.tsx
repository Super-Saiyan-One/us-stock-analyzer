"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, formatCompact, formatRatio } from "@/lib/formatters";
import { categoryColor } from "./screener-filters";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { ScreenerStock, ScreenerCategory } from "@/types/screener";

type SortKey = "compositeScore" | "change1D" | "change5D" | "change20D" | "fiftyTwoWeekPct" | "relativeVolume" | "forwardPE" | "marketCap";

function SortHeader({
  label,
  colKey,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onToggle: (key: SortKey) => void;
}) {
  const active = sortKey === colKey;
  return (
    <button
      onClick={() => onToggle(colKey)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      {active ? (
        sortDir === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

interface Props {
  stocks: ScreenerStock[];
  activeCategories: Set<ScreenerCategory>;
  minScore: number;
}

export function ScreenerTable({ stocks, activeCategories, minScore }: Props) {
  const t = useT();
  const ts = (key: string) => t(`screener.${key}`);
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = stocks;
    if (activeCategories.size > 0) {
      list = list.filter((s) => activeCategories.has(s.category));
    }
    if (minScore > 0) {
      list = list.filter((s) => s.compositeScore >= minScore);
    }
    return [...list].sort((a, b) => {
      const aVal = a[sortKey] ?? -Infinity;
      const bVal = b[sortKey] ?? -Infinity;
      return sortDir === "desc"
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });
  }, [stocks, activeCategories, minScore, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {ts("noResults")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("col.symbol")}</th>
            <th className="px-3 py-2.5"><SortHeader label={ts("col.score")} colKey="compositeScore" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("col.category")}</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("col.price")}</th>
            <th className="px-3 py-2.5"><SortHeader label={ts("col.1d")} colKey="change1D" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 sm:table-cell"><SortHeader label={ts("col.5d")} colKey="change5D" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 md:table-cell"><SortHeader label={ts("col.20d")} colKey="change20D" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 md:table-cell"><SortHeader label={ts("col.52w")} colKey="fiftyTwoWeekPct" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 lg:table-cell"><SortHeader label={ts("col.rVol")} colKey="relativeVolume" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 lg:table-cell"><SortHeader label={ts("col.pe")} colKey="forwardPE" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 xl:table-cell"><SortHeader label={ts("col.mktCap")} colKey="marketCap" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} /></th>
            <th className="hidden px-3 py-2.5 xl:table-cell text-xs font-medium text-muted-foreground">{ts("col.triggers")}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.symbol} className="border-b last:border-b-0 transition-colors hover:bg-muted/50">
              <td className="px-3 py-2.5">
                <Link
                  href={`/stock/${s.symbol}`}
                  className="group flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  {s.symbol}
                  <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <div className="text-xs text-muted-foreground truncate max-w-[120px]">{s.name}</div>
              </td>
              <td className="px-3 py-2.5">
                <ScoreBadge score={s.compositeScore} />
              </td>
              <td className="px-3 py-2.5">
                <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", categoryColor(s.category))}>
                  {ts(`cat.${s.category}`)}
                </span>
              </td>
              <td className="px-3 py-2.5 tabular-nums">{formatPrice(s.price)}</td>
              <td className="px-3 py-2.5"><ChangeCell value={s.change1D} /></td>
              <td className="hidden px-3 py-2.5 sm:table-cell"><ChangeCell value={s.change5D} /></td>
              <td className="hidden px-3 py-2.5 md:table-cell"><ChangeCell value={s.change20D} /></td>
              <td className="hidden px-3 py-2.5 md:table-cell">
                <FiftyTwoWeekBar pct={s.fiftyTwoWeekPct} />
              </td>
              <td className="hidden px-3 py-2.5 lg:table-cell">
                <span className={cn("tabular-nums", s.relativeVolume > 1.5 && "font-semibold text-[var(--success)]")}>
                  {s.relativeVolume.toFixed(1)}x
                </span>
              </td>
              <td className="hidden px-3 py-2.5 lg:table-cell tabular-nums">
                {formatRatio(s.forwardPE)}
              </td>
              <td className="hidden px-3 py-2.5 xl:table-cell tabular-nums text-muted-foreground">
                {s.marketCap ? formatCompact(s.marketCap) : "N/A"}
              </td>
              <td className="hidden px-3 py-2.5 xl:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {s.triggers.slice(0, 3).map((tr) => (
                    <span key={tr} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {tr}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        {ts("showing")} {filtered.length} / {stocks.length} {ts("stocks")}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = "bg-muted text-muted-foreground";
  if (score >= 75) color = "bg-emerald-500/15 text-emerald-600";
  else if (score >= 60) color = "bg-blue-500/15 text-blue-600";
  else if (score >= 45) color = "bg-amber-500/15 text-amber-600";
  else color = "bg-muted text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", color)}>
      {score}
    </span>
  );
}

function ChangeCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular-nums text-sm",
        value > 0 && "text-[var(--success)]",
        value < 0 && "text-[var(--destructive)]"
      )}
    >
      {formatPercent(value)}
    </span>
  );
}

function FiftyTwoWeekBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pct > 80 ? "bg-emerald-500" : pct > 50 ? "bg-blue-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
