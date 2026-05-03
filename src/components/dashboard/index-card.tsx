"use client";

import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";

interface Props {
  name: string;
  price: number;
  changePercent: number;
  sparkline: { time: number; value: number }[];
  marketState: string;
}

export function IndexCard({ name, price, changePercent, sparkline, marketState }: Props) {
  const isPositive = changePercent >= 0;
  const sparkData = sparkline.map((p) => ({ v: p.value }));
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{name}</span>
        {marketState === "REGULAR" && (
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        )}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">
        {price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </div>
      <div className={cn("text-xs font-semibold tabular-nums", isPositive ? "text-success" : "text-destructive")}>
        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
      </div>
      {sparkData.length > 5 && (
        <div className="mt-1.5 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`g-${name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
                fill={`url(#g-${name})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
