"use client";

import { useState } from "react";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BacktestResult } from "@/types/screener";

interface Props {
  results: BacktestResult[];
}

export function BacktestTable({ results }: Props) {
  const t = useT();
  const ts = (key: string) => t(`signalLab.${key}`);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(signalId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(signalId)) next.delete(signalId);
      else next.add(signalId);
      return next;
    });
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {ts("noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground" />
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("signalId")}</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("samples")}</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground" colSpan={3}>
              <div className="flex items-center gap-4">
                <span>{ts("winRate")}</span>
                <span className="text-[10px] opacity-60">1D / 5D / 20D</span>
              </div>
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-medium text-muted-foreground md:table-cell" colSpan={3}>
              <div className="flex items-center gap-4">
                <span>{ts("avgReturn")}</span>
                <span className="text-[10px] opacity-60">1D / 5D / 20D</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const isExpanded = expanded.has(r.signalId);
            return (
              <>
                <tr
                  key={r.signalId}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => r.byRegime && toggleExpand(r.signalId)}
                >
                  <td className="px-3 py-2.5 w-8">
                    {r.byRegime ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{formatSignalId(r.signalId)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.sampleCount}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-3 tabular-nums">
                      <WinRateCell value={r.winRate1D} />
                      <WinRateCell value={r.winRate5D} />
                      <WinRateCell value={r.winRate20D} />
                    </div>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <div className="flex gap-3 tabular-nums">
                      <ReturnCell value={r.avgReturn1D} />
                      <ReturnCell value={r.avgReturn5D} />
                      <ReturnCell value={r.avgReturn20D} />
                    </div>
                  </td>
                </tr>
                {isExpanded && r.byRegime && (
                  Object.entries(r.byRegime).map(([regime, stats]) => (
                    <tr key={`${r.signalId}-${regime}`} className="border-b bg-muted/30">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-xs text-muted-foreground pl-8">
                        {regime}
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums">{stats.sampleCount}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-3 tabular-nums text-xs">
                          <WinRateCell value={stats.winRate1D} />
                          <WinRateCell value={stats.winRate5D} />
                          <WinRateCell value={stats.winRate20D} />
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <div className="flex gap-3 tabular-nums text-xs">
                          <ReturnCell value={stats.avgReturn1D} />
                          <ReturnCell value={stats.avgReturn5D} />
                          <ReturnCell value={stats.avgReturn20D} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WinRateCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "text-sm",
        value >= 60 && "text-[var(--success)] font-semibold",
        value < 40 && "text-[var(--destructive)]"
      )}
    >
      {value.toFixed(0)}%
    </span>
  );
}

function ReturnCell({ value }: { value: number }) {
  const sign = value >= 0 ? "+" : "";
  return (
    <span
      className={cn(
        "text-sm",
        value > 0 && "text-[var(--success)]",
        value < 0 && "text-[var(--destructive)]"
      )}
    >
      {sign}{value.toFixed(2)}%
    </span>
  );
}

function formatSignalId(id: string): string {
  return id
    .replace("screener:", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
