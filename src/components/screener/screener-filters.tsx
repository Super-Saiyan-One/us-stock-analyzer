"use client";

import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import type { ScreenerCategory, UniverseId } from "@/types/screener";
import { Layers, Filter } from "lucide-react";

const CATEGORIES: { key: ScreenerCategory; colorClass: string }[] = [
  { key: "breakout", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { key: "momentum", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { key: "squeeze-setup", colorClass: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { key: "quality-growth", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { key: "value", colorClass: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  { key: "vol-rich", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { key: "valuation-reset", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
];

interface Props {
  universe: UniverseId;
  onUniverseChange: (u: UniverseId) => void;
  activeCategories: Set<ScreenerCategory>;
  onToggleCategory: (c: ScreenerCategory) => void;
  minScore: number;
  onMinScoreChange: (v: number) => void;
}

export function ScreenerFilters({
  universe,
  onUniverseChange,
  activeCategories,
  onToggleCategory,
  minScore,
  onMinScoreChange,
}: Props) {
  const t = useT();
  const ts = (key: string) => t(`screener.${key}`);

  return (
    <div className="space-y-3">
      {/* Universe */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{ts("universe")}</span>
        <div className="flex gap-1.5">
          {(["sp500", "watchlist"] as UniverseId[]).map((u) => (
            <button
              key={u}
              onClick={() => onUniverseChange(u)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                universe === u
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {ts(u)}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{ts("category")}</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ key, colorClass }) => {
            const active = activeCategories.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggleCategory(key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? colorClass : "text-muted-foreground hover:bg-muted"
                )}
              >
                {ts(`cat.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min score */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {ts("minScore")}
        </span>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={minScore}
          onChange={(e) => onMinScoreChange(Number(e.target.value))}
          className="h-1.5 w-32 cursor-pointer accent-primary"
        />
        <span className="text-sm font-semibold tabular-nums">{minScore}</span>
      </div>
    </div>
  );
}

export function categoryColor(category: ScreenerCategory): string {
  const found = CATEGORIES.find((c) => c.key === category);
  return found?.colorClass ?? "bg-muted text-muted-foreground";
}
