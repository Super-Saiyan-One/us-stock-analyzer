"use client";

import { useFredLatest } from "@/hooks/use-fred";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import { useT } from "@/i18n/context";

const SERIES_TIP_KEY: Record<string, string> = {
  DGS10: "tip.spread10y2y",
  DGS2: "tip.spread10y2y",
  WALCL: "tip.fedBalanceSheet",
  DFF: "tip.fedFundsRate",
  WTREGEN: "tip.tga",
  RRPONTSYD: "tip.reverseRepo",
  VIXCLS: "tip.vix",
  BAMLH0A0HYM2: "tip.hySpread",
  BAMLC0A0CM: "tip.igSpread",
  ICSA: "tip.claims",
  CPIAUCSL: "tip.cpi",
  PCEPILFE: "tip.corePCE",
  FEDFUNDS: "tip.fedFundsRate",
};

interface Props {
  series: string;
  label: string;
  suffix?: string;
  format?: (v: number) => string;
  thresholds?: { warn: number; danger: number; invert?: boolean };
}

export function FredMetricCard({ series, label, suffix = "", format, thresholds }: Props) {
  const { latest, prev, isLoading } = useFredLatest(series);
  const t = useT();
  const tipKey = SERIES_TIP_KEY[series];
  const tipContent = tipKey ? t(tipKey) : undefined;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-3">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-6 w-14 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {tipContent && <InfoTip content={tipContent} />}
        </div>
        <div className="mt-0.5 text-base font-semibold text-muted-foreground">N/A</div>
      </div>
    );
  }

  const val = latest.value;
  const formatted = format ? format(val) : val.toFixed(2);

  let change: number | null = null;
  if (prev) change = val - prev.value;

  let statusColor = "";
  if (thresholds) {
    const { warn, danger, invert } = thresholds;
    if (invert) {
      if (val <= danger) statusColor = "text-destructive";
      else if (val <= warn) statusColor = "text-warning";
    } else {
      if (val >= danger) statusColor = "text-destructive";
      else if (val >= warn) statusColor = "text-warning";
    }
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tipContent && <InfoTip content={tipContent} />}
      </div>
      <div className={cn("mt-0.5 text-base font-bold tabular-nums", statusColor)}>
        {formatted}{suffix}
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        {change !== null && (
          <span className={cn("tabular-nums",
            change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {change > 0 ? "+" : ""}{change.toFixed(2)}
          </span>
        )}
        <span className="text-muted-foreground">{latest.date}</span>
      </div>
    </div>
  );
}
