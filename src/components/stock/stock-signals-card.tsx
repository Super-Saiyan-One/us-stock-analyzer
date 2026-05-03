"use client";

import { useStockQuote } from "@/hooks/use-stock-quote";
import { useStockFinancials } from "@/hooks/use-stock-financials";
import { useOptionsSummary } from "@/hooks/use-options-summary";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { computeSignals } from "@/lib/signal-engine";
import type { SignalStatus } from "@/types/signals";

const STATUS_STYLE: Record<SignalStatus, { icon: string; color: string }> = {
  "risk-on": { icon: "🟢", color: "text-success" },
  neutral: { icon: "⚪", color: "text-muted-foreground" },
  crowded: { icon: "🟡", color: "text-warning" },
  fragile: { icon: "🟠", color: "text-orange-500" },
  "event-risk": { icon: "⚡", color: "text-primary" },
  "liquidity-risk": { icon: "🔴", color: "text-destructive" },
};

export function StockSignalsCard({ symbol }: { symbol: string }) {
  const { data: quote } = useStockQuote(symbol);
  const { data: fin } = useStockFinancials(symbol);
  const { data: opts } = useOptionsSummary(symbol);
  const t = useT();

  const signals = computeSignals(
    quote ? { price: quote.price, fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh, fiftyTwoWeekLow: quote.fiftyTwoWeekLow } : null,
    fin ? { trailingPE: fin.trailingPE, forwardPE: fin.forwardPE, beta: fin.beta } : null,
    opts?.hasOptions ? {
      atmIV: opts.atmIV, putCallOIRatio: opts.putCallOIRatio,
      ivRvPremium: opts.ivRvPremium, realizedVol20D: opts.realizedVol20D,
      ivTermStructure: opts.ivTermStructure || [],
      maxCallOIStrike: opts.maxCallOIStrike, nearDTE: opts.nearDTE,
    } : null,
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{t("signals.title")}</h3>
      <div className="mt-2 space-y-2.5">
        {signals.map((s) => {
          const style = STATUS_STYLE[s.status];
          return (
            <div key={s.id} className="rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <span>{style.icon}</span>
                <span className={cn("font-semibold", style.color)}>{t(s.labelKey)}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {s.horizon}
                </span>
              </div>
              {s.evidence.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {s.evidence.map((e, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{e.indicator}:</span>{" "}
                      {e.currentValue}
                      {e.context && <span className="ml-1">({e.context})</span>}
                    </div>
                  ))}
                </div>
              )}
              {s.invalidation && (
                <div className="mt-1 text-[10px] text-muted-foreground italic">
                  {t("signals.invalidWhen")}: {s.invalidation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
