"use client";

import { useFredSeries } from "@/hooks/use-fred";
import { useT } from "@/i18n/context";
import { InfoTip } from "@/components/ui/info-tip";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

interface Props {
  series: string;
  label: string;
  color?: string;
  limit?: number;
  start?: string;
  suffix?: string;
  referenceLine?: number;
  referenceLabel?: string;
}

export function FredChartCard({
  series, label, color = "#3b82f6", limit = 120, start = "",
  suffix = "", referenceLine, referenceLabel,
}: Props) {
  const { data, isLoading } = useFredSeries(series, limit, start);
  const t = useT();
  const guideKey = `chartGuide.${series}`;
  const guide = t(guideKey);
  const hasGuide = guide !== guideKey;

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const latest = data[data.length - 1];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {label}
          {hasGuide && <InfoTip content={guide} />}
        </h3>
        {latest && (
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {latest.value.toFixed(2)}{suffix}
          </span>
        )}
      </div>
      {hasGuide && (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{guide}</p>
      )}
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`fg-${series}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} interval="preserveStartEnd"
              tickFormatter={(v: string) => v.substring(5)} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false} axisLine={false} width={40}
              tickFormatter={(v: number) => `${v}${suffix}`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "0.5rem", fontSize: "11px",
            }} formatter={(v) => [`${Number(v).toFixed(2)}${suffix}`]} />
            {referenceLine != null && (
              <ReferenceLine y={referenceLine} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: referenceLabel || String(referenceLine),
                  fontSize: 9, fill: "#f59e0b", position: "insideTopRight" }} />
            )}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5}
              fill={`url(#fg-${series})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
