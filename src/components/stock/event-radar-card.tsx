"use client";

import Link from "next/link";
import { ExternalLink, FileSearch, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useStockEvents } from "@/hooks/use-stock-events";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import type { StockEvent } from "@/types/events";

const EVENT_LIMIT = 8;

const SEVERITY_STYLE: Record<StockEvent["severity"], string> = {
  low: "border-muted bg-muted/40 text-muted-foreground",
  medium: "border-warning/30 bg-warning/10 text-warning",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function EventRow({ event }: { event: StockEvent }) {
  const t = useT();

  return (
    <Link
      href={event.url}
      target="_blank"
      rel="noreferrer"
      className="group flex gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold">{event.form}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-medium",
              SEVERITY_STYLE[event.severity]
            )}
          >
            {t(`events.severity.${event.severity}`)}
          </span>
          <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-1 truncate text-xs text-foreground">
          {event.description || t("common.na")}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span>
            {t("events.filed")}: {formatDate(event.filingDate)}
          </span>
          {event.reportDate && (
            <span>
              {t("events.report")}: {formatDate(event.reportDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function EventRadarCard({ symbol }: { symbol: string }) {
  const { data, isLoading } = useStockEvents(symbol);
  const t = useT();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const events = data?.events.slice(0, EVENT_LIMIT) ?? [];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("events.title")}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {data?.companyName ?? symbol}
          </p>
        </div>
        {data?.cik && (
          <span className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            CIK {data.cik}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={t("events.empty")}
          description={t("events.emptyDesc")}
        />
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
