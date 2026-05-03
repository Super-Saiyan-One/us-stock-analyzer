"use client";

import { useFearGreed } from "@/hooks/use-indices";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/info-tip";
import type { TranslationKey } from "@/i18n/locales";

function getLabelKey(rating: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    "Extreme Fear": "fg.extremeFear",
    "Fear": "fg.fear",
    "Neutral": "fg.neutral",
    "Greed": "fg.greed",
    "Extreme Greed": "fg.extremeGreed",
  };
  return map[rating] ?? "fg.neutral";
}

function getColor(score: number) {
  if (score <= 25) return "text-destructive";
  if (score <= 45) return "text-orange-500";
  if (score <= 55) return "text-warning";
  if (score <= 75) return "text-lime-500";
  return "text-success";
}

function getBg(score: number) {
  if (score <= 25) return "bg-destructive";
  if (score <= 45) return "bg-orange-500";
  if (score <= 55) return "bg-warning";
  if (score <= 75) return "bg-lime-500";
  return "bg-success";
}

export function FearGreedGauge() {
  const { data, isLoading, isError } = useFearGreed();
  const t = useT();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isError || !data || data.score == null) {
    return (
      <div className="rounded-xl border bg-card p-3">
        <div className="text-xs font-medium text-muted-foreground">{t("fg.title")}</div>
        <div className="mt-0.5 text-base font-semibold text-muted-foreground">N/A</div>
      </div>
    );
  }

  const score = data.score;
  const labelKey = getLabelKey(data.rating);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {t("fg.title")}
        <InfoTip content={t("tip.fearGreed")} />
      </div>
      <div className={cn("mt-0.5 text-lg font-bold", getColor(score))}>
        {score}
      </div>
      <div className="text-xs text-muted-foreground">{t(labelKey)}</div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", getBg(score))}
          style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{t("fg.title")}: {score}</span>
        {data.previousClose > 0 && (
          <span className={cn("font-medium tabular-nums",
            score > data.previousClose ? "text-success" : score < data.previousClose ? "text-destructive" : "text-muted-foreground"
          )}>
            {score > data.previousClose ? "+" : ""}{score - data.previousClose}
          </span>
        )}
      </div>
    </div>
  );
}
