"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { useShillerHistory, useForwardPEHistory, useForwardPE } from "@/hooks/use-market-data";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";

const RANGES = [
  { label: "10Y", years: 10 },
  { label: "20Y", years: 20 },
  { label: "50Y", years: 50 },
  { label: "MAX", years: 200 },
] as const;

type Metric = "cape" | "trailingPE" | "forwardPE";

const METRIC_CONFIG: Record<Metric, { color: string; labelKey: string; label: string }> = {
  cape: { color: "#3b82f6", labelKey: "val.cape", label: "CAPE" },
  trailingPE: { color: "#8b5cf6", labelKey: "val.trailingPE", label: "Trailing PE" },
  forwardPE: { color: "#f59e0b", labelKey: "val.forwardPE", label: "Forward PE" },
};

function computeStats(values: number[]) {
  if (values.length === 0) return { mean: 0, median: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { mean, median };
}

export function CapeHistoryChart() {
  const { data: shillerData, isLoading: shillerLoading } = useShillerHistory();
  const { data: fpeHistory } = useForwardPEHistory();
  const { data: forwardPECurrent } = useForwardPE();
  const t = useT();
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[0]);
  const [metric, setMetric] = useState<Metric>("cape");

  const forwardPEValue = forwardPECurrent?.forwardPE ?? null;

  const { chartData, mean, median } = useMemo(() => {
    const cutoffYear = new Date().getFullYear() - range.years;

    function fromTimeSeries(points: { date: string; value: number }[]) {
      const filtered = points.filter(
        (d) => parseInt(d.date) >= cutoffYear && d.value > 0
      );
      if (filtered.length === 0) return { chartData: [] as { date: string; value: number }[], mean: 0, median: 0 };
      const values = filtered.map((d) => d.value);
      const { mean, median } = computeStats(values);
      return {
        chartData: filtered.map((d) => ({
          date: d.date.substring(0, 7),
          value: Math.round(d.value * 100) / 100,
        })),
        mean,
        median,
      };
    }

    // Forward PE mode: show Trailing PE history as the chart line
    if (metric === "forwardPE") {
      const dbTrailing = fpeHistory?.trailing ?? [];
      if (dbTrailing.length >= 10) return fromTimeSeries(dbTrailing);
      // fallback to Shiller
      if (shillerData && shillerData.length > 0) {
        const filtered = shillerData.filter(
          (d) => parseInt(d.date) >= cutoffYear && d.earnings > 0
        );
        const values = filtered.map((d) => d.sp500 / d.earnings);
        const { mean, median } = computeStats(values);
        return {
          chartData: filtered.map((d) => ({
            date: d.date.substring(0, 7),
            value: Math.round((d.sp500 / d.earnings) * 100) / 100,
          })),
          mean,
          median,
        };
      }
      return { chartData: [], mean: 0, median: 0 };
    }

    if (metric === "trailingPE") {
      const dbTrailing = fpeHistory?.trailing ?? [];
      if (dbTrailing.length >= 10) return fromTimeSeries(dbTrailing);
      // fallback to Shiller
      if (shillerData && shillerData.length > 0) {
        const filtered = shillerData.filter(
          (d) => parseInt(d.date) >= cutoffYear && d.earnings > 0
        );
        const values = filtered.map((d) => d.sp500 / d.earnings);
        const { mean, median } = computeStats(values);
        return {
          chartData: filtered.map((d) => ({
            date: d.date.substring(0, 7),
            value: Math.round((d.sp500 / d.earnings) * 100) / 100,
          })),
          mean,
          median,
        };
      }
      return { chartData: [], mean: 0, median: 0 };
    }

    // CAPE
    if (!shillerData || shillerData.length === 0)
      return { chartData: [], mean: 0, median: 0 };

    const filtered = shillerData.filter((d) => {
      const year = parseInt(d.date);
      return year >= cutoffYear && d.cape > 0;
    });
    const values = filtered.map((d) => d.cape);
    const { mean, median } = computeStats(values);
    return {
      chartData: filtered.map((d) => ({
        date: d.date.substring(0, 7),
        value: Math.round(d.cape * 100) / 100,
      })),
      mean,
      median,
    };
  }, [shillerData, fpeHistory, range, metric]);

  if (shillerLoading || chartData.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const config = METRIC_CONFIG[metric];
  const isForwardMode = metric === "forwardPE";
  const latestTrailing = chartData[chartData.length - 1]?.value ?? 0;
  const growthDiscount = isForwardMode && forwardPEValue && latestTrailing > 0
    ? ((latestTrailing - forwardPEValue) / latestTrailing * 100).toFixed(1)
    : null;
  const guideKey = `chartGuide.${metric}`;
  const guide = t(guideKey);
  const hasGuide = guide !== guideKey;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            {isForwardMode ? t("val.forwardPE") : t(config.labelKey)}
            {hasGuide && <InfoTip content={guide} />}
          </h2>
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["cape", "trailingPE", "forwardPE"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                  metric === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {METRIC_CONFIG[m].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                range.label === r.label
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {hasGuide && (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{guide}</p>
      )}

      {isForwardMode && forwardPEValue && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Trailing PE: <span className="font-semibold text-foreground">{latestTrailing.toFixed(1)}</span>
          </span>
          <span className="text-muted-foreground">
            Forward PE: <span className="font-semibold text-[#f59e0b]">{forwardPEValue.toFixed(1)}</span>
          </span>
          {growthDiscount && (
            <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              {growthDiscount}% growth discount
            </span>
          )}
        </div>
      )}

      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="peGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isForwardMode ? "#8b5cf6" : config.color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={isForwardMode ? "#8b5cf6" : config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} width={35}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              formatter={(value) => [
                Number(value).toFixed(2),
                isForwardMode ? "Trailing PE" : config.label,
              ]}
              labelFormatter={(label) => String(label).substring(0, 7)}
            />
            <ReferenceLine
              y={mean} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1}
              label={{ value: `Mean: ${mean.toFixed(1)}`, position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
            />
            <ReferenceLine
              y={median} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1}
              label={{ value: `Median: ${median.toFixed(1)}`, position: "insideBottomRight", fontSize: 10, fill: "#22c55e" }}
            />
            {isForwardMode && forwardPEValue && (
              <ReferenceLine
                y={forwardPEValue} stroke="#f59e0b" strokeWidth={2}
                label={{ value: `Forward: ${forwardPEValue.toFixed(1)}`, position: "insideTopLeft", fontSize: 11, fill: "#f59e0b", fontWeight: 600 }}
              />
            )}
            <Area
              type="monotone" dataKey="value"
              stroke={isForwardMode ? "#8b5cf6" : config.color}
              strokeWidth={1.5}
              fill="url(#peGradient)"
              dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {isForwardMode ? (
          <>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#8b5cf6]" />
              Trailing PE
            </span>
            <span>
              <span className="mr-1 inline-block h-0.5 w-3 bg-[#f59e0b]" />
              Forward PE ({forwardPEValue?.toFixed(1) ?? "N/A"})
            </span>
          </>
        ) : (
          <>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
              Mean: {mean.toFixed(1)}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
              Median: {median.toFixed(1)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
