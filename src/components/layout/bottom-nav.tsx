"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bitcoin, ChartCandlestick, LayoutDashboard, Search, Star, Languages, Radar, FlaskConical } from "lucide-react";
import { useT } from "@/i18n/context";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", labelKey: "dashboard" as const, icon: LayoutDashboard },
  { href: "/screener", labelKey: "screener" as const, icon: Radar },
  { href: "/signal-lab", labelKey: "signalLab" as const, icon: FlaskConical },
  { href: "/btc-strategy", labelKey: "btcStrategy" as const, icon: Bitcoin },
  { href: "/us-index-strategy", labelKey: "usIndexStrategy" as const, icon: ChartCandlestick },
  { href: "/stock", labelKey: "stocks" as const, icon: Search },
  { href: "/watchlist", labelKey: "watchlist" as const, icon: Star },
];

export function BottomNav() {
  const pathname = usePathname();
  const tt = useT();
  const t = (key: string) => tt(`nav.${key}`);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-14 items-center justify-around">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setLocale(locale === "en" ? "zh" : "en")}
          aria-label="Toggle language"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Languages className="h-5 w-5" />
          <span>{locale === "en" ? "中文" : "EN"}</span>
        </button>
      </div>
    </nav>
  );
}
