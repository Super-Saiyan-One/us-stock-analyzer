"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { useT } from "@/i18n/context";
import type { OptionContract } from "@/types/options";

interface Props {
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
}

export function OptionsOIChart({ calls, puts, underlyingPrice }: Props) {
  const t = useT();

  const strikes = new Set([
    ...calls.map((c) => c.strike),
    ...puts.map((p) => p.strike),
  ]);

  const nearMoney = [...strikes]
    .filter(
      (s) =>
        s >= underlyingPrice * 0.9 && s <= underlyingPrice * 1.1
    )
    .sort((a, b) => a - b);

  const data = nearMoney.map((strike) => {
    const call = calls.find((c) => c.strike === strike);
    const put = puts.find((p) => p.strike === strike);
    return {
      strike,
      callOI: call?.openInterest ?? 0,
      putOI: put?.openInterest ?? 0,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{t("options.oiByStrike")}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={0}>
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
              width={45}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "12px",
              }}
            />
            <Legend
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px" }}
            />
            <ReferenceLine
              x={nearMoney.reduce((c, s) =>
                Math.abs(s - underlyingPrice) < Math.abs(c - underlyingPrice)
                  ? s
                  : c
              )}
              stroke="var(--primary)"
              strokeDasharray="3 3"
              label={{
                value: "ATM",
                fontSize: 10,
                fill: "var(--primary)",
                position: "top",
              }}
            />
            <Bar dataKey="callOI" name="Call OI" fill="#22c55e" opacity={0.8} />
            <Bar dataKey="putOI" name="Put OI" fill="#ef4444" opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
