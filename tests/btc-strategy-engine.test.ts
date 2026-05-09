import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BTC_STRATEGY_TEMPLATES,
  DEFAULT_BTC_STRATEGY_CONFIG,
  evaluateBtcStrategy,
  getBtcStrategyTemplate,
  normalizeConfig,
  type BtcDailyCandle,
  type CbbiPoint,
} from "../src/lib/btc-strategy-engine";

function makeCandle(day: number, close: number): BtcDailyCandle {
  const date = new Date(Date.UTC(2025, 0, day)).toISOString().slice(0, 10);
  return {
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 100,
  };
}

describe("evaluateBtcStrategy", () => {
  it("exposes AutoQuant strategy map templates for user selection", () => {
    assert.deepEqual(
      BTC_STRATEGY_TEMPLATES.map((template) => template.id),
      [
        "cbbi_momentum_opt",
        "cbbi_momentum",
        "cbbi_ahr999_daily",
        "smart_hold",
        "bear01",
        "buy_and_hold",
      ]
    );
    assert.equal(getBtcStrategyTemplate("smart_hold").defaultConfig.name, "SmartHold");
  });

  it("opens on rising CBBI and AHR999 momentum, then exits when CBBI is overheated", () => {
    const candles = Array.from({ length: 230 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 200)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: i < 210 ? 0.3 + i * 0.001 : 0.85,
    }));

    const result = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.75,
      stoplossPct: -25,
    });

    assert.equal(result.trades.length, 1);
    assert.equal(result.trades[0].exitReason, "cbbi_overheated");
    assert.equal(result.latest.position, "cash");
    assert.equal(result.latest.action, "hold");
    assert.ok(result.stats.totalReturnPct > 0);
  });

  it("does not re-enter while the entry condition remains continuously true", () => {
    const candles = Array.from({ length: 230 }, (_, i) => {
      const close = 20000 + i * 200;
      return {
        ...makeCandle(i + 1, close),
        low: i === 205 ? close * 0.7 : close,
      };
    });
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: 0.3 + i * 0.001,
    }));

    const result = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: true,
    });

    assert.equal(result.trades.length, 1);
    assert.equal(result.trades[0].exitReason, "stoploss");
    assert.equal(result.latest.position, "cash");
  });

  it("keeps a spot position open when hard stop is disabled", () => {
    const candles = Array.from({ length: 230 }, (_, i) => {
      const close = 20000 + i * 200;
      return {
        ...makeCandle(i + 1, close),
        low: i === 205 ? close * 0.7 : close,
      };
    });
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: 0.3 + i * 0.001,
    }));

    const result = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: false,
    });

    assert.equal(result.trades.length, 0);
    assert.equal(result.latest.position, "long");
    assert.equal(result.openTrade?.entryDate, result.indicators.find((point) => point.entrySignal)?.date);
  });

  it("only applies stoploss exits when hard stop is enabled", () => {
    const candles = Array.from({ length: 230 }, (_, i) => {
      const close = 20000 + i * 200;
      return {
        ...makeCandle(i + 1, close),
        low: i === 205 ? close * 0.7 : close,
      };
    });
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: 0.3 + i * 0.001,
    }));

    const withoutHardStop = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: false,
    });
    const withHardStop = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: true,
    });

    assert.equal(withoutHardStop.trades.length, 0);
    assert.equal(withHardStop.trades.length, 1);
    assert.equal(withHardStop.trades[0].exitReason, "stoploss");
  });

  it("does not let the optional hard stop change zone signals", () => {
    const candles = Array.from({ length: 230 }, (_, i) => {
      const close = 20000 + i * 200;
      return {
        ...makeCandle(i + 1, close),
        low: i === 205 ? close * 0.7 : close,
      };
    });
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: 0.3 + i * 0.001,
    }));

    const withoutHardStop = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: false,
    });
    const withHardStop = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
      hardStopEnabled: true,
    });

    assert.deepEqual(
      withoutHardStop.zonePoints.map((point) => ({
        date: point.date,
        action: point.action,
        buyDegreePct: point.buyDegreePct,
        sellDegreePct: point.sellDegreePct,
        reasonTags: point.reasonTags,
      })),
      withHardStop.zonePoints.map((point) => ({
        date: point.date,
        action: point.action,
        buyDegreePct: point.buyDegreePct,
        sellDegreePct: point.sellDegreePct,
        reasonTags: point.reasonTags,
      }))
    );
  });

  it("normalizes old saved configs with hard stop disabled", () => {
    const normalized = normalizeConfig({
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      hardStopEnabled: undefined,
    });

    assert.equal(
      (normalized as typeof normalized & { hardStopEnabled?: boolean }).hardStopEnabled,
      false
    );
  });

  it("applies each selectable template without throwing", () => {
    const candles = Array.from({ length: 260 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 150)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: 0.2 + (i % 90) * 0.006,
    }));

    for (const template of BTC_STRATEGY_TEMPLATES) {
      const result = evaluateBtcStrategy(candles, cbbi, template.defaultConfig);
      assert.equal(result.config.templateId, template.id);
      assert.ok(result.indicators.length > 0);
    }
  });

  it("includes open-position mark-to-market return in strategy stats", () => {
    const candles = Array.from({ length: 260 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 100)
    );
    const cbbi: CbbiPoint[] = candles.map((candle) => ({
      date: candle.date,
      cbbi: 0.4,
    }));

    const result = evaluateBtcStrategy(
      candles,
      cbbi,
      getBtcStrategyTemplate("buy_and_hold").defaultConfig
    );

    assert.equal(result.latest.position, "long");
    assert.equal(result.openTrade?.entryDate, candles[0].date);
    assert.ok(result.stats.totalReturnPct > 0);
  });

  it("returns the actual open entry instead of the latest raw entry signal", () => {
    const candles = Array.from({ length: 230 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 100)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: i < 205 ? 0.3 + i * 0.001 : 0.32 + (i % 2) * 0.004,
    }));

    const result = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.99,
      stoplossPct: -25,
    });

    assert.equal(result.trades.length, 0);
    assert.equal(result.latest.position, "long");
    const rawEntries = result.indicators.filter((point) => point.entrySignal);
    assert.ok(rawEntries.length > 1);
    assert.equal(result.openTrade?.entryDate, rawEntries[0].date);
    assert.notEqual(result.openTrade?.entryDate, rawEntries.at(-1)?.date);
  });

  it("marks a strong DCA buy zone when CBBI is low and strategy entry rules pass", () => {
    const candles = Array.from({ length: 260 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 120)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: i < 253 ? 0.1 : 0.1 + (i - 253) * 0.003,
    }));

    const result = evaluateBtcStrategy(
      candles,
      cbbi,
      getBtcStrategyTemplate("cbbi_momentum_opt").defaultConfig
    );

    assert.equal(result.latestZone.action, "dca_buy");
    assert.equal(result.latestZone.buyDegreePct, 100);
    assert.equal(result.latestZone.sellDegreePct, 0);
    assert.ok(result.latestZone.reasonTags.includes("cbbi_low"));
  });

  it("prioritizes DCA sell zones when overheated even if momentum is positive", () => {
    const candles = Array.from({ length: 230 }, (_, i) =>
      makeCandle(i + 1, 20000 + i * 200)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: i < 226 ? 0.7 : 0.82 + (i - 226) * 0.04,
    }));

    const result = evaluateBtcStrategy(candles, cbbi, {
      ...DEFAULT_BTC_STRATEGY_CONFIG,
      exitAhr: 999,
      exitCbbi: 0.75,
    });

    assert.equal(result.latestZone.action, "dca_sell");
    assert.equal(result.latestZone.buyDegreePct, 0);
    assert.equal(result.latestZone.sellDegreePct, 100);
    assert.ok(result.latestZone.reasonTags.includes("cbbi_hot"));
  });

  it("uses a DCA sell zone when the selected strategy trend filter fails", () => {
    const candles = Array.from({ length: 260 }, (_, i) =>
      makeCandle(i + 1, 50000 - i * 100)
    );
    const cbbi: CbbiPoint[] = candles.map((candle, i) => ({
      date: candle.date,
      cbbi: i < 253 ? 0.1 : 0.1 + (i - 253) * 0.003,
    }));

    const result = evaluateBtcStrategy(
      candles,
      cbbi,
      getBtcStrategyTemplate("cbbi_momentum_opt").defaultConfig
    );

    assert.equal(result.latestZone.action, "dca_sell");
    assert.equal(result.latestZone.buyDegreePct, 0);
    assert.equal(result.latestZone.sellDegreePct, 100);
    assert.ok(result.latestZone.reasonTags.includes("trend_broken"));
  });
});
