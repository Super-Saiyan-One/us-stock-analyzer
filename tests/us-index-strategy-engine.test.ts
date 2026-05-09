import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_US_INDEX_STRATEGY_CONFIG,
  evaluateUsIndexStrategy,
  normalizeUsIndexStrategyConfig,
  resolveUsIndexStrategyConfig,
  resolveUsIndexZoneAction,
} from "../src/lib/us-index-strategy-engine";
import type {
  UsIndexDailyCandle,
  UsIndexMacroPoint,
} from "../src/types/us-index-strategy";

function makeCandles(kind: "bottom" | "heat" | "flat"): UsIndexDailyCandle[] {
  const start = Date.UTC(2023, 0, 2);
  return Array.from({ length: 260 }, (_, index) => {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    const base =
      kind === "bottom"
        ? index < 210
          ? 120
          : 120 - (index - 209) * 0.9
        : kind === "heat"
          ? 100 + index * 0.55
          : 100;
    const close = Math.max(40, base);
    return {
      date,
      open: close * 0.995,
      high: close * 1.01,
      low: close * 0.99,
      close,
      volume: 1_000_000,
    };
  });
}

function makeMacro(kind: "bottom" | "heat" | "flat"): UsIndexMacroPoint[] {
  const start = Date.UTC(2023, 0, 2);
  return Array.from({ length: 260 }, (_, index) => {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    if (kind === "bottom") {
      return {
        date,
        vix: index < 210 ? 15 : 42,
        vix3m: index < 210 ? 17 : 34,
        skew: index < 210 ? 125 : 145,
        fearGreed: index < 210 ? 55 : 12,
        cape: index < 210 ? 34 : 22,
        trailingPE: index < 210 ? 28 : 17,
      };
    }
    if (kind === "heat") {
      return {
        date,
        vix: 12,
        vix3m: 16,
        skew: 150,
        fearGreed: 84,
        cape: 42,
        trailingPE: 31,
      };
    }
    return {
      date,
      vix: 20,
      vix3m: 22,
      skew: 130,
      fearGreed: 50,
      cape: 30,
      trailingPE: 24,
    };
  });
}

describe("evaluateUsIndexStrategy", () => {
  it("uses the AutoQuantStock parameter search as the default config", () => {
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.name, "USIndexZoneResearchOpt");
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.fearWeight, 0.45);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.valuationWeight, 0.15);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.technicalWeight, 0.3);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.repairWeight, 0.1);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.bottomThreshold, 46);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.heatThreshold, 56);
    assert.equal(DEFAULT_US_INDEX_STRATEGY_CONFIG.conflictGap, 15);
  });

  it("upgrades the old 60/60 saved default to the researched default", () => {
    const config = resolveUsIndexStrategyConfig({
      name: "USIndexZoneBalanced",
      fearWeight: 0.4,
      valuationWeight: 0.15,
      technicalWeight: 0.35,
      repairWeight: 0.1,
      bottomThreshold: 60,
      heatThreshold: 60,
      conflictGap: 15,
      rsiPeriod: 14,
      smaLongDays: 200,
      emaFastDays: 20,
      emaSlowDays: 50,
      forwardPeLow: 18,
      forwardPeHigh: 24,
    });

    assert.equal(config.name, "USIndexZoneResearchOpt");
    assert.equal(config.bottomThreshold, 46);
    assert.equal(config.heatThreshold, 56);
  });

  it("normalizes user weights and clamps thresholds", () => {
    const config = normalizeUsIndexStrategyConfig({
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      fearWeight: 9,
      technicalWeight: 3,
      valuationWeight: 0,
      repairWeight: 0,
      bottomThreshold: 200,
      heatThreshold: -10,
    });

    assert.equal(config.bottomThreshold, 100);
    assert.equal(config.heatThreshold, 0);
    assert.equal(Number((config.fearWeight + config.technicalWeight).toFixed(6)), 1);
    assert.equal(config.valuationWeight, 0);
  });

  it("keeps current-only forward PE out of historical zone scoring", () => {
    const candles = makeCandles("flat");
    const macro = makeMacro("flat");
    const lowForward = evaluateUsIndexStrategy(candles, macro, {
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      currentForwardPE: { date: "2026-04-30", value: 16 },
    });
    const highForward = evaluateUsIndexStrategy(candles, macro, {
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      currentForwardPE: { date: "2026-04-30", value: 26 },
    });

    assert.deepEqual(
      lowForward.zonePoints.map((point) => ({
        date: point.date,
        action: point.action,
        bottomScore: point.bottomScore,
        heatScore: point.heatScore,
      })),
      highForward.zonePoints.map((point) => ({
        date: point.date,
        action: point.action,
        bottomScore: point.bottomScore,
        heatScore: point.heatScore,
      }))
    );
    assert.equal(lowForward.currentGate.forwardPE?.signal, "undervalued");
    assert.equal(highForward.currentGate.forwardPE?.signal, "overvalued");
  });

  it("marks panic and oversold conditions as a DCA buy zone", () => {
    const result = evaluateUsIndexStrategy(makeCandles("bottom"), makeMacro("bottom"), {
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      bottomThreshold: 50,
      heatThreshold: 70,
    });

    assert.equal(result.latestZone.action, "dca_buy");
    assert.ok(result.latestZone.buyDegreePct >= 75);
    assert.ok(result.latestZone.reasonTags.includes("panic"));
    assert.ok(result.stats.buyHoldReturnPct < 0);
  });

  it("marks greedy overbought conditions as a DCA sell zone", () => {
    const result = evaluateUsIndexStrategy(makeCandles("heat"), makeMacro("heat"), {
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      bottomThreshold: 70,
      heatThreshold: 50,
    });

    assert.equal(result.latestZone.action, "dca_sell");
    assert.ok(result.latestZone.sellDegreePct >= 75);
    assert.ok(result.latestZone.reasonTags.includes("greed"));
    assert.ok(result.stats.buyHoldReturnPct > 0);
  });
});

describe("resolveUsIndexZoneAction", () => {
  it("holds when bottom and heat scores conflict within the conflict gap", () => {
    const config = {
      ...DEFAULT_US_INDEX_STRATEGY_CONFIG,
      bottomThreshold: 50,
      heatThreshold: 50,
      conflictGap: 15,
    };

    assert.equal(resolveUsIndexZoneAction(64, 56, config), "hold");
    assert.equal(resolveUsIndexZoneAction(76, 56, config), "dca_buy");
    assert.equal(resolveUsIndexZoneAction(52, 72, config), "dca_sell");
  });
});
