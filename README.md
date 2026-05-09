# US Stock Analyzer

Personal market dashboard for US stocks, BTC cycle zones, and US index bottom/heat zones. The app is built with Next.js and uses API routes as the server-side data layer.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run test:btc
npm run test:us-index
npm run test:fallbacks
npx tsc --noEmit
npm run lint
npm run build
```

## Strategy Pages

### BTC Strategy

The BTC page uses local strategy templates copied from `E:\code\AutoQuant` and presents them as selectable Web templates. The Web app does not run a heavy AutoQuant-style experiment loop. It evaluates daily BTC candles plus CBBI/AHR999-style cycle inputs and turns the selected template into:

- DCA buy zones
- DCA sell zones
- buy/sell degree
- reference return vs buy-and-hold
- editable parameters
- optional hard stop, disabled by default for spot-style usage

The important product idea is zone interpretation, not exact broker-grade backtesting. If live external data fails on Vercel, the API can return a static fallback snapshot and the page marks that the data is not realtime.

### SPY / S&P 500 Index Zones

The US Index Zones page can switch to `SPY` to represent the S&P 500 ETF. The main model comes from `E:\code\AutoQuantStock\investigations\us_index_zone_research.py`, which searches one shared default across SPY and QQQ rather than fitting one ticker only.

The main model stays split into:

- `panic_bottom`: extreme fear/panic bottom zones
- `pullback_bottom`: clear drawdown zones that can still trigger even when valuation is expensive
- `heat` / `dca_sell`: overheated or risk-reduction zones

Default parameters currently used by Web:

```text
fear=0.30
valuation=0.15
technical=0.40
repair=0.15
bottom=50
panic=50
pullback=34
heat=52
conflictGap=5
```

SPY also uses auxiliary gates:

- VIX > 30 strengthens panic-bottom interpretation.
- VIX < 14 strengthens heat/low-volatility complacency interpretation.
- CNN Fear & Greed < 20 strengthens extreme-fear buy interpretation.
- CNN Fear & Greed > 80 strengthens extreme-greed trim interpretation.
- Current QQQ PE >= 38 is a valuation warning. It can soften buy degree and raise sell confidence, but it must not block a valid pullback-bottom zone.

### QQQ / Nasdaq 100 Index Zones

Switching the same page to `QQQ` evaluates Nasdaq 100 ETF price action with the same shared default parameters. This is intentional to reduce overfitting: the chosen defaults must behave reasonably for both SPY and QQQ and across the 2018 drawdown, 2020 crash, 2022 bear market, and 2024-2026 rally/pullback windows.

QQQ uses the same main model and auxiliary gates as SPY. The QQQ PE gate is current-only because a stable free historical QQQ PE series was not found. It is shown in the page explanation and reason tags when available, but it is not used in historical score calculation.

## Data Notes

- BTC live data uses Binance daily candles and CBBI data.
- SPY/QQQ price and VIX-style series use Yahoo chart data.
- CNN Fear & Greed history starts around 2021, so older periods rely more on VIX and valuation inputs.
- CAPE and trailing PE are used as historical valuation inputs.
- Forward PE and QQQ PE are realtime gates only when available.
- Static fallback snapshots live in `src/data/fallbacks/*.json` and are clearly labeled as non-realtime in the UI.
