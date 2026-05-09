"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bitcoin, ChartCandlestick, LayoutDashboard, Search, Star, TrendingUp, Radar, FlaskConical } from "lucide-react";
import { useT } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";

const items = [
  { href: "/dashboard", labelKey: "dashboard" as const, icon: LayoutDashboard },
  { href: "/screener", labelKey: "screener" as const, icon: Radar },
  { href: "/signal-lab", labelKey: "signalLab" as const, icon: FlaskConical },
  { href: "/btc-strategy", labelKey: "btcStrategy" as const, icon: Bitcoin },
  { href: "/us-index-strategy", labelKey: "usIndexStrategy" as const, icon: ChartCandlestick },
  { href: "/stock", labelKey: "stocks" as const, icon: Search },
  { href: "/watchlist", labelKey: "watchlist" as const, icon: Star },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const tt = useT();
  const t = (key: string) => tt(`nav.${key}`);

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">{t("appName")}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <LocaleSwitcher />
      </div>
    </aside>
  );
}
