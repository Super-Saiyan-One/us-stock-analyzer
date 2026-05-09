"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowDownCircle, ArrowUpCircle, Gauge, SlidersHorizontal } from "lucide-react";
import {
  useSaveUsIndexStrategyConfig,
  useUsIndexStrategy,
} from "@/hooks/use-us-index-strategy";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import type {
  UsIndexStrategyConfig,
  UsIndexStrategyResponse,
  UsIndexStrategyZonePoint,
  UsIndexSymbol,
} from "@/types/us-index-strategy";

type RangeKey = "1y" | "2y" | "4y" | "all";
type ConfigFieldKey =
  | "fearWeight"
  | "valuationWeight"
  | "technicalWeight"
  | "repairWeight"
  | "bottomThreshold"
  | "heatThreshold"
  | "conflictGap"
  | "forwardPeLow"
  | "forwardPeHigh"
  | "rsiPeriod"
  | "smaLongDays"
  | "emaFastDays"
  | "emaSlowDays";

const RANGES: { key: RangeKey; days: number | null }[] = [
  { key: "1y", days: 365 },
  { key: "2y", days: 365 * 2 },
  { key: "4y", days: 365 * 4 },
  { key: "all", days: null },
];

const CONFIG_FIELDS: ConfigFieldKey[] = [
  "fearWeight",
  "valuationWeight",
  "technicalWeight",
  "repairWeight",
  "bottomThreshold",
  "heatThreshold",
  "conflictGap",
  "forwardPeLow",
  "forwardPeHigh",
  "rsiPeriod",
  "smaLongDays",
  "emaFastDays",
  "emaSlowDays",
];

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatScore(value: number) {
  return value.toFixed(1);
}

function formatParameterInput(key: ConfigFieldKey, value: number) {
  if (key.includes("Weight")) return Number(value.toFixed(4)).toString();
  return Number(value).toString();
}

function sliceByRange(points: UsIndexStrategyZonePoint[], range: RangeKey) {
  const config = RANGES.find((item) => item.key === range);
  if (!config?.days || points.length === 0) return points;
  const latest = Date.parse(`${points.at(-1)!.date}T00:00:00Z`);
  const cutoff = latest - config.days * 86400000;
  return points.filter((point) => Date.parse(`${point.date}T00:00:00Z`) >= cutoff);
}

function chartTransitions(points: UsIndexStrategyZonePoint[]) {
  return points.filter(
    (point, index) => index > 0 && point.action !== points[index - 1].action && point.action !== "hold"
  );
}

function zoneClass(action: UsIndexStrategyZonePoint["action"]) {
  if (action === "dca_buy") return "bg-success";
  if (action === "dca_sell") return "bg-destructive";
  return "bg-muted";
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail?: string;
  tone?: "buy" | "sell";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "buy" && "text-success",
            tone === "sell" && "text-destructive"
          )}
        />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function ZoneTimeline({ points }: { points: UsIndexStrategyZonePoint[] }) {
  const segments = useMemo(() => {
    if (points.length === 0) return [];
    const result: { action: UsIndexStrategyZonePoint["action"]; count: number }[] = [];
    for (const point of points) {
      const last = result.at(-1);
      if (last?.action === point.action) last.count += 1;
      else result.push({ action: point.action, count: 1 });
    }
    return result;
  }, [points]);
  const total = segments.reduce((acc, segment) => acc + segment.count, 0) || 1;
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
      <div className="flex h-full">
        {segments.map((segment, index) => (
          <div
            key={`${segment.action}-${index}`}
            className={zoneClass(segment.action)}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyChart({ data }: { data: UsIndexStrategyResponse }) {
  const t = useT();
  const tu = (key: string) => t(`usIndexStrategy.${key}`);
  const [range, setRange] = useState<RangeKey>("2y");
  const points = useMemo(() => sliceByRange(data.zonePoints, range), [data.zonePoints, range]);
  const transitions = useMemo(() => chartTransitions(points), [points]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{tu("chartTitle")}</h2>
          <p className="text-xs text-muted-foreground">{tu("chartHint")}</p>
        </div>
        <div className="flex rounded-md border p-1">
          {RANGES.map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                range === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {tu(`range.${item.key}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={36} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => `$${Math.round(Number(value))}`}
              width={58}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {transitions.map((point) => (
              <ReferenceDot
                key={`${point.date}-${point.action}`}
                x={point.date}
                y={point.close}
                r={4}
                fill={point.action === "dca_buy" ? "var(--success)" : "var(--destructive)"}
                stroke="var(--background)"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ZoneTimeline points={points} />
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-success" />
          {tu("zone.dca_buy")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted" />
          {tu("zone.hold")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          {tu("zone.dca_sell")}
        </span>
      </div>
    </div>
  );
}

function ConfigForm({ data }: { data: UsIndexStrategyResponse }) {
  const t = useT();
  const tu = (key: string) => t(`usIndexStrategy.${key}`);
  const save = useSaveUsIndexStrategyConfig();
  const [form, setForm] = useState<UsIndexStrategyConfig>(data.config);

  const updateField = (key: ConfigFieldKey, value: number) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    save.mutate({ ...form, currentForwardPE: undefined });
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">{tu("parameters")}</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{tu("parameterResearchNote")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONFIG_FIELDS.map((key) => (
          <label key={key} className="space-y-1">
            <span className="text-sm font-medium">{tu(key)}</span>
            <input
              type="number"
              step={key.includes("Weight") ? "0.01" : "1"}
              value={formatParameterInput(key, Number(form[key]))}
              onChange={(event) => updateField(key, Number(event.target.value))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
            />
            <span className="block text-xs text-muted-foreground">{tu(`parameterHelp.${key}`)}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={save.isPending}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {save.isPending ? tu("applying") : save.isSuccess ? tu("applied") : tu("applyParameters")}
      </button>
    </div>
  );
}

export default function UsIndexStrategyPage() {
  const t = useT();
  const tu = (key: string) => t(`usIndexStrategy.${key}`);
  const [symbol, setSymbol] = useState<UsIndexSymbol>("SPY");
  const { data, isLoading, error } = useUsIndexStrategy(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-[380px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-6 text-destructive">{tu("loadFailed")}</div>;
  }

  const zone = data.latestZone;
  const forwardGate = data.currentGate.forwardPE;
  const actionTone = zone.action === "dca_buy" ? "buy" : zone.action === "dca_sell" ? "sell" : undefined;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{tu("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {tu("subtitle")} {tu("source")} {data.dataSource.priceAsOf ?? "-"}
          </p>
          {data.dataSource.isFallback ? (
            <p className="mt-2 inline-flex rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              {tu("offlineSnapshot")}
            </p>
          ) : null}
        </div>
        <div className="flex rounded-lg border bg-card p-1">
          {(["SPY", "QQQ"] as UsIndexSymbol[]).map((item) => (
            <button
              key={item}
              onClick={() => setSymbol(item)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                symbol === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard icon={Activity} label={tu("latestPrice")} value={formatCurrency(data.latest.price)} />
        <StatusCard
          icon={Gauge}
          label={tu("currentZone")}
          value={tu(`zone.${zone.action}`)}
          detail={zone.reasonTags.map((tag) => tu(`reasonTag.${tag}`)).join(" / ") || tu("noReason")}
          tone={actionTone}
        />
        <StatusCard
          icon={ArrowUpCircle}
          label={tu("bottomScore")}
          value={formatScore(zone.bottomScore)}
          detail={`${tu("buyDegree")}: ${zone.buyDegreePct}%`}
          tone="buy"
        />
        <StatusCard
          icon={ArrowDownCircle}
          label={tu("heatScore")}
          value={formatScore(zone.heatScore)}
          detail={`${tu("sellDegree")}: ${zone.sellDegreePct}%`}
          tone="sell"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StrategyChart data={data} />
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">{tu("referenceReturn")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{tu("totalReturn")}</span>
                <span className="tabular-nums">{formatPct(data.stats.totalReturnPct)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{tu("buyHoldReturn")}</span>
                <span className="tabular-nums">{formatPct(data.stats.buyHoldReturnPct)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{tu("excessReturn")}</span>
                <span className="tabular-nums">{formatPct(data.stats.excessReturnPct)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{tu("maxDrawdown")}</span>
                <span className="tabular-nums">{formatPct(data.stats.maxDrawdownPct)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{tu("referenceNote")}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 font-semibold">{tu("forwardPeGate")}</h2>
            <div className="text-2xl font-semibold tabular-nums">
              {forwardGate?.value == null ? "-" : forwardGate.value.toFixed(2)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tu(`forwardPeSignal.${forwardGate?.signal ?? "unavailable"}`)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{tu("forwardPeNote")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ConfigForm key={`${data.symbol}-${JSON.stringify(data.config)}`} data={data} />
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">{tu("strategyExplanationTitle")}</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{tu("strategyExplanation.logic")}</p>
            <p>{tu("strategyExplanation.bottom")}</p>
            <p>{tu("strategyExplanation.heat")}</p>
            <p>{tu("strategyExplanation.forwardPE")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
