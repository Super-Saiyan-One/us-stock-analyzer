"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n/context";
import {
  useOptionsExpirations,
  useOptionsChain,
} from "@/hooks/use-options-chain";
import { ExpirationSelector } from "@/components/options/expiration-selector";
import { OptionsChainTable } from "@/components/options/options-chain-table";
import { OptionsOIChart } from "@/components/charts/options-oi-chart";
import { IVSkewChart } from "@/components/options/iv-skew-chart";

export default function OptionsPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const sym = symbol.toUpperCase();
  const t = useT();
  const [selectedExpiration, setSelectedExpiration] = useState("");

  const { data: expData } = useOptionsExpirations(sym);
  const expirations = expData?.expirations ?? [];

  const activeExpiration = selectedExpiration || expirations[0] || "";

  const { data: chainData, isLoading } = useOptionsChain(
    sym,
    activeExpiration
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2 border-b p-4">
        <Link
          href={`/stock/${sym}`}
          className="rounded-full p-1 transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">{sym} {t("options.title")}</h1>
        {chainData && (
          <span className="ml-auto text-sm text-muted-foreground">
            {t("options.underlying")}: ${chainData.underlyingPrice.toFixed(2)}
          </span>
        )}
      </div>

      {expirations.length > 0 && (
        <ExpirationSelector
          expirations={expirations}
          selected={activeExpiration}
          onSelect={setSelectedExpiration}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {chainData && (
        <>
          <OptionsChainTable
            calls={chainData.calls}
            puts={chainData.puts}
            underlyingPrice={chainData.underlyingPrice}
          />
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <OptionsOIChart
              calls={chainData.calls}
              puts={chainData.puts}
              underlyingPrice={chainData.underlyingPrice}
            />
            <IVSkewChart
              calls={chainData.calls}
              puts={chainData.puts}
              underlyingPrice={chainData.underlyingPrice}
            />
          </div>
        </>
      )}
    </div>
  );
}
