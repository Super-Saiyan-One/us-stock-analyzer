"use client";

import { useShillerLatest, useForwardPE } from "@/hooks/use-market-data";
import { formatRatio } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import { useT } from "@/i18n/context";

function MetricItem({ label, value, subtitle, tip }: { label: string; value: string; subtitle?: string; tip?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tip && <InfoTip content={tip} />}
      </span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

export function MarketValuationCard() {
  const { data, isLoading } = useShillerLatest();
  const { data: forwardPEData } = useForwardPE();
  const tt = useT();
  const t = (key: string) => tt(`val.${key}`);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-7 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cape = data.cape;
  const levelKey = cape < 15 ? "undervalued" : cape < 20 ? "fairValue" : cape < 30 ? "elevated" : "overvalued";
  const levelColor = cape < 15 ? "text-success" : cape < 20 ? "text-foreground" : cape < 30 ? "text-warning" : "text-destructive";
  const levelBg = cape < 15 ? "bg-success/10" : cape < 20 ? "bg-muted" : cape < 30 ? "bg-warning/10" : "bg-destructive/10";

  const trailingPE = forwardPEData?.trailingPE ?? null;
  const forwardPE = forwardPEData?.forwardPE ?? null;
  const earningsYield = trailingPE && trailingPE > 0
    ? (1 / trailingPE) * 100 : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("marketValuation")}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", levelColor, levelBg)}>
          {t(levelKey)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricItem label={t("cape")} value={formatRatio(cape)} subtitle={t("capeSubtitle")} tip={tt("tip.cape")} />
        <MetricItem label={t("trailingPE")} value={formatRatio(trailingPE)} subtitle="S&P 500" tip={tt("tip.trailingPE")} />
        <MetricItem label={t("forwardPE")} value={formatRatio(forwardPE)} subtitle="S&P 500" tip={tt("tip.forwardPE")} />
        <MetricItem label={t("earningsYield")}
          value={earningsYield != null ? `${earningsYield.toFixed(2)}%` : "N/A"}
          subtitle={t("earningsYieldSub")} tip={tt("tip.earningsYield")} />
      </div>
    </div>
  );
}
