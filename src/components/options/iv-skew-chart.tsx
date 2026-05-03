"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useT } from "@/i18n/context";
import { InfoTip } from "@/components/ui/info-tip";
import type { OptionContract } from "@/types/options";

interface Props {
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
}

export function IVSkewChart({ calls, puts, underlyingPrice }: Props) {
  const t = useT();
  const strikes = new Set([
    ...calls.map((c) => c.strike),
    ...puts.map((p) => p.strike),
  ]);

  const nearMoney = [...strikes]
    .filter(
      (s) =>
        s >= underlyingPrice * 0.85 && s <= underlyingPrice * 1.15
    )
    .sort((a, b) => a - b);

  const data = nearMoney.map((strike) => {
    const call = calls.find((c) => c.strike === strike);
    const put = puts.find((p) => p.strike === strike);
    return {
      strike,
      callIV: call?.impliedVolatility
        ? +(call.impliedVolatility * 100).toFixed(1)
        : null,
      putIV: put?.impliedVolatility
        ? +(put.impliedVolatility * 100).toFixed(1)
        : null,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        {t("options.ivSkew")}
        <InfoTip content={t("tip.ivSkew")} />
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="strike"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
              formatter={(value) => [`${value}%`]}
            />
            <Legend
              iconType="line"
              iconSize={12}
              wrapperStyle={{ fontSize: "11px" }}
            />
            <ReferenceLine
              x={nearMoney.reduce((c, s) =>
                Math.abs(s - underlyingPrice) < Math.abs(c - underlyingPrice)
                  ? s
                  : c
              )}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="callIV"
              name="Call IV"
              stroke="#22c55e"
              strokeWidth={1.5}
              dot={{ r: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="putIV"
              name="Put IV"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={{ r: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
