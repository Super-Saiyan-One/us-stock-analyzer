# US Stock Analyzer — Agent Context

> This file is the single source of truth for AI coding agents (Claude Code, Codex, Copilot).
> For Claude Code specific instructions, see `CLAUDE.md` which imports this context.

## ⚠️ Keeping This File Up-to-Date

**After completing any task, check if your changes match one of these triggers. If yes, update this file AND `CLAUDE.md` before finishing.**

| Trigger | What to update |
|---------|---------------|
| New API route created | Project Structure, Data Sources Reference |
| New page/component added | Project Structure |
| New env variable introduced | Environment Variables |
| New npm/pip dependency | Tech Stack table |
| New data source integrated | Data Sources Reference, SQLite Schema (if new series) |
| Cache TTL added/changed | Known Issues (if inconsistency), CLAUDE.md TTL table |
| Bug fixed from Known Issues | Check off the item in Known Issues |
| New known issue discovered | Add to Known Issues with priority |
| Database schema changed | SQLite Schema section |
| Coding convention changed | Coding Conventions section |
| File/directory renamed or moved | Project Structure tree |

**Rule**: If the change would make a future agent misunderstand the project, it must be documented here.

## What This Project Is

A full-stack US stock market analysis tool: market valuation dashboard, individual stock analysis, options chain data, and macro indicators. Built for a single user (personal tool), deployed locally or via Docker.

**Live pages**: Dashboard (market regime radar, valuation, Fed liquidity, rates, volatility, macro) · Screener (opportunity scanning with scoring) · Signal Lab (backtest signal performance) · BTC Strategy (BTC zone signals, DCA buy/sell degree, zone timeline, editable parameters, optional hard stop) · US Index Zones (SPY/QQQ panic-bottom and pullback-bottom DCA zones plus heat trim zones; defaults from AutoQuantStock parameter search) · Stock search + detail (quote, chart, key metrics, options, signals) · Watchlist

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | Next.js 16 (App Router) + React 19 | All pages are `"use client"` |
| Styling | TailwindCSS 4 + CSS variables | Light/dark auto via `prefers-color-scheme` |
| State | Zustand (persist) + TanStack React Query | Zustand = client state, RQ = server state |
| Charts | Recharts (dashboard) + lightweight-charts (candlestick) | |
| i18n | next-intl + custom `useT()` wrapper | en/zh, messages in `messages/*.json` |
| Icons | lucide-react | |
| Tests | node:test + tsx | Focused TypeScript tests for pure engines |
| Backend | FastAPI + uvicorn (Python) | yfinance for fundamentals + options |
| Persistence | SQLite (better-sqlite3) | `data/cache.db`, time series + cache |
| External APIs | Yahoo Finance, FRED, Shiller CAPE, CNN Fear&Greed, SEC EDGAR, FINRA, stockmarketperatio.com | |

## Architecture

```
Browser → Next.js API Routes (BFF) → External APIs / Python API
              ↓                           ↓
         L1 Memory Cache           L2 SQLite (time series)
              ↓
         L3 React Query (client)
```

### Key Principles
1. **All external calls go through `src/app/api/`** — components never call external APIs directly
2. **Three-layer caching**: Memory (hot data, seconds TTL) → SQLite (time series, survives restart) → React Query (client)
3. **Python API only for yfinance** — everything else handled in Node
4. **No hardcoded TTLs** — all in `lib/constants.ts` as `CACHE_TTL.*` / `STALE_TIME.*`
5. **No hardcoded UI strings** — all via `messages/*.json` i18n keys
6. **Original data over calculated** — use raw API values, don't derive what can be fetched directly

## Project Structure

```
src/
├── app/
│   ├── (app)/                     # Layout group with nav
│   │   ├── dashboard/page.tsx     # Market dashboard
│   │   ├── btc-strategy/page.tsx  # BTC zone signal dashboard
│   │   ├── us-index-strategy/page.tsx # SPY/QQQ bottom/heat zone dashboard
│   │   ├── screener/page.tsx      # Opportunity screener
│   │   ├── signal-lab/page.tsx    # Signal backtest lab
│   │   ├── stock/page.tsx         # Search
│   │   ├── stock/[symbol]/page.tsx       # Stock detail
│   │   ├── stock/[symbol]/options/page.tsx # Options chain
│   │   └── watchlist/page.tsx     # Watchlist
│   ├── api/                       # BFF layer
│   │   ├── fred/                  # FRED macro (SQLite-backed)
│   │   ├── crypto/btc/strategy/   # BTC strategy evaluation + config persistence
│   │   ├── market/{indices,regime,shiller,sp500,fear-greed,forward-pe,sector-pe,us-index-strategy}/
│   │   ├── screener/             # Batch stock screening
│   │   ├── signals/{backtest,observations}/ # Signal verification
│   │   └── stock/[symbol]/{quote,chart,financials,options,options-summary}/
│   └── layout.tsx                 # Root (fonts, providers)
├── components/
│   ├── charts/                    # CAPE history, price chart, options OI
│   ├── dashboard/                 # All dashboard cards
│   ├── layout/                    # Nav (bottom + desktop sidebar)
│   ├── options/                   # Options chain table, IV skew
│   ├── screener/                  # Screener table + filters
│   ├── signal-lab/                # Backtest table, observations table
│   ├── stock/                     # Quote header, key metrics, signals
│   ├── ui/                        # Shared UI (InfoTip, EmptyState)
│   └── error-boundary.tsx
├── hooks/                         # React Query hooks (use-*.ts)
├── i18n/                          # context.tsx (I18nProvider + useT)
├── lib/
│   ├── api.ts                     # apiFetch, validateSymbol
│   ├── cache.ts                   # In-memory TTL cache (Map-based)
│   ├── db.ts                      # SQLite (time_series + cache_meta + signal_observations + price_snapshots)
│   ├── btc-market-data.ts         # BTC daily candles + CBBI fetch/cache
│   ├── btc-strategy-engine.ts     # BTC zone signal + reference trade evaluator
│   ├── us-index-market-data.ts    # SPY/QQQ daily candles + VIX/Fear/valuation data
│   ├── us-index-strategy-engine.ts # US index panic/pullback bottom + heat zone scorer, research-optimized defaults
│   ├── constants.ts               # ALL constants (URLs, CACHE_TTL, STALE_TIME)
│   ├── data-source-registry.ts    # DataMeta builder for provenance tracking
│   ├── feature-engine.ts          # Percentile-based feature computation
│   ├── screener-engine.ts         # Screener scoring & classification
│   ├── signal-engine.ts           # Structural signal detection
│   ├── universes.ts               # Stock universe definitions (SP500 top 100)
│   ├── formatters.ts              # Number/currency/percent formatters
│   └── utils.ts                   # cn() for Tailwind class merging
├── providers/                     # QueryClientProvider
├── stores/                        # Zustand (settings, watchlist)
├── data/fallbacks/                # Static BTC/US index API snapshots for Vercel fallback
└── types/                         # TypeScript interfaces
    ├── data-meta.ts               # DataMeta, RegimeDimension types
    ├── btc-strategy.ts            # BTC strategy config/evaluation types, optional hard stop
    ├── us-index-strategy.ts       # US index zone config/evaluation types
    ├── market.ts                  # ShillerLatest, IndexData, ForwardPEData, etc.
    ├── options.ts                 # OptionContract, OptionsChain
    ├── screener.ts                # ScreenerStock, BacktestResult, SignalObservation
    └── stock.ts                   # StockQuote, FinancialMetrics, ChartDataPoint

messages/{en,zh}.json              # i18n translations (nested JSON)
data/cache.db                      # SQLite (git-ignored, auto-created)
python-api/                        # FastAPI (main.py, routers/, utils.py)
```

## Coding Conventions

### TypeScript / React
- Shared types in `src/types/`, never redefine interfaces locally in hooks/components
- All hooks at top of component body, before any conditional returns
- Use `cn()` for Tailwind class merging
- Loading: `animate-pulse` skeleton screens
- Color semantics: `--success` (green/up), `--destructive` (red/down), `--warning` (amber)
- Use `tabular-nums` for all numeric displays
- All interactive elements must have `aria-label` if no visible text
- Empty states use `<EmptyState>` component from `components/ui/`

### API Routes
- Input validation: `validateSymbol()` for stock symbols
- Error format: `{ error: "message" }` with appropriate HTTP status
- Cache pattern: check memory → check SQLite → fetch external → store both layers
- All fetch calls must have `signal: AbortSignal.timeout(N)` 
- FRED data: use `upsertTimeSeries()` for SQLite persistence

### Python API
- All yfinance numeric values through `safe_num()` (NaN/Inf → None)
- Errors: `HTTPException(status_code=502)`
- Field naming: camelCase (matches frontend)

### i18n
- Translations in `messages/en.json` and `messages/zh.json` (nested JSON)
- Component usage: `const t = useT(); t("namespace.key")` 
- Never hardcode user-facing strings

### Constants
- API URLs: `lib/constants.ts`
- Cache TTLs: `CACHE_TTL.*` (server) — no magic numbers
- Stale times: `STALE_TIME.*` (client) — must be >= corresponding CACHE_TTL
- New data source = add entries to both `CACHE_TTL` and `STALE_TIME`

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PYTHON_API_URL` | Python API address | No (default: `http://localhost:8000`) |
| `FRED_API_KEY` | FRED macro data API key | Yes |
| `SEC_USER_AGENT` | SEC EDGAR user agent | No (has default) |

Config: `.env.local` (git-ignored). Reference: `.env.example`

## Commands

```bash
npm run dev              # Next.js dev (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm run test:btc         # BTC strategy engine focused test
npm run test:fallbacks   # Static strategy fallback snapshot test
npm run test:us-index    # US index zone strategy engine focused test
npx tsc --noEmit         # Type check

# Python API
cd python-api && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Docker
docker-compose up
```

## Known Issues & Tech Debt

### High Priority
- [ ] **Dockerfile missing** for frontend — `docker-compose.yml` references it but it doesn't exist
- [ ] **Memory cache unbounded** (`lib/cache.ts`) — no size limit, potential memory leak under heavy use. Consider LRU cache.
- [ ] **Cache stampede** on scraper failure — `forward-pe` and `regime` routes don't cache failed results, causing repeated fetch attempts

### Medium Priority  
- [ ] **Promise.all in indices route** — one failed index fetch causes entire response to fail. Should use `Promise.allSettled`
- [ ] **Timeout inconsistency** — different routes use different timeouts (5s, 10s, 15s). Should standardize via constant.
- [ ] **Python API no timeouts** — yfinance calls can hang indefinitely
- [ ] **Docker healthchecks missing** — no automatic restart on failure
- [ ] **No structured logging** — production debugging is difficult
- [ ] **Vercel fallback snapshots are manual** — `src/data/fallbacks/*.json` keeps BTC/US index pages visible if external APIs or SQLite fail, but snapshots must be refreshed manually after strategy/data changes

### Low Priority
- [ ] **Yahoo Finance fetch duplication** — `sp500`, `indices`, `fear-greed` routes share similar fetch+parse logic
- [ ] **N/A display inconsistency** — some components show "N/A", others "—", others hide entirely

## Data Sources Reference

| Source | Data | Auth | Refresh |
|--------|------|------|---------|
| Yahoo Finance Chart API | Price, volume, indices | None | Real-time |
| Yahoo Finance Search API | Stock search | None | — |
| Yahoo Finance Chart API (^VIX, ^VIX3M, ^SKEW) | US index zone fear/risk proxies | None | Daily |
| Binance Spot Klines API | BTCUSDT daily candles for BTC strategy | None | Daily |
| Colin Talks Crypto CBBI | CBBI cycle confidence index | None | Daily |
| FRED | Macro indicators (rates, VIX, CPI, M2...) | API Key | Daily/Weekly/Monthly |
| Shiller/CAPE | Historical PE data and US index zone valuation input | None | Daily |
| CNN Fear & Greed | Market sentiment score; history from ~2021 for US index zones | None | 30min |
| stockmarketperatio.com | Current S&P 500 Forward PE gate + historical Trailing PE | None (scrape) | Monthly |
| SEC EDGAR | Company filings (10-K, 8-K, etc.) | User-Agent header | 30min |
| FINRA | Short interest data | None | 12h |
| yfinance (Python) | Fundamentals, options chains, earnings | None | 5min |

## SQLite Schema

```sql
-- Time series (FRED data, PE ratios, etc.)
CREATE TABLE time_series (
  series_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (series_id, date)
);

-- Generic JSON cache
CREATE TABLE cache_meta (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- BTC strategy configuration
-- params JSON stores template parameters, including hardStopEnabled (default false)
CREATE TABLE btc_strategy_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  params TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- US index zone strategy configuration
-- params JSON stores weights, panic/pullback bottom thresholds, heat threshold, indicator periods,
-- and forward PE gate thresholds. Exact legacy 60/60 and old research defaults are upgraded
-- to the latest AutoQuantStock research default at read time.
CREATE TABLE us_index_strategy_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  params TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Key series IDs: `SP500_FORWARD_PE`, `SP500_TRAILING_PE`, plus all FRED series (DGS10, VIXCLS, etc.)
