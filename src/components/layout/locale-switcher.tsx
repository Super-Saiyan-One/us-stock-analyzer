"use client";

import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

export function LocaleSwitcher({ compact }: { compact?: boolean }) {
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  if (compact) {
    return (
      <button
        onClick={() => setLocale(locale === "en" ? "zh" : "en")}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Languages className="h-3.5 w-3.5" />
        {locale === "en" ? "中" : "EN"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            locale === l
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}
