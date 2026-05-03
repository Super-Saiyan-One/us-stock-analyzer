"use client";

import { useMarketIndices } from "@/hooks/use-indices";
import { IndexCard } from "@/components/dashboard/index-card";
import { FearGreedGauge } from "@/components/dashboard/fear-greed-gauge";
import { RegimeRadar } from "@/components/dashboard/regime-radar";
import { MarketValuationCard } from "@/components/dashboard/market-valuation-card";
import { CapeHistoryChart } from "@/components/charts/cape-history-chart";
import { YieldCurveCard } from "@/components/dashboard/yield-curve-card";
import { NetLiquidityCard } from "@/components/dashboard/liquidity-card";
import { FredMetricCard } from "@/components/dashboard/fred-metric-card";
import { FredChartCard } from "@/components/dashboard/fred-chart-card";
import { FedModelCard } from "@/components/dashboard/fed-model-card";
import { useT } from "@/i18n/context";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function IndicesRow() {
  const { data, isLoading } = useMarketIndices();
  const tt = useT();
  const t = (key: string) => tt(`index.${key}`);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
    );
  }

  const items = [
    { key: "sp500", nameKey: "sp500" as const },
    { key: "nasdaq", nameKey: "nasdaq" as const },
    { key: "dji", nameKey: "dji" as const },
    { key: "vix", nameKey: "vix" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ key, nameKey }) => {
        const d = data[key as keyof typeof data];
        if (!d) return <div key={key} className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">{t(nameKey)}: N/A</div>;
        return (
          <IndexCard key={key} name={t(nameKey)} price={d.price}
            changePercent={d.changePercent} sparkline={d.sparkline}
            marketState={d.marketState} />
        );
      })}
      <FearGreedGauge />
    </div>
  );
}

export default function DashboardPage() {
  const t = useT();
  const td = (key: string) => t(`dashboard.${key}`);
  const tf = (key: string) => t(`fed.${key}`);
  const tr = (key: string) => t(`rates.${key}`);
  const tv = (key: string) => t(`vol.${key}`);
  const tm = (key: string) => t(`macro.${key}`);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      <h1 className="text-xl font-bold">{td("title")}</h1>

      {/* Market Pulse */}
      <IndicesRow />

      {/* Regime Radar */}
      <RegimeRadar />

      <Section title={td("valuation")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CapeHistoryChart />
          </div>
          <div className="space-y-3">
            <MarketValuationCard />
            <FedModelCard />
            <FredMetricCard series="DGS10" label={tr("10y")} suffix="%"
              thresholds={{ warn: 4.5, danger: 5.0 }} />
            <FredMetricCard series="DGS2" label={tr("2y")} suffix="%" />
          </div>
        </div>
      </Section>

      <Section title={td("fedLiquidity")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <NetLiquidityCard />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FredMetricCard series="WALCL" label={tf("balanceSheet")}
                format={(v) => `$${(v / 1e6).toFixed(2)}T`} />
              <FredMetricCard series="DFF" label={tf("fundsRate")} suffix="%" />
              <FredMetricCard series="WTREGEN" label={tf("tga")}
                format={(v) => `$${(v / 1e3).toFixed(0)}B`} />
              <FredMetricCard series="RRPONTSYD" label={tf("reverseRepo")}
                format={(v) => `$${(v / 1e3).toFixed(0)}B`} />
            </div>
            <FredChartCard series="M2SL" label={tf("m2")} color="#8b5cf6" limit={120} />
          </div>
        </div>
      </Section>

      <Section title={td("ratesCredit")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <YieldCurveCard />
          <div className="space-y-3">
            <FredChartCard series="T10Y2Y" label={tr("spread10y2y")} color="#ef4444"
              limit={250} suffix="%" referenceLine={0} referenceLabel="Inversion" />
            <div className="grid grid-cols-2 gap-3">
              <FredMetricCard series="BAMLH0A0HYM2" label={tr("hySpread")} suffix=" bps"
                format={(v) => v.toFixed(0)} thresholds={{ warn: 400, danger: 600 }} />
              <FredMetricCard series="BAMLC0A0CM" label={tr("igSpread")} suffix=" bps"
                format={(v) => v.toFixed(0)} thresholds={{ warn: 150, danger: 200 }} />
            </div>
          </div>
        </div>
      </Section>

      <Section title={td("volatility")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FredMetricCard series="VIXCLS" label={tv("vixClose")}
            format={(v) => v.toFixed(2)} thresholds={{ warn: 20, danger: 30 }} />
          <FredChartCard series="VIXCLS" label={tv("vixHistory")} color="#ef4444"
            limit={250} referenceLine={20} referenceLabel="20" />
          <FredChartCard series="T10Y2Y" label={tv("yieldCurve10y2y")} color="#f59e0b"
            limit={250} suffix="%" referenceLine={0} />
          <FredChartCard series="BAMLH0A0HYM2" label={tv("hySpread")} color="#ef4444"
            limit={120} />
        </div>
      </Section>

      <Section title={td("macro")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FredMetricCard series="ICSA" label={tm("claims")}
            format={(v) => `${(v / 1000).toFixed(0)}K`}
            thresholds={{ warn: 250000, danger: 300000 }} />
          <FredMetricCard series="CPIAUCSL" label={tm("cpi")}
            format={(v) => v.toFixed(1)} />
          <FredMetricCard series="PCEPILFE" label={tm("corePCE")}
            format={(v) => v.toFixed(1)} />
          <FredMetricCard series="FEDFUNDS" label={tm("fedFundsMonthly")} suffix="%" />
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <FredChartCard series="ICSA" label={tm("claimsWeekly")}
            color="#f59e0b" limit={104} />
          <FredChartCard series="CPIAUCSL" label={tm("cpiAll")}
            color="#ef4444" limit={60} />
        </div>
      </Section>
    </div>
  );
}
