"use client";

import { useFredMultiple, useFredLatest } from "@/hooks/use-fred";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const MATURITIES = ["DGS2", "DGS5", "DGS10", "DGS30"];
const LABELS = ["2Y", "5Y", "10Y", "30Y"];

export function YieldCurveCard() {
  const results = useFredMultiple(MATURITIES, 5);
  const { latest: spread10y2y } = useFredLatest("T10Y2Y");
  const t = useT();

  const isLoading = results.some((r) => r.isLoading);
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const curveData = LABELS.map((label, i) => {
    const series = results[i].data;
    const latest = series?.[series.length - 1];
    return { maturity: label, yield: latest?.value ?? 0 };
  });

  const inverted = spread10y2y && spread10y2y.value < 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {t("rates.yieldCurve")}
          <InfoTip content={t("chartGuide.yieldCurve")} />
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">10Y-2Y:</span>
          <span className={cn("text-xs font-bold tabular-nums",
            inverted ? "text-destructive" : "text-success"
          )}>
            {spread10y2y ? `${spread10y2y.value > 0 ? "+" : ""}${spread10y2y.value.toFixed(2)}%` : "N/A"}
          </span>
          {inverted && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {t("rates.inverted")}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs">
        {curveData.map((d) => (
          <div key={d.maturity} className="text-center">
            <div className="text-muted-foreground">{d.maturity}</div>
            <div className="font-bold tabular-nums">{d.yield.toFixed(2)}%</div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="maturity" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} width={35}
              tickFormatter={(v: number) => `${v}%`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "0.5rem", fontSize: "11px",
            }} formatter={(v) => [`${Number(v).toFixed(2)}%`]} />
            <Line type="monotone" dataKey="yield" stroke="#3b82f6" strokeWidth={2}
              dot={{ r: 4, fill: "#3b82f6" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
