"use client";

import { useOptionsSummary } from "@/hooks/use-options-summary";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/formatters";
import { InfoTip } from "@/components/ui/info-tip";
import Link from "next/link";

function Metric({ label, value, sub, highlight, tip }: {
  label: string; value: string; sub?: string; highlight?: "warn" | "info"; tip?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {label}
        {tip && <InfoTip content={tip} />}
      </span>
      <span className={cn("text-sm font-bold tabular-nums",
        highlight === "warn" && "text-warning",
        highlight === "info" && "text-primary",
      )}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function OptionsSummaryCard({ symbol }: { symbol: string }) {
  const { data, isLoading } = useOptionsSummary(symbol);
  const t = useT();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.hasOptions) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("optionsSummary.title")}</h3>
        <p className="mt-2 text-xs text-muted-foreground">{t("optionsSummary.noOptions")}</p>
      </div>
    );
  }

  const ivRvLabel = data.ivRvPremium != null
    ? data.ivRvPremium > 1.3 ? t("optionsSummary.ivRich") : data.ivRvPremium < 0.8 ? t("optionsSummary.ivCheap") : ""
    : "";

  const termBackwardation = data.ivTermStructure.length >= 2
    && data.ivTermStructure[0]?.atmIV != null
    && data.ivTermStructure[1]?.atmIV != null
    && data.ivTermStructure[0].atmIV > data.ivTermStructure[1].atmIV;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("optionsSummary.title")}</h3>
        <Link href={`/stock/${symbol}/options`} className="text-xs text-primary hover:underline">
          {t("optionsSummary.viewChain")}
        </Link>
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {t("optionsSummary.nearExp")}: {data.nearExpiration} ({data.nearDTE}d)
      </div>

      {/* Volatility Structure */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Metric
          label={t("optionsSummary.atmIV")}
          value={data.atmIV != null ? `${(data.atmIV * 100).toFixed(1)}%` : "N/A"}
          tip={t("tip.atmIV")}
        />
        <Metric
          label={t("optionsSummary.rv20d")}
          value={data.realizedVol20D != null ? `${(data.realizedVol20D * 100).toFixed(1)}%` : "N/A"}
          tip={t("tip.rv20d")}
        />
        <Metric
          label={t("optionsSummary.ivRv")}
          value={data.ivRvPremium != null ? `${data.ivRvPremium.toFixed(2)}x` : "N/A"}
          sub={ivRvLabel}
          highlight={data.ivRvPremium != null && data.ivRvPremium > 1.3 ? "warn" : undefined}
          tip={t("tip.ivRv")}
        />
        <Metric
          label={t("optionsSummary.rv60d")}
          value={data.realizedVol60D != null ? `${(data.realizedVol60D * 100).toFixed(1)}%` : "N/A"}
          tip={t("tip.rv60d")}
        />
      </div>

      {/* IV Term Structure */}
      {data.ivTermStructure.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              {t("optionsSummary.ivTermLabel")}
              <InfoTip content={t("tip.ivTerm")} />
            </span>
            {termBackwardation && (
              <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning font-medium">
                {t("optionsSummary.backwardation")}
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-3">
            {data.ivTermStructure.map((pt) => (
              <div key={pt.targetDTE} className="text-center">
                <div className="text-[10px] text-muted-foreground">{pt.actualDTE}d</div>
                <div className={cn("text-xs font-bold tabular-nums",
                  pt.atmIV != null && data.realizedVol20D != null && pt.atmIV > data.realizedVol20D * 1.3
                    ? "text-warning" : "text-foreground"
                )}>
                  {pt.atmIV != null ? `${(pt.atmIV * 100).toFixed(1)}%` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positioning (neutral framing) */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Metric
          label={t("optionsSummary.pcOI")}
          value={data.putCallOIRatio != null ? data.putCallOIRatio.toFixed(2) : "N/A"}
          sub={data.putCallOIRatio != null
            ? data.putCallOIRatio > 1.0 ? t("optionsSummary.putSkew") : t("optionsSummary.callSkew")
            : undefined}
          tip={t("tip.pcOI")}
        />
        <Metric
          label={t("optionsSummary.pcVol")}
          value={data.putCallVolumeRatio != null ? data.putCallVolumeRatio.toFixed(2) : "N/A"}
          tip={t("tip.pcVol")}
        />
      </div>

      {/* OI Walls */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {t("optionsSummary.callWall")}
            <InfoTip content={t("tip.callWall")} />
          </div>
          {data.maxCallOIStrike ? (
            <div className="mt-0.5">
              <span className="text-sm font-bold text-success tabular-nums">${data.maxCallOIStrike.strike}</span>
              <span className="ml-1.5 text-[10px] text-muted-foreground">OI: {formatCompact(data.maxCallOIStrike.oi)}</span>
            </div>
          ) : <span className="text-xs text-muted-foreground">N/A</span>}
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {t("optionsSummary.putWall")}
            <InfoTip content={t("tip.putWall")} />
          </div>
          {data.maxPutOIStrike ? (
            <div className="mt-0.5">
              <span className="text-sm font-bold text-destructive tabular-nums">${data.maxPutOIStrike.strike}</span>
              <span className="ml-1.5 text-[10px] text-muted-foreground">OI: {formatCompact(data.maxPutOIStrike.oi)}</span>
            </div>
          ) : <span className="text-xs text-muted-foreground">N/A</span>}
        </div>
      </div>

      <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
        <span>Call OI: {formatCompact(data.totalCallOI)}</span>
        <span>Put OI: {formatCompact(data.totalPutOI)}</span>
        <span>Call Vol: {formatCompact(data.totalCallVolume)}</span>
        <span>Put Vol: {formatCompact(data.totalPutVolume)}</span>
      </div>
    </div>
  );
}
