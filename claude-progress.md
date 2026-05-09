# Claude Progress

## 2026-05-09

- Cloned `https://github.com/Super-Saiyan-One/us-stock-analyzer.git` into `E:\code\us-stock-analyzer`.
- Confirmed remote `origin` points to the same GitHub repository.
- No application code changes made.
- Created local branch `codex/check-push-access-20260509`.
- Verified `git push --dry-run` succeeds for that branch, indicating push access is available.
- Reviewed project structure, frontend patterns, API routes, caching conventions, i18n usage, and Python API style before planning new feature work.
- Implemented BTC Strategy v1: CbbiAhr999Daily engine, Binance/Yahoo+CBBI data fetchers, SQLite config persistence, API routes, React Query hook, `/btc-strategy` page, navigation, i18n, docs, and focused test.
- Verified with `npm run test:btc`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, live helper smoke test, and localhost API/page checks.
- Fixed BTC Strategy feedback: stoploss negative input, chart tooltip `$NaN`, edge-triggered entry behavior, and added Buy & Hold / excess return comparison to make strategy effectiveness visible.
- Added AutoQuant strategy templates from `STRATEGY_MAP.md` to BTC Strategy: CbbiMomentumOpt, CbbiMomentum, CbbiAhr999Daily, SmartHold, Bear01, and BuyAndHold; template selection now loads default parameters and recomputes results.
- Investigated CbbiMomentumOpt missing the 2024-10 onward rally: current web implementation is a daily approximation of AutoQuant's 1h strategy, so CBBI/EMA filters can differ materially. Added open-position output, chart display of open entries, full-history chart data, and a regression test for true open entry tracking.
- Converted the BTC page toward a zone signal dashboard: the engine now returns daily DCA buy/hold/DCA sell zones, 0/25/50/75/100% buy/sell degrees, reason tags, and latestZone; the page emphasizes zone/degrees while moving reference trade results behind a collapsible historical section.
- Refined BTC zone dashboard UX: chart defaults to a smaller range with 1Y/2Y/4Y/All controls and Brush zoom, strategy parameters render dynamically per template, and the old Save action is now labeled as Apply Parameters with clearer applied-state copy.
- Fixed BTC chart rendering after 2025-07 by removing heavy zone background bands and Brush from the Recharts view; the chart now keeps the BTC price as the only continuous line and renders zone signals as lightweight dots to avoid hiding the blue price line on 2Y/All ranges.
- Further simplified BTC chart performance: removed hover tooltip and per-day zone scatter points, leaving only the continuous BTC price line plus sparse historical buy/sell markers; applying parameters now forces an active strategy refetch with no-store caching.
- Fixed BTC chart markers after applying parameters: main chart markers now come from current `zonePoints` action transitions instead of historical reference `trades`, so changing strategy/template parameters changes the plotted DCA buy/sell points.
- Implemented BTC spot zone v3: hard stop is now optional and defaults off, Web daily reference returns are compared with Buy & Hold, strategy/parameter explanations were added, and the chart now uses a lightweight zone timeline to show DCA buy/hold/sell intervals without reintroducing heavy hover behavior.
- Probed data availability for a future US index zone strategy: SPY/QQQ/VIX/VIX3M/SKEW history is available through yfinance, CNN Fear & Greed works from about 2021-01 with browser-style headers, Shiller CAPE/trailing PE history is available, and free stable S&P 500 forward PE history was not found. Added root `plan.md` defining current-only indicators such as forward PE as realtime gates rather than historical scoring inputs.
- Started implementing the US Index Zones goal: added `AutoQuantStock/investigations/us_index_zone_research.py`, generated SPY/QQQ research JSON/report, added TypeScript US index strategy types/engine/tests, API routes, market data layer, config persistence, React Query hook, `/us-index-strategy` page, navigation, i18n strings, and docs updates. Verification is still in progress.
