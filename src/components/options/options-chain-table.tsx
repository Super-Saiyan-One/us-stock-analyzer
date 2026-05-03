"use client";

import { useState } from "react";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/formatters";
import { InfoTip } from "@/components/ui/info-tip";
import type { OptionContract } from "@/types/options";

interface Props {
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
}

type Side = "calls" | "puts";
type Filter = "all" | "itm" | "otm";

function ContractRow({
  contract,
  isATM,
}: {
  contract: OptionContract;
  isATM: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const ivPercent = contract.impliedVolatility
    ? (contract.impliedVolatility * 100).toFixed(1)
    : "—";

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "cursor-pointer border-b text-xs transition-colors hover:bg-muted/50",
          contract.inTheMoney && "bg-primary/5",
          isATM && "border-l-2 border-l-primary"
        )}
      >
        <td className="px-2 py-1.5 font-medium tabular-nums">
          {contract.strike}
          {isATM && <span className="ml-1 text-[10px] text-primary">ATM</span>}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">
          {contract.lastPrice?.toFixed(2) ?? "—"}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">
          {contract.bid?.toFixed(2) ?? "—"}/{contract.ask?.toFixed(2) ?? "—"}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">{ivPercent}%</td>
        <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell">
          {contract.volume != null ? formatCompact(contract.volume) : "—"}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">
          {formatCompact(contract.openInterest)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/30 text-xs">
          <td colSpan={6} className="px-3 py-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
              <span>
                Change:{" "}
                <span
                  className={cn(
                    "font-medium",
                    (contract.change ?? 0) >= 0
                      ? "text-success"
                      : "text-destructive"
                  )}
                >
                  {contract.change?.toFixed(2) ?? "—"} (
                  {contract.percentChange?.toFixed(1) ?? "—"}%)
                </span>
              </span>
              <span>
                IV: <span className="font-medium text-foreground">{ivPercent}%</span>
              </span>
              <span>
                Vol: <span className="font-medium text-foreground">{contract.volume ?? "—"}</span>
              </span>
              <span>
                OI: <span className="font-medium text-foreground">{contract.openInterest}</span>
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function OptionsChainTable({ calls, puts, underlyingPrice }: Props) {
  const [side, setSide] = useState<Side>("calls");
  const [filter, setFilter] = useState<Filter>("all");
  const t = useT();

  const contracts = side === "calls" ? calls : puts;

  const filtered = contracts.filter((c) => {
    if (filter === "itm") return c.inTheMoney;
    if (filter === "otm") return !c.inTheMoney;
    return true;
  });

  const findATMStrike = () => {
    if (contracts.length === 0) return 0;
    return contracts.reduce((closest, c) =>
      Math.abs(c.strike - underlyingPrice) < Math.abs(closest.strike - underlyingPrice)
        ? c
        : closest
    ).strike;
  };
  const atmStrike = findATMStrike();

  return (
    <div>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="flex rounded-lg bg-muted p-0.5">
          {(["calls", "puts"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                side === s
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "itm", "otm"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium uppercase transition-colors",
                filter === f
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-[10px] uppercase text-muted-foreground">
              <th className="px-2 py-1.5 font-medium">
                <span className="inline-flex items-center gap-1">{t("options.strike")} <InfoTip content={t("tip.strike")} /></span>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">{t("options.last")}</th>
              <th className="px-2 py-1.5 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">{t("options.bidAsk")} <InfoTip content={t("tip.bidAsk")} /></span>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">{t("options.iv")} <InfoTip content={t("tip.iv")} /></span>
              </th>
              <th className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">
                <span className="inline-flex items-center justify-end gap-1">{t("options.vol")} <InfoTip content={t("tip.vol")} /></span>
              </th>
              <th className="px-2 py-1.5 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">{t("options.oi")} <InfoTip content={t("tip.oi")} /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <ContractRow
                key={c.contractSymbol}
                contract={c}
                isATM={c.strike === atmStrike}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {t("options.noContracts")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
