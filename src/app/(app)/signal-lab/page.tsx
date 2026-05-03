"use client";

import { useState } from "react";
import { useBacktestResults, useSignalObservations } from "@/hooks/use-signal-lab";
import { BacktestTable } from "@/components/signal-lab/backtest-table";
import { ObservationsTable } from "@/components/signal-lab/observations-table";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

type Tab = "performance" | "observations";

export default function SignalLabPage() {
  const t = useT();
  const ts = (key: string) => t(`signalLab.${key}`);

  const [tab, setTab] = useState<Tab>("performance");
  const [selectedSignal, setSelectedSignal] = useState<string | undefined>();

  const { data: backtestResults, isLoading: loadingBacktest } = useBacktestResults();
  const { data: observations, isLoading: loadingObs } = useSignalObservations(selectedSignal, 100);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{ts("title")}</h1>
          <p className="text-xs text-muted-foreground">{ts("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {(["performance", "observations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {ts(t)}
          </button>
        ))}
      </div>

      {/* Signal filter for observations tab */}
      {tab === "observations" && backtestResults && backtestResults.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{ts("signalId")}:</span>
          <select
            value={selectedSignal || ""}
            onChange={(e) => setSelectedSignal(e.target.value || undefined)}
            className="rounded-md border bg-card px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {backtestResults.map((r) => (
              <option key={r.signalId} value={r.signalId}>
                {r.signalId.replace("screener:", "")} ({r.sampleCount})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {tab === "performance" && (
        loadingBacktest ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : (
          <BacktestTable results={backtestResults || []} />
        )
      )}

      {tab === "observations" && (
        loadingObs ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : (
          <ObservationsTable observations={observations || []} />
        )
      )}
    </div>
  );
}
