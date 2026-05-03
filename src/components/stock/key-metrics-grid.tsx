"use client";

import { useStockFinancials } from "@/hooks/use-stock-financials";
import { useT } from "@/i18n/context";
import { formatRatio, formatCompact, formatPercent } from "@/lib/formatters";
import { InfoTip } from "@/components/ui/info-tip";
import type { TranslationKey } from "@/i18n/locales";

function MetricCell({
  label,
  value,
  tip,
}: {
  label: string;
  value: string;
  tip?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tip && <InfoTip content={tip} />}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function KeyMetricsGrid({ symbol }: { symbol: string }) {
  const { data, isLoading } = useStockFinancials(symbol);
  const t = useT();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const na = t("common.na");
  const metrics: { labelKey: TranslationKey; tipKey: string; value: string }[] = [
    { labelKey: "stock.trailingPE", tipKey: "tip.trailingPE", value: formatRatio(data.trailingPE) },
    { labelKey: "stock.forwardPE", tipKey: "tip.forwardPE", value: formatRatio(data.forwardPE) },
    { labelKey: "stock.pegRatio", tipKey: "tip.pegRatio", value: formatRatio(data.pegRatio) },
    {
      labelKey: "stock.divYield", tipKey: "tip.divYield",
      value: data.dividendYield != null
        ? `${(data.dividendYield * 100).toFixed(2)}%`
        : na,
    },
    {
      labelKey: "stock.marketCap", tipKey: "tip.marketCap",
      value: data.marketCap != null ? formatCompact(data.marketCap) : na,
    },
    {
      labelKey: "stock.grossMargin", tipKey: "tip.grossMargin",
      value: data.grossMargins != null
        ? `${(data.grossMargins * 100).toFixed(1)}%`
        : na,
    },
    {
      labelKey: "stock.profitMargin", tipKey: "tip.profitMargin",
      value: data.profitMargins != null
        ? `${(data.profitMargins * 100).toFixed(1)}%`
        : na,
    },
    {
      labelKey: "stock.revenueGrowth", tipKey: "tip.revenueGrowth",
      value: data.revenueGrowth != null
        ? formatPercent(data.revenueGrowth * 100)
        : na,
    },
    { labelKey: "stock.pbRatio", tipKey: "tip.pbRatio", value: formatRatio(data.priceToBook) },
    { labelKey: "stock.beta", tipKey: "tip.beta", value: formatRatio(data.beta) },
    {
      labelKey: "stock.roe", tipKey: "tip.roe",
      value: data.returnOnEquity != null
        ? `${(data.returnOnEquity * 100).toFixed(1)}%`
        : na,
    },
    {
      labelKey: "stock.deRatio", tipKey: "tip.deRatio",
      value: data.debtToEquity != null
        ? data.debtToEquity.toFixed(1)
        : na,
    },
  ];

  return (
    <div className="p-4">
      <h2 className="mb-2 text-sm font-semibold">{t("stock.keyMetrics")}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCell key={m.labelKey} label={t(m.labelKey)} value={m.value} tip={t(m.tipKey)} />
        ))}
      </div>
    </div>
  );
}
