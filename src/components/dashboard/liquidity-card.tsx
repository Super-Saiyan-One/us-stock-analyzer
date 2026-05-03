"use client";

import { useFredSeries } from "@/hooks/use-fred";
import { useT } from "@/i18n/context";
import { formatCompact } from "@/lib/formatters";
import { InfoTip } from "@/components/ui/info-tip";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useMemo } from "react";

export function NetLiquidityCard() {
  const { data: walcl } = useFredSeries("WALCL", 120);
  const { data: tga } = useFredSeries("WTREGEN", 120);
  const { data: rrp } = useFredSeries("RRPONTSYD", 120);
  const t = useT();

  const chartData = useMemo(() => {
    if (!walcl || !tga || !rrp) return [];

    const tgaMap = new Map(tga.map((d) => [d.date, d.value]));
    const rrpMap = new Map(rrp.map((d) => [d.date, d.value]));

    return walcl
      .map((w) => {
        const tgaVal = tgaMap.get(w.date) ?? 0;
        const rrpVal = rrpMap.get(w.date) ?? 0;
        return {
          date: w.date,
          fed: w.value / 1e6,
          tga: tgaVal / 1e6,
          rrp: rrpVal / 1e6,
          netLiq: (w.value - tgaVal - rrpVal) / 1e6,
        };
      })
      .filter((d) => d.netLiq > 0);
  }, [walcl, tga, rrp]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const latest = chartData[chartData.length - 1];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {t("fed.netLiquidity")}
          <InfoTip content={t("chartGuide.netLiquidity")} />
        </h3>
        <span className="text-sm font-bold tabular-nums text-primary">
          ${latest.netLiq.toFixed(2)}T
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{t("chartGuide.netLiquidity")}</p>
      <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
        <span>Fed: ${latest.fed.toFixed(2)}T</span>
        <span>TGA: ${formatCompact(latest.tga * 1e9)}</span>
        <span>RRP: ${formatCompact(latest.rrp * 1e9)}</span>
      </div>
      <div className="mt-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="liqG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} interval="preserveStartEnd"
              tickFormatter={(v: string) => v.substring(0, 7)} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} width={40}
              tickFormatter={(v: number) => `$${v.toFixed(1)}T`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "0.5rem", fontSize: "11px",
            }} formatter={(v) => [`$${Number(v).toFixed(2)}T`]} />
            <Area type="monotone" dataKey="netLiq" name="Net Liquidity"
              stroke="#8b5cf6" strokeWidth={1.5} fill="url(#liqG)"
              dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
