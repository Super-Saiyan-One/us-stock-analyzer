"use client";

import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useState } from "react";

interface Props {
  source: string;
  asOf?: string;
  frequency?: string;
  lag?: string;
  confidence?: "high" | "medium" | "low";
  className?: string;
}

const CONFIDENCE_DOT = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-destructive",
};

export function DataSourceTag({ source, asOf, frequency, lag, confidence, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {confidence && (
          <span className={cn("h-1.5 w-1.5 rounded-full", CONFIDENCE_DOT[confidence])} />
        )}
        <span>{source}</span>
        {asOf && <span>· {asOf}</span>}
        <Info className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border bg-card p-2.5 shadow-lg text-[11px] min-w-[180px]">
          <div className="space-y-1">
            <div><span className="text-muted-foreground">Source:</span> {source}</div>
            {asOf && <div><span className="text-muted-foreground">As of:</span> {asOf}</div>}
            {frequency && <div><span className="text-muted-foreground">Frequency:</span> {frequency}</div>}
            {lag && <div><span className="text-muted-foreground">Release lag:</span> {lag}</div>}
            {confidence && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Confidence:</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", CONFIDENCE_DOT[confidence])} />
                <span>{confidence}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
