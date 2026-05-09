"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import {
  useBtcStrategy,
  useSaveBtcStrategyConfig,
} from "@/hooks/use-btc-strategy";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatPercent,
  formatPrice,
  formatRatio,
} from "@/lib/formatters";
import type {
  BtcStrategyResponse,
  BtcStrategyTemplateId,
  BtcStrategyTrade,
  BtcStrategyZonePoint,
  BtcZoneAction,
  BtcZoneDegree,
} from "@/types/btc-strategy";

type ChartRangeKey = "1y" | "2y" | "4y" | "all";
type DraftConfig = {
  templateId: BtcStrategyTemplateId;
  name: string;
  momentumDays: string;
  exitMomentumDays: string;
  cbbiEntryMax: string;
  entryAhrMax: string;
  exitMomentumThreshold: string;
  exitCbbi: string;
  exitAhr: string;
  hardStopEnabled: boolean;
  stoplossPct: string;
  trendFastDays: string;
  trendSlowDays: string;
};
type ConfigFieldKey = Exclude<
  keyof DraftConfig,
  "templateId" | "name" | "hardStopEnabled"
>;
type ZoneSegment = {
  action: BtcZoneAction;
  startDate: string;
  endDate: string;
  days: number;
  degree: BtcZoneDegree;
  widthPct: number;
};

const CHART_RANGES: { key: ChartRangeKey; days: number | null }[] = [
  { key: "1y", days: 365 },
  { key: "2y", days: 730 },
  { key: "4y", days: 1460 },
  { key: "all", days: null },
];

const TEMPLATE_FIELDS: Record<BtcStrategyTemplateId, ConfigFieldKey[]> = {
  cbbi_momentum_opt: [
    "momentumDays",
    "exitMomentumDays",
    "cbbiEntryMax",
    "exitMomentumThreshold",
    "exitCbbi",
    "trendFastDays",
    "trendSlowDays",
  ],
  cbbi_momentum: [
    "momentumDays",
    "exitMomentumDays",
    "cbbiEntryMax",
    "exitMomentumThreshold",
    "exitCbbi",
    "trendFastDays",
    "trendSlowDays",
  ],
  cbbi_ahr999_daily: [
    "momentumDays",
    "cbbiEntryMax",
    "entryAhrMax",
    "exitCbbi",
    "exitAhr",
  ],
  smart_hold: ["trendFastDays", "trendSlowDays"],
  bear01: [],
  buy_and_hold: [],
};

const FIELD_INPUT_PROPS: Record<
  ConfigFieldKey,
  { min: number; max: number; step?: number }
> = {
  momentumDays: { min: 1, max: 30 },
  exitMomentumDays: { min: 1, max: 30 },
  cbbiEntryMax: { min: 0, max: 1, step: 0.01 },
  entryAhrMax: { min: 0.1, max: 20, step: 0.05 },
  exitMomentumThreshold: { min: -1, max: 1, step: 0.01 },
  exitCbbi: { min: 0, max: 1, step: 0.01 },
  exitAhr: { min: 0.1, max: 20, step: 0.05 },
  stoplossPct: { min: -99, max: -1, step: 1 },
  trendFastDays: { min: 1, max: 400 },
  trendSlowDays: { min: 1, max: 500 },
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function formatDegree(value: number): string {
  return `${value}%`;
}

function getZoneClass(zone: BtcStrategyZonePoint) {
  if (zone.action === "dca_buy") return "bg-success/10 text-success";
  if (zone.action === "dca_sell") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function getSegmentDegree(point: BtcStrategyZonePoint): BtcZoneDegree {
  if (point.action === "dca_buy") return point.buyDegreePct;
  if (point.action === "dca_sell") return point.sellDegreePct;
  return 0;
}

function getZoneSegmentClass(segment: ZoneSegment) {
  if (segment.action === "dca_buy") {
    if (segment.degree >= 75) return "bg-success/70";
    if (segment.degree >= 50) return "bg-success/50";
    return "bg-success/30";
  }
  if (segment.action === "dca_sell") {
    if (segment.degree >= 75) return "bg-destructive/70";
    if (segment.degree >= 50) return "bg-destructive/50";
    return "bg-destructive/30";
  }
  return "bg-muted";
}

function BtcStrategyChart({ data }: { data: BtcStrategyResponse }) {
  const t = useT();
  const tb = (key: string) => t(`btcStrategy.${key}`);
  const [range, setRange] = useState<ChartRangeKey>("2y");
  const { chartData, zoneSegments } = useMemo(() => {
    const selected = CHART_RANGES.find((item) => item.key === range);
    const indicators = selected?.days
      ? data.indicators.slice(-selected.days)
      : data.indicators;
    const visibleDates = new Set(indicators.map((point) => point.date));
    const zoneByDate = new Map(data.zonePoints.map((point) => [point.date, point]));
    const zoneMarkers = new Map<string, "dca_buy" | "dca_sell">();
    let previousAction: string | null = null;
    for (const point of data.zonePoints) {
      if (!visibleDates.has(point.date)) {
        previousAction = point.action;
        continue;
      }
      if (
        point.action !== previousAction &&
        (point.action === "dca_buy" || point.action === "dca_sell")
      ) {
        zoneMarkers.set(point.date, point.action);
      }
      previousAction = point.action;
    }
    const visibleZones = indicators
      .map((point) => zoneByDate.get(point.date))
      .filter((point): point is BtcStrategyZonePoint => Boolean(point));
    const segments: Omit<ZoneSegment, "widthPct">[] = [];
    for (const point of visibleZones) {
      const last = segments.at(-1);
      const degree = getSegmentDegree(point);
      if (!last || last.action !== point.action) {
        segments.push({
          action: point.action,
          startDate: point.date,
          endDate: point.date,
          days: 1,
          degree,
        });
        continue;
      }
      last.endDate = point.date;
      last.days += 1;
      last.degree = Math.max(last.degree, degree) as BtcZoneDegree;
    }

    return {
      chartData: indicators.map((point) => ({
        date: point.date,
        close: point.close,
        buy: zoneMarkers.get(point.date) === "dca_buy" ? point.close : null,
        sell: zoneMarkers.get(point.date) === "dca_sell" ? point.close : null,
      })),
      zoneSegments: segments.map((segment) => ({
        ...segment,
        widthPct: visibleZones.length > 0 ? (segment.days / visibleZones.length) * 100 : 0,
      })),
    };
  }, [data, range]);
  const yDomain = useMemo(() => {
    const closes = chartData.map((point) => point.close).filter(Number.isFinite);
    if (closes.length === 0) return [0, 1] as [number, number];
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const padding = Math.max((max - min) * 0.08, 1);
    return [min - padding, max + padding] as [number, number];
  }, [chartData]);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{tb("chartTitle")}</h2>
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          {CHART_RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              className={cn(
                "h-7 min-w-10 rounded-md px-2 text-xs font-medium",
                range === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tb(`range.${item.key}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" minTickGap={32} tick={{ fontSize: 11 }} />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              name={tb("price")}
            />
            <Scatter dataKey="buy" fill="#22c55e" name={tb("buy")} isAnimationActive={false} />
            <Scatter dataKey="sell" fill="#ef4444" name={tb("sell")} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-muted-foreground">{tb("zoneTimeline")}</span>
          <span className="text-muted-foreground">{tb("zoneTimelineHint")}</span>
        </div>
        <div className="flex h-5 overflow-hidden rounded-md border bg-background">
          {zoneSegments.map((segment) => (
            <div
              key={`${segment.startDate}-${segment.endDate}-${segment.action}`}
              className={getZoneSegmentClass(segment)}
              style={{ width: `${segment.widthPct}%` }}
              title={`${tb(`zone.${segment.action}`)} ${segment.degree}% · ${segment.startDate} - ${segment.endDate}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(["dca_buy", "hold", "dca_sell"] as const).map((action) => (
            <span key={action} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-sm",
                  action === "dca_buy"
                    ? "bg-success/70"
                    : action === "dca_sell"
                      ? "bg-destructive/70"
                      : "bg-muted"
                )}
              />
              {tb(`zone.${action}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigForm({ data }: { data: BtcStrategyResponse }) {
  const t = useT();
  const tb = (key: string) => t(`btcStrategy.${key}`);
  const save = useSaveBtcStrategyConfig();
  const { config, templates } = data;
  const [draft, setDraft] = useState<DraftConfig>({
    templateId: config.templateId,
    name: config.name,
    momentumDays: String(config.momentumDays),
    exitMomentumDays: String(config.exitMomentumDays),
    cbbiEntryMax: String(config.cbbiEntryMax),
    entryAhrMax: String(config.entryAhrMax),
    exitMomentumThreshold: String(config.exitMomentumThreshold),
    exitCbbi: String(config.exitCbbi),
    exitAhr: String(config.exitAhr),
    hardStopEnabled: config.hardStopEnabled,
    stoplossPct: String(config.stoplossPct),
    trendFastDays: String(config.trendFastDays),
    trendSlowDays: String(config.trendSlowDays),
  });

  const update = <K extends keyof DraftConfig>(key: K, value: DraftConfig[K]) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyTemplate = (templateId: BtcStrategyTemplateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDraft({
      templateId: template.id,
      name: template.defaultConfig.name,
      momentumDays: String(template.defaultConfig.momentumDays),
      exitMomentumDays: String(template.defaultConfig.exitMomentumDays),
      cbbiEntryMax: String(template.defaultConfig.cbbiEntryMax),
      entryAhrMax: String(template.defaultConfig.entryAhrMax),
      exitMomentumThreshold: String(template.defaultConfig.exitMomentumThreshold),
      exitCbbi: String(template.defaultConfig.exitCbbi),
      exitAhr: String(template.defaultConfig.exitAhr),
      hardStopEnabled: template.defaultConfig.hardStopEnabled,
      stoplossPct: String(template.defaultConfig.stoplossPct),
      trendFastDays: String(template.defaultConfig.trendFastDays),
      trendSlowDays: String(template.defaultConfig.trendSlowDays),
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({
      templateId: draft.templateId,
      name: draft.name,
      momentumDays: Number(draft.momentumDays),
      exitMomentumDays: Number(draft.exitMomentumDays),
      cbbiEntryMax: Number(draft.cbbiEntryMax),
      entryAhrMax: Number(draft.entryAhrMax),
      exitMomentumThreshold: Number(draft.exitMomentumThreshold),
      exitCbbi: Number(draft.exitCbbi),
      exitAhr: Number(draft.exitAhr),
      hardStopEnabled: draft.hardStopEnabled,
      stoplossPct: Number(draft.stoplossPct),
      trendFastDays: Number(draft.trendFastDays),
      trendSlowDays: Number(draft.trendSlowDays),
    });
  };

  const selectedTemplate = templates.find((item) => item.id === draft.templateId);
  const visibleFields = TEMPLATE_FIELDS[draft.templateId];

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{tb("parameters")}</h2>
        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", save.isPending && "animate-spin")} />
          {save.isPending ? tb("applying") : tb("applyParameters")}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{tb("applyHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
          <span>{tb("template")}</span>
          <select
            value={draft.templateId}
            onChange={(e) => applyTemplate(e.target.value as BtcStrategyTemplateId)}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground/80">
              {selectedTemplate.description}
            </p>
          )}
        </label>
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:col-span-2">
          <div className="font-medium text-foreground">
            {tb("strategyExplanationTitle")}
          </div>
          <div className="mt-2 grid gap-2">
            {(["logic", "entry", "exit", "bestFor", "note"] as const).map((key) => (
              <p key={key}>
                <span className="font-medium text-foreground">
                  {tb(`explanationLabel.${key}`)}
                </span>
                {tb(`strategyExplanation.${draft.templateId}.${key}`)}
              </p>
            ))}
          </div>
        </div>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{tb("strategyName")}</span>
          <input
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        {visibleFields.map((field) => {
          const input = FIELD_INPUT_PROPS[field];
          return (
            <label key={field} className="space-y-1 text-xs text-muted-foreground">
              <span>{tb(field)}</span>
              <input
                type="number"
                min={input.min}
                max={input.max}
                step={input.step}
                value={draft[field]}
                onChange={(e) => update(field, e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground/80">
                {tb(`parameterHelp.${field}`)}
              </p>
            </label>
          );
        })}
        {visibleFields.length === 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:col-span-2">
            {tb("noTemplateParameters")}
          </div>
        )}
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:col-span-2">
          <label className="flex items-start gap-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.hardStopEnabled}
              onChange={(e) => update("hardStopEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border"
            />
            <span>
              <span className="block font-medium text-foreground">
                {tb("hardStopEnabled")}
              </span>
              <span>{tb("parameterHelp.hardStopEnabled")}</span>
            </span>
          </label>
          {draft.hardStopEnabled && (
            <label className="block space-y-1 text-xs text-muted-foreground">
              <span>{tb("stoplossPct")}</span>
              <input
                type="number"
                min={FIELD_INPUT_PROPS.stoplossPct.min}
                max={FIELD_INPUT_PROPS.stoplossPct.max}
                step={FIELD_INPUT_PROPS.stoplossPct.step}
                value={draft.stoplossPct}
                onChange={(e) => update("stoplossPct", e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground/80">
                {tb("parameterHelp.stoplossPct")}
              </p>
            </label>
          )}
        </div>
      </div>
      {save.isSuccess && (
        <div className="mt-3 text-xs text-success">{tb("applied")}</div>
      )}
    </form>
  );
}

function TradesTable({ trades }: { trades: BtcStrategyTrade[] }) {
  const t = useT();
  const tb = (key: string) => t(`btcStrategy.${key}`);
  const recent = trades.slice(-12).reverse();

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">{tb("trades")}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">{tb("entryDate")}</th>
            <th className="px-3 py-2">{tb("exitDate")}</th>
            <th className="px-3 py-2">{tb("entryPrice")}</th>
            <th className="px-3 py-2">{tb("exitPrice")}</th>
            <th className="px-3 py-2">{tb("return")}</th>
            <th className="px-3 py-2">{tb("reason")}</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((trade) => (
            <tr key={`${trade.entryDate}-${trade.exitDate}`} className="border-b last:border-b-0">
              <td className="px-3 py-2 tabular-nums">{trade.entryDate}</td>
              <td className="px-3 py-2 tabular-nums">{trade.exitDate}</td>
              <td className="px-3 py-2 tabular-nums">{formatPrice(trade.entryPrice)}</td>
              <td className="px-3 py-2 tabular-nums">{formatPrice(trade.exitPrice)}</td>
              <td
                className={cn(
                  "px-3 py-2 tabular-nums",
                  trade.returnPct >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {formatPercent(trade.returnPct)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {tb(`exitReason.${trade.exitReason}`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {recent.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {tb("noTrades")}
        </div>
      )}
    </div>
  );
}

function HistoricalReference({ data }: { data: BtcStrategyResponse }) {
  const t = useT();
  const tb = (key: string) => t(`btcStrategy.${key}`);

  return (
    <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        {tb("historicalReference")}
      </summary>
      <div className="space-y-4 border-t p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={tb("totalReturn")}
            value={formatPercent(data.stats.totalReturnPct)}
          />
          <StatCard
            label={tb("buyHoldReturn")}
            value={formatPercent(data.stats.buyHoldReturnPct)}
          />
          <StatCard
            label={tb("excessReturn")}
            value={formatPercent(data.stats.excessReturnPct)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{tb("referenceReturnNote")}</p>
        <TradesTable trades={data.trades} />
      </div>
    </details>
  );
}

export default function BtcStrategyPage() {
  const { data, isLoading, error } = useBtcStrategy();
  const t = useT();
  const tb = (key: string) => t(`btcStrategy.${key}`);

  const latestClass = useMemo(() => {
    if (!data) return "bg-muted text-muted-foreground";
    return getZoneClass(data.latestZone);
  }, [data]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-[360px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-xl border bg-card p-6 text-sm text-destructive">
          {tb("loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{tb("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tb("source")} {data.dataSource.priceSource.toUpperCase()} · CBBI{" "}
            {data.dataSource.cbbiAsOf ?? t("common.na")}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", latestClass)}>
          {tb(`zone.${data.latestZone.action}`)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={tb("latestPrice")}
          value={data.latest.price != null ? formatPrice(data.latest.price) : t("common.na")}
        />
        <StatCard
          label={tb("currentZone")}
          value={tb(`zone.${data.latestZone.action}`)}
        />
        <StatCard
          label={tb("buyDegree")}
          value={formatDegree(data.latestZone.buyDegreePct)}
        />
        <StatCard
          label={tb("sellDegree")}
          value={formatDegree(data.latestZone.sellDegreePct)}
        />
        <StatCard
          label={tb("cbbi")}
          value={formatRatio(data.latest.cbbi)}
        />
        <StatCard
          label={tb("ahr999")}
          value={formatRatio(data.latest.ahr999)}
        />
        <StatCard
          label={tb("totalReturn")}
          value={formatPercent(data.stats.totalReturnPct)}
        />
        <StatCard
          label={tb("buyHoldReturn")}
          value={formatPercent(data.stats.buyHoldReturnPct)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <BtcStrategyChart data={data} />
          <HistoricalReference data={data} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">{tb("status")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{tb("currentZone")}</div>
                <div className="font-semibold">{tb(`zone.${data.latestZone.action}`)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tb("positionLabel")}</div>
                <div className="font-semibold">{tb(`position.${data.latest.position}`)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tb("buyDegree")}</div>
                <div className="font-semibold tabular-nums">
                  {formatDegree(data.latestZone.buyDegreePct)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tb("sellDegree")}</div>
                <div className="font-semibold tabular-nums">
                  {formatDegree(data.latestZone.sellDegreePct)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.latestZone.reasonTags.length > 0 ? (
                data.latestZone.reasonTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {tb(`reasonTag.${tag}`)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {tb("noZoneReason")}
                </span>
              )}
            </div>
          </div>
          <ConfigForm key={JSON.stringify(data.config)} data={data} />
        </div>
      </div>
    </div>
  );
}
