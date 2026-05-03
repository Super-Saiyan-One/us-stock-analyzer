"use client";

import { cn } from "@/lib/utils";

interface Props {
  expirations: string[];
  selected: string;
  onSelect: (exp: string) => void;
}

export function ExpirationSelector({ expirations, selected, onSelect }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none">
      {expirations.map((exp) => (
        <button
          key={exp}
          onClick={() => onSelect(exp)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === exp
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {exp}
        </button>
      ))}
    </div>
  );
}
