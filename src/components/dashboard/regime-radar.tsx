"use client";

import { useMarketRegime } from "@/hooks/use-regime";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import type { RegimeSignal, RegimeDimensionData } from "@/types/data-meta";

const SIGNAL_CONFIG: Record<
  RegimeSignal,
  { labelKey: string; color: string; bg: string; icon: string }
> = {
  "risk-on": { labelKey: "regime.riskOn", color: "text-success", bg: "bg-success/10", icon: "🟢" },
  neutral: { labelKey: "regime.neutral", color: "text-foreground", bg: "bg-muted", icon: "⚪" },
  caution: { labelKey: "regime.caution", color: "text-warning", bg: "bg-warning/10", icon: "🟡" },
  "risk-off": { labelKey: "regime.riskOff", color: "text-destructive", bg: "bg-destructive/10", icon: "🔴" },
};

const DIR_MAP: Record<string, { arrow: string; key: string }> = {
  improving: { arrow: "↗", key: "regime.improving" },
  stable: { arrow: "→", key: "regime.stable" },
  deteriorating: { arrow: "↘", key: "regime.deteriorating" },
};

function DimensionRow({ dim, t }: { dim: RegimeDimensionData; t: (k: string) => string }) {
  const cfg = SIGNAL_CONFIG[dim.signal];
  const dir = DIR_MAP[dim.direction] || DIR_MAP.stable;
  const dimKey = `regime.dim.${dim.dimension}`;
  const value = dim.detail.split(",")[0]?.split(":")[1]?.trim() || "";

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="text-sm">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{t(dimKey)}</span>
          <span className={cn("text-[10px] font-medium", cfg.color, cfg.bg, "rounded px-1.5 py-0.5")}>
            {t(cfg.labelKey)}
          </span>
          <span className="text-xs text-muted-foreground" title={t(dir.key)}>
            {dir.arrow}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
          {dim.meta.seriesId}: {value} · {dim.percentile}th {t("regime.percentile")} · {t(dir.key)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", {
              "bg-success": dim.percentile <= 30,
              "bg-lime-500": dim.percentile > 30 && dim.percentile <= 50,
              "bg-warning": dim.percentile > 50 && dim.percentile <= 70,
              "bg-orange-500": dim.percentile > 70 && dim.percentile <= 85,
              "bg-destructive": dim.percentile > 85,
            })}
            style={{ width: `${dim.percentile}%` }}
          />
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
          {dim.meta.asOf} · {dim.meta.source}
        </div>
      </div>
    </div>
  );
}

export function RegimeRadar() {
  const { data, isLoading } = useMarketRegime();
  const t = useT();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.dimensions.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{t("regime.title")}</h2>
        <p className="mt-2 text-xs text-muted-foreground">{t("regime.noData")}</p>
      </div>
    );
  }

  const overallCfg = SIGNAL_CONFIG[data.overall];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {t("regime.title")}
          <InfoTip content={t("tip.regime")} />
        </h2>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", overallCfg.color, overallCfg.bg)}>
          {overallCfg.icon} {t(overallCfg.labelKey)}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {data.dimensions.map((dim) => (
          <DimensionRow key={dim.dimension} dim={dim} t={t} />
        ))}
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground text-right">
        {t("regime.updated")}: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
