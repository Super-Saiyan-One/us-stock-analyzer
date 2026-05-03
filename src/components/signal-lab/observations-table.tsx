"use client";

import Link from "next/link";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent } from "@/lib/formatters";

interface Observation {
  id: number;
  symbol: string;
  signalId: string;
  category: string;
  score: number;
  priceAtSignal: number;
  observedAt: string;
  triggers: string[];
  regime: string | null;
  forwardReturn1D: number | null;
  forwardReturn5D: number | null;
  forwardReturn20D: number | null;
}

interface Props {
  observations: Observation[];
}

export function ObservationsTable({ observations }: Props) {
  const t = useT();
  const ts = (key: string) => t(`signalLab.${key}`);

  if (observations.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {ts("noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Symbol</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("signalId")}</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Price</th>
            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{ts("1d")}</th>
            <th className="hidden px-3 py-2.5 text-xs font-medium text-muted-foreground sm:table-cell">{ts("5d")}</th>
            <th className="hidden px-3 py-2.5 text-xs font-medium text-muted-foreground md:table-cell">{ts("20d")}</th>
          </tr>
        </thead>
        <tbody>
          {observations.map((obs) => (
            <tr key={obs.id} className="border-b last:border-b-0 hover:bg-muted/50">
              <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{obs.observedAt}</td>
              <td className="px-3 py-2">
                <Link href={`/stock/${obs.symbol}`} className="font-semibold text-primary hover:underline">
                  {obs.symbol}
                </Link>
              </td>
              <td className="px-3 py-2 text-xs">{obs.signalId.replace("screener:", "")}</td>
              <td className="px-3 py-2 tabular-nums">{obs.score}</td>
              <td className="px-3 py-2 tabular-nums">{formatPrice(obs.priceAtSignal)}</td>
              <td className="px-3 py-2">
                <ReturnCell value={obs.forwardReturn1D} />
              </td>
              <td className="hidden px-3 py-2 sm:table-cell">
                <ReturnCell value={obs.forwardReturn5D} />
              </td>
              <td className="hidden px-3 py-2 md:table-cell">
                <ReturnCell value={obs.forwardReturn20D} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReturnCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">--</span>;
  return (
    <span
      className={cn(
        "tabular-nums text-sm",
        value > 0 && "text-[var(--success)]",
        value < 0 && "text-[var(--destructive)]"
      )}
    >
      {formatPercent(value)}
    </span>
  );
}
