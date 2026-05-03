"use client";

import { DataSourceTag } from "@/components/data-source-tag";
import { useOptionsSummary } from "@/hooks/use-options-summary";
import { useShortInterest } from "@/hooks/use-short-interest";
import { useStockEvents } from "@/hooks/use-stock-events";
import { useStockFinancials } from "@/hooks/use-stock-financials";
import { useStockQuote } from "@/hooks/use-stock-quote";
import type { DataMeta } from "@/types/data-meta";

interface SourceTagInput {
  key: string;
  meta?: DataMeta;
}

function SourceTag({ meta }: { meta: DataMeta }) {
  return (
    <DataSourceTag
      source={meta.provider ? `${meta.provider}` : meta.source}
      asOf={meta.asOf}
      frequency={meta.frequency}
      lag={meta.releaseLag}
      confidence={meta.confidence}
    />
  );
}

export function DataSourceRow({ symbol }: { symbol: string }) {
  const { data: quote } = useStockQuote(symbol);
  const { data: financials } = useStockFinancials(symbol);
  const { data: options } = useOptionsSummary(symbol);
  const { data: events } = useStockEvents(symbol);
  const { data: shortInterest } = useShortInterest(symbol);

  const sources: SourceTagInput[] = [
    { key: "quote", meta: quote?.meta },
    { key: "financials", meta: financials?.meta },
    { key: "options", meta: options?.meta },
    { key: "events", meta: events?.meta },
    { key: "short-interest", meta: shortInterest?.meta },
  ];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2">
      {sources
        .filter((item): item is { key: string; meta: DataMeta } => !!item.meta)
        .map((item) => (
          <SourceTag key={item.key} meta={item.meta} />
        ))}
    </div>
  );
}
