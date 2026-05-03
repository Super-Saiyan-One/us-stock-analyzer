import type { StockSignal, OptionsSummaryV2 } from "@/types/signals";

interface QuoteInput {
  price: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface FinancialsInput {
  trailingPE: number | null;
  forwardPE: number | null;
  beta: number | null;
}

interface OptionsInput {
  atmIV: number | null;
  putCallOIRatio: number | null;
  ivRvPremium: number | null;
  realizedVol20D: number | null;
  ivTermStructure: OptionsSummaryV2["ivTermStructure"];
  maxCallOIStrike: { strike: number } | null;
  nearDTE: number;
}

export function computeSignals(
  quote: QuoteInput | null,
  fin: FinancialsInput | null,
  opts: OptionsInput | null,
): StockSignal[] {
  const signals: StockSignal[] = [];

  if (quote) {
    const range = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
    if (range > 0) {
      const pctOfRange = ((quote.price - quote.fiftyTwoWeekLow) / range) * 100;

      if (pctOfRange > 90 && opts?.ivRvPremium != null && opts.ivRvPremium < 1.1) {
        signals.push({
          id: "trend-confirm", labelKey: "signals.trendConfirm", horizon: "1-5d",
          category: "trend", status: "risk-on", score: 70, confidence: "medium",
          evidence: [
            { indicator: "52W Range", currentValue: `${pctOfRange.toFixed(0)}%`, context: "Near highs" },
            { indicator: "IV/RV", currentValue: `${opts.ivRvPremium.toFixed(2)}x`, context: "IV not elevated" },
          ],
          invalidation: "Price drops below 20D MA",
        });
      } else if (
        pctOfRange > 90 &&
        opts?.putCallOIRatio != null && opts.putCallOIRatio < 0.3 &&
        opts?.ivRvPremium != null && opts.ivRvPremium > 1.2
      ) {
        signals.push({
          id: "crowded-chase", labelKey: "signals.crowdedChase", horizon: "1-5d",
          category: "positioning", status: "crowded", score: 65, confidence: "medium",
          evidence: [
            { indicator: "52W Range", currentValue: `${pctOfRange.toFixed(0)}%`, context: "Near highs" },
            { indicator: "P/C OI", currentValue: opts.putCallOIRatio.toFixed(2), context: "Very low put protection" },
            { indicator: "IV/RV", currentValue: `${opts.ivRvPremium.toFixed(2)}x`, context: "IV premium elevated" },
          ],
          invalidation: "Put/Call normalizes above 0.5",
        });
      } else if (pctOfRange > 85) {
        signals.push({
          id: "near-high", labelKey: "signals.near52wHigh", horizon: "1-5d",
          category: "trend", status: "neutral", score: 50, confidence: "high",
          evidence: [
            { indicator: "52W Range", currentValue: `${pctOfRange.toFixed(0)}%`, context: "" },
          ],
        });
      } else if (pctOfRange < 15) {
        signals.push({
          id: "near-low", labelKey: "signals.near52wLow", horizon: "1-5d",
          category: "trend", status: "fragile", score: 35, confidence: "high",
          evidence: [
            { indicator: "52W Range", currentValue: `${pctOfRange.toFixed(0)}%`, context: "" },
          ],
        });
      }
    }
  }

  if (fin?.forwardPE != null && fin?.trailingPE != null && fin.trailingPE > 0) {
    const ratio = fin.forwardPE / fin.trailingPE;
    if (ratio < 0.85) {
      signals.push({
        id: "earnings-expansion", labelKey: "signals.earningsExpansion", horizon: "1-3mo",
        category: "valuation", status: "risk-on", score: 60, confidence: "medium",
        evidence: [
          { indicator: "Fwd/Trail PE", currentValue: `${ratio.toFixed(2)}x`, context: `Fwd ${fin.forwardPE.toFixed(1)} vs Trail ${fin.trailingPE.toFixed(1)}` },
        ],
        invalidation: "Analyst estimates revised down",
      });
    } else if (ratio > 1.15) {
      signals.push({
        id: "earnings-contraction", labelKey: "signals.earningsContraction", horizon: "1-3mo",
        category: "valuation", status: "fragile", score: 35, confidence: "medium",
        evidence: [
          { indicator: "Fwd/Trail PE", currentValue: `${ratio.toFixed(2)}x`, context: `Fwd ${fin.forwardPE.toFixed(1)} vs Trail ${fin.trailingPE.toFixed(1)}` },
        ],
      });
    }
  }

  if (opts) {
    if (opts.ivRvPremium != null && opts.ivRvPremium > 1.3) {
      signals.push({
        id: "iv-rich", labelKey: "signals.ivRich", horizon: "1-5d",
        category: "volatility", status: "neutral", score: 50, confidence: "high",
        evidence: [
          { indicator: "IV/RV", currentValue: `${opts.ivRvPremium.toFixed(2)}x`, context: "Implied > realized" },
          { indicator: "ATM IV", currentValue: opts.atmIV ? `${(opts.atmIV * 100).toFixed(0)}%` : "N/A", context: "" },
          { indicator: "RV 20D", currentValue: opts.realizedVol20D ? `${(opts.realizedVol20D * 100).toFixed(0)}%` : "N/A", context: "" },
        ],
        invalidation: "Catalyst triggers realized vol spike",
      });
    }

    const nearIV = opts.ivTermStructure.find((p) => p.targetDTE === 7)?.atmIV;
    const farIV = opts.ivTermStructure.find((p) => p.targetDTE === 30)?.atmIV;
    if (nearIV != null && farIV != null && farIV > 0 && nearIV / farIV > 1.05) {
      signals.push({
        id: "iv-backwardation", labelKey: "signals.ivBackwardation", horizon: "1-5d",
        category: "volatility", status: "event-risk", score: 40, confidence: "high",
        evidence: [
          { indicator: "Near/Far IV", currentValue: `${(nearIV / farIV).toFixed(3)}`, context: `~${opts.nearDTE}D vs ~30D` },
        ],
        invalidation: "Event passes, near-term IV collapses",
      });
    }

    if (opts.maxCallOIStrike && quote && opts.nearDTE <= 7) {
      const dist = Math.abs(opts.maxCallOIStrike.strike - quote.price) / quote.price;
      if (dist < 0.02) {
        signals.push({
          id: "pinning-risk", labelKey: "signals.pinning", horizon: "intraday",
          category: "positioning", status: "neutral", score: 45, confidence: "low",
          evidence: [
            { indicator: "Call Wall", currentValue: `$${opts.maxCallOIStrike.strike}`, context: `${(dist * 100).toFixed(1)}% from price` },
            { indicator: "DTE", currentValue: `${opts.nearDTE}d`, context: "Near expiration" },
          ],
          invalidation: "Expiration passes",
        });
      }
    }
  }

  if (signals.length === 0) {
    signals.push({
      id: "no-signals", labelKey: "signals.noSignals", horizon: "1-5d",
      category: "trend", status: "neutral", score: 50, confidence: "high",
      evidence: [],
    });
  }

  return signals.sort((a, b) => a.score - b.score);
}
