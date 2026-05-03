"use client";

import { useFredSeries, useFredLatest } from "@/hooks/use-fred";
import { useForwardPE } from "@/hooks/use-market-data";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

export function FedModelCard() {
  const { data: dgs10Data } = useFredSeries("DGS10", 120);
  const { latest: dgs10Latest } = useFredLatest("DGS10");
  const { data: forwardPEData } = useForwardPE();
  const t = useT();

  const forwardPE = forwardPEData?.forwardPE ?? null;
  const earningsYield = forwardPE && forwardPE > 0 ? (1 / forwardPE) * 100 : null;
  const treasury10Y = dgs10Latest?.value ?? null;

  const spread = earningsYield != null && treasury10Y != null
    ? earningsYield - treasury10Y
    : null;

  const chartData = useMemo(() => {
    if (!dgs10Data || dgs10Data.length === 0 || !earningsYield) return [];
    return dgs10Data.map((d) => ({
      date: d.date.substring(5),
      treasury: d.value,
      earningsYield: earningsYield,
    }));
  }, [dgs10Data, earningsYield]);

  if (!treasury10Y || !earningsYield) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const isEquityAttractive = spread != null && spread > 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("val.fedModel")}</h3>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
          isEquityAttractive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isEquityAttractive ? t("val.equityAttractive") : t("val.bondAttractive")}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground">{t("val.earningsYieldFwd")}</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-[#8b5cf6]">
            {earningsYield.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">{t("val.vs")}</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-muted-foreground">
            vs
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">10Y Treasury</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-[#ef4444]">
            {treasury10Y.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground">{t("val.erp")}:</span>
        <span className={cn(
          "font-bold tabular-nums",
          spread != null && spread > 0 ? "text-success" : "text-destructive"
        )}>
          {spread != null ? `${spread > 0 ? "+" : ""}${spread.toFixed(2)}%` : "N/A"}
        </span>
      </div>

      {chartData.length > 0 && (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false} axisLine={false} interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false} axisLine={false} width={30}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                }}
                formatter={(v, name) => [
                  `${Number(v).toFixed(2)}%`,
                  name === "treasury" ? "10Y Treasury" : "Earnings Yield",
                ]}
              />
              <ReferenceLine
                y={earningsYield} stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: `EY: ${earningsYield.toFixed(1)}%`, position: "insideTopRight", fontSize: 9, fill: "#8b5cf6" }}
              />
              <Area
                type="monotone" dataKey="treasury" name="treasury"
                stroke="#ef4444" strokeWidth={1.5}
                fill="rgba(239,68,68,0.08)" dot={false} isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
