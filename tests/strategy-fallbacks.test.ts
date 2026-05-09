import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getBtcStrategyFallback,
  getUsIndexStrategyFallback,
} from "../src/lib/strategy-fallbacks";

describe("strategy fallbacks", () => {
  it("bundles a usable BTC strategy snapshot", () => {
    const fallback = getBtcStrategyFallback();

    assert.ok(fallback.zonePoints.length > 0);
    assert.ok(fallback.indicators.length > 0);
    assert.ok(fallback.templates.length > 0);
    assert.equal(fallback.dataSource.isFallback, true);
    assert.equal(typeof fallback.latestZone.action, "string");
  });

  it("bundles usable US index strategy snapshots for SPY and QQQ", () => {
    for (const symbol of ["SPY", "QQQ"] as const) {
      const fallback = getUsIndexStrategyFallback(symbol);
      const buyDays = fallback.zonePoints.filter((point) => point.action === "dca_buy").length;
      const sellDays = fallback.zonePoints.filter((point) => point.action === "dca_sell").length;

      assert.equal(fallback.symbol, symbol);
      assert.equal(fallback.dataSource.isFallback, true);
      assert.ok(fallback.zonePoints.length > 0);
      assert.ok(buyDays > 0);
      assert.ok(sellDays > 0);
      assert.equal(fallback.config.qqqPeWarning, 38);
      assert.ok(fallback.currentGate.qqqPE);
      assert.ok(fallback.currentGate.sentiment);
    }
  });
});
