"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ChartDataPoint } from "@/types/stock";

const RANGES: { label: string; range: string; interval: string }[] = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1W", range: "5d", interval: "15m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" },
  { label: "MAX", range: "max", interval: "1mo" },
];

function useChartData(symbol: string, range: string, interval: string) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["stock", symbol, "chart", range],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}/chart?range=${range}&interval=${interval}`
      );
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
    enabled: !!symbol,
    staleTime: STALE_TIME.STOCK_CHART,
  });
}

export function PriceChart({ symbol }: { symbol: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [selectedRange, setSelectedRange] = useState(RANGES[4]);
  const { data, isLoading } = useChartData(
    symbol,
    selectedRange.range,
    selectedRange.interval
  );

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const { createChart, ColorType, LineStyle, AreaSeries } = await import("lightweight-charts");
      if (cancelled || !chartRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }

      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: isDark ? "#a3a3a3" : "#737373",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: isDark ? "#262626" : "#e5e5e5", style: LineStyle.Dotted },
          horzLines: { color: isDark ? "#262626" : "#e5e5e5", style: LineStyle.Dotted },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: isDark ? "#262626" : "#e5e5e5",
        },
        timeScale: {
          borderColor: isDark ? "#262626" : "#e5e5e5",
          timeVisible: selectedRange.range === "1d" || selectedRange.range === "5d",
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartInstanceRef.current = chart;

      const firstClose = data[0]?.close ?? 0;
      const lastClose = data[data.length - 1]?.close ?? 0;
      const isPositive = lastClose >= firstClose;

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: isPositive ? "#22c55e" : "#ef4444",
        lineWidth: 2,
        topColor: isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
        bottomColor: isPositive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)",
        crosshairMarkerRadius: 4,
      });

      const chartData = data.map((d) => ({
        time: d.time as unknown as import("lightweight-charts").Time,
        value: d.close,
      }));

      areaSeries.setData(chartData);
      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver((entries) => {
        if (cancelled) return;
        const entry = entries[0];
        if (entry) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      resizeObserver.observe(chartRef.current);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [data, selectedRange.range]);

  return (
    <div className="p-4">
      <div ref={chartRef} className={cn("w-full", isLoading && "opacity-50")}>
        {isLoading && (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setSelectedRange(r)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              selectedRange.label === r.label
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
