"use client";

import { Gauge, ShieldAlert } from "lucide-react";
import { useOptionsSummary } from "@/hooks/use-options-summary";
import { useShortInterest } from "@/hooks/use-short-interest";
import { useStockFinancials } from "@/hooks/use-stock-financials";
import { useStockQuote } from "@/hooks/use-stock-quote";
import { useT } from "@/i18n/context";
import { formatCompact, formatRatio } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const SHORT_FLOAT_ELEVATED = 0.1;
const SHORT_FLOAT_HIGH = 0.2;
const DAYS_TO_COVER_ELEVATED = 5;
const SHORT_POSITION_CHANGE_ELEVATED = 10;
const CALL_SKEW_PUT_CALL_OI = 0.65;
const CALL_WALL_NEAR_PRICE = 0.05;
const HIGH_RISK_SCORE = 60;
const MEDIUM_RISK_SCORE = 35;

type RiskLevel = "low" | "medium" | "high";

const RISK_STYLE: Record<RiskLevel, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-destructive",
};

function normalizePercentRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return value > 1 ? value / 100 : value;
}

function formatPlainPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function metricValue(value: number | null | undefined, suffix = "") {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}${suffix}`;
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= HIGH_RISK_SCORE) return "high";
  if (score >= MEDIUM_RISK_SCORE) return "medium";
  return "low";
}

export function SqueezeRiskCard({ symbol }: { symbol: string }) {
  const { data: shortData, isLoading } = useShortInterest(symbol);
  const { data: financials } = useStockFinancials(symbol);
  const { data: options } = useOptionsSummary(symbol);
  const { data: quote } = useStockQuote(symbol);
  const t = useT();

  const latest = shortData?.latest ?? null;
  const shortFloatFromShares =
    latest?.currentShortPosition != null &&
    financials?.floatShares != null &&
    financials.floatShares > 0
      ? latest.currentShortPosition / financials.floatShares
      : null;
  const shortFloat =
    shortFloatFromShares ?? normalizePercentRatio(financials?.shortPercentOfFloat);
  const daysToCover = latest?.daysToCover ?? financials?.shortRatio ?? null;
  const changePercent = latest?.changePercent ?? null;
  const putCallOi = options?.putCallOIRatio ?? null;
  const callWallDistance =
    quote?.price && options?.maxCallOIStrike
      ? Math.abs(options.maxCallOIStrike.strike - quote.price) / quote.price
      : null;

  let score = 0;
  if (shortFloat != null && shortFloat >= SHORT_FLOAT_HIGH) score += 35;
  else if (shortFloat != null && shortFloat >= SHORT_FLOAT_ELEVATED) score += 20;
  if (daysToCover != null && daysToCover >= DAYS_TO_COVER_ELEVATED) score += 20;
  if (changePercent != null && changePercent >= SHORT_POSITION_CHANGE_ELEVATED) {
    score += 15;
  }
  if (putCallOi != null && putCallOi <= CALL_SKEW_PUT_CALL_OI) score += 10;
  if (callWallDistance != null && callWallDistance <= CALL_WALL_NEAR_PRICE) {
    score += 10;
  }

  const riskLevel = getRiskLevel(score);
  const checks = [
    {
      label: t("shortInterest.shortFloat"),
      value: formatPlainPercent(shortFloat),
      active: shortFloat != null && shortFloat >= SHORT_FLOAT_ELEVATED,
    },
    {
      label: t("shortInterest.daysToCover"),
      value: metricValue(daysToCover, "d"),
      active: daysToCover != null && daysToCover >= DAYS_TO_COVER_ELEVATED,
    },
    {
      label: t("shortInterest.shortChange"),
      value:
        changePercent != null && Number.isFinite(changePercent)
          ? `${changePercent.toFixed(1)}%`
          : "N/A",
      active: changePercent != null && changePercent >= SHORT_POSITION_CHANGE_ELEVATED,
    },
    {
      label: t("shortInterest.pcOi"),
      value: formatRatio(putCallOi),
      active: putCallOi != null && putCallOi <= CALL_SKEW_PUT_CALL_OI,
    },
    {
      label: t("shortInterest.callWallDistance"),
      value: formatPlainPercent(callWallDistance),
      active: callWallDistance != null && callWallDistance <= CALL_WALL_NEAR_PRICE,
    },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            {t("shortInterest.title")}
          </h3>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {shortData?.sourceStatus === "official"
              ? t("shortInterest.official")
              : shortData?.sourceStatus === "fallback"
                ? t("shortInterest.fallback")
                : t("shortInterest.unavailable")}
          </p>
        </div>
        <div className={cn("text-right", RISK_STYLE[riskLevel])}>
          <div className="text-lg font-bold tabular-nums">{score}</div>
          <div className="text-[10px] font-medium">
            {t(`shortInterest.risk.${riskLevel}`)}
          </div>
        </div>
      </div>

      {latest ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">
                {t("shortInterest.sharesShort")}
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {formatCompact(latest.currentShortPosition)}
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">
                {t("shortInterest.settlement")}
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {latest.settlementDate}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  check.active
                    ? "border-warning/30 bg-warning/10"
                    : "border-border bg-muted/20"
                )}
              >
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  {check.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums">
                  {check.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-[10px] text-muted-foreground">
            {t("shortInterest.missingBorrow")}
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t("shortInterest.noData")}
        </div>
      )}
    </div>
  );
}
