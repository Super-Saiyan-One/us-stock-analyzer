"use client";

import { use } from "react";
import { StockQuoteHeader } from "@/components/stock/stock-quote-header";
import { PriceChart } from "@/components/charts/price-chart";
import { KeyMetricsGrid } from "@/components/stock/key-metrics-grid";
import { OptionsSummaryCard } from "@/components/stock/options-summary-card";
import { StockSignalsCard } from "@/components/stock/stock-signals-card";
import { DataSourceRow } from "@/components/stock/data-source-row";
import { EventRadarCard } from "@/components/stock/event-radar-card";
import { SqueezeRiskCard } from "@/components/stock/squeeze-risk-card";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const sym = symbol.toUpperCase();

  return (
    <div className="mx-auto max-w-6xl">
      <StockQuoteHeader symbol={sym} />
      <PriceChart symbol={sym} />

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <KeyMetricsGrid symbol={sym} />
          <EventRadarCard symbol={sym} />
          <OptionsSummaryCard symbol={sym} />
        </div>
        <div className="space-y-4">
          <StockSignalsCard symbol={sym} />
          <SqueezeRiskCard symbol={sym} />
          <DataSourceRow symbol={sym} />
        </div>
      </div>
    </div>
  );
}
