from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
import math
import numpy as np
from datetime import datetime, date
from utils import safe_num

router = APIRouter()


def _dte(exp_str: str) -> int:
    try:
        exp = datetime.strptime(exp_str, "%Y-%m-%d").date()
        return (exp - date.today()).days
    except Exception:
        return 999


def _atm_iv(df, price):
    if df is None or df.empty or not price or price <= 0:
        return None
    df = df.copy()
    df["_dist"] = (df["strike"] - price).abs()
    closest = df.loc[df["_dist"].idxmin()]
    return safe_num(closest.get("impliedVolatility"))


def _col_sum(df, col):
    if df is None or df.empty or col not in df.columns:
        return 0
    return float(df[col].fillna(0).sum())


def _max_oi_strike(df):
    if df is None or df.empty:
        return None
    idx = df["openInterest"].fillna(0).idxmax()
    row = df.loc[idx]
    return {"strike": safe_num(row["strike"]), "oi": safe_num(row["openInterest"])}


def _get_log_returns(ticker):
    """Fetch 3mo daily history once, return log returns Series."""
    try:
        hist = ticker.history(period="3mo", interval="1d")
        if hist is None or len(hist) < 5:
            return None
        closes = hist["Close"].dropna()
        if len(closes) < 5:
            return None
        return np.log(closes / closes.shift(1)).dropna()
    except Exception:
        return None


def _realized_vol_from_returns(log_returns, window=20):
    if log_returns is None or len(log_returns) < window:
        return None
    rv = float(log_returns.tail(window).std() * math.sqrt(252))
    return safe_num(rv)


def _max_oi_strike_near_money(df, price, pct_range=0.2):
    """Max OI strike within ±pct_range of current price."""
    if df is None or df.empty or not price or price <= 0:
        return None
    near = df[(df["strike"] >= price * (1 - pct_range)) & (df["strike"] <= price * (1 + pct_range))].copy()
    if near.empty:
        return None
    idx = near["openInterest"].fillna(0).idxmax()
    row = near.loc[idx]
    return {"strike": safe_num(row["strike"]), "oi": safe_num(row["openInterest"])}


@router.get("/{symbol}/options/summary")
def get_options_summary(symbol: str):
    try:
        t = yf.Ticker(symbol)
        exps = list(t.options)
        if not exps:
            return {"symbol": symbol.upper(), "hasOptions": False}

        info = t.info
        price = safe_num(info.get("currentPrice") or info.get("regularMarketPrice")) or 0

        # DTE bucketing: find expirations closest to 7D, 30D, 60D
        dte_targets = [7, 30, 60]
        exp_with_dte = [(exp, _dte(exp)) for exp in exps]
        exp_with_dte = [(exp, dte) for exp, dte in exp_with_dte if dte >= 0]

        def find_nearest_exp(target_dte):
            if not exp_with_dte:
                return None
            return min(exp_with_dte, key=lambda x: abs(x[1] - target_dte))

        buckets = {}
        for target in dte_targets:
            match = find_nearest_exp(target)
            if match:
                buckets[target] = {"expiration": match[0], "dte": match[1]}

        # Use nearest expiration for primary metrics
        near = exp_with_dte[0] if exp_with_dte else None
        if not near:
            return {"symbol": symbol.upper(), "hasOptions": True, "underlyingPrice": price}

        near_exp, near_dte = near
        chain = t.option_chain(near_exp)
        calls, puts = chain.calls, chain.puts

        call_oi = _col_sum(calls, "openInterest")
        put_oi = _col_sum(puts, "openInterest")
        call_vol = _col_sum(calls, "volume")
        put_vol = _col_sum(puts, "volume")

        pc_oi_ratio = safe_num(put_oi / call_oi) if call_oi > 0 else None
        pc_vol_ratio = safe_num(put_vol / call_vol) if call_vol > 0 else None

        atm_call_iv = _atm_iv(calls, price)
        atm_put_iv = _atm_iv(puts, price)
        atm_iv_avg = None
        if atm_call_iv is not None and atm_put_iv is not None:
            atm_iv_avg = (atm_call_iv + atm_put_iv) / 2
        elif atm_call_iv is not None:
            atm_iv_avg = atm_call_iv
        elif atm_put_iv is not None:
            atm_iv_avg = atm_put_iv

        # IV term structure by DTE buckets with quality indicator
        iv_term = []
        used_expirations = set()
        for target in dte_targets:
            bucket = buckets.get(target)
            if not bucket:
                continue
            dte_diff = abs(bucket["dte"] - target)
            is_duplicate = bucket["expiration"] in used_expirations
            quality = "duplicate" if is_duplicate else ("exact" if dte_diff <= 3 else "approximate")
            used_expirations.add(bucket["expiration"])
            try:
                bc = t.option_chain(bucket["expiration"])
                c_iv = _atm_iv(bc.calls, price)
                p_iv = _atm_iv(bc.puts, price)
                avg = None
                if c_iv is not None and p_iv is not None:
                    avg = (c_iv + p_iv) / 2
                elif c_iv is not None:
                    avg = c_iv
                elif p_iv is not None:
                    avg = p_iv
                iv_term.append({
                    "targetDTE": target,
                    "actualDTE": bucket["dte"],
                    "expiration": bucket["expiration"],
                    "atmIV": safe_num(avg),
                    "quality": quality,
                })
            except Exception:
                pass

        # Realized volatility — single history fetch for both windows
        log_returns = _get_log_returns(t)
        rv_20d = _realized_vol_from_returns(log_returns, 20)
        rv_60d = _realized_vol_from_returns(log_returns, 60)

        # IV/RV premium
        iv_rv_premium = None
        if atm_iv_avg is not None and rv_20d is not None and rv_20d > 0:
            iv_rv_premium = safe_num(atm_iv_avg / rv_20d)

        now_str = datetime.utcnow().isoformat() + "Z"

        return {
            "symbol": symbol.upper(),
            "hasOptions": True,
            "underlyingPrice": price,
            "nearExpiration": near_exp,
            "nearDTE": near_dte,
            "putCallOIRatio": pc_oi_ratio,
            "putCallVolumeRatio": pc_vol_ratio,
            "totalCallOI": safe_num(call_oi),
            "totalPutOI": safe_num(put_oi),
            "totalCallVolume": safe_num(call_vol),
            "totalPutVolume": safe_num(put_vol),
            "atmIV": safe_num(atm_iv_avg),
            "atmCallIV": atm_call_iv,
            "atmPutIV": atm_put_iv,
            "ivTermStructure": iv_term,
            "realizedVol20D": rv_20d,
            "realizedVol60D": rv_60d,
            "ivRvPremium": iv_rv_premium,
            "maxCallOIStrike": _max_oi_strike_near_money(calls, price),
            "maxPutOIStrike": _max_oi_strike_near_money(puts, price),
            "meta": {
                "source": "yfinance (Yahoo Finance)",
                "asOf": datetime.utcnow().date().isoformat(),
                "fetchedAt": now_str,
                "frequency": "on-demand",
                "releaseLag": "15-20 min during market hours",
                "confidence": "medium",
                "note": "OI data is not real-time OPRA; may reflect prior day settlement",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{symbol}/options/expirations")
def get_expirations(symbol: str):
    try:
        t = yf.Ticker(symbol)
        expirations = list(t.options)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"symbol": symbol.upper(), "expirations": expirations}


@router.get("/{symbol}/options/chain")
def get_chain(symbol: str, expiration: str = Query(default="")):
    try:
        t = yf.Ticker(symbol)
        if not expiration:
            exps = t.options
            if not exps:
                return {"underlyingPrice": 0, "expirationDate": "", "calls": [], "puts": []}
            expiration = exps[0]
        chain = t.option_chain(expiration)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    info = t.info
    underlying_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0

    def parse_contracts(df):
        if df is None or df.empty:
            return []
        records = []
        for _, row in df.iterrows():
            records.append({
                "contractSymbol": row.get("contractSymbol", ""),
                "strike": safe_num(row.get("strike")),
                "lastPrice": safe_num(row.get("lastPrice")),
                "bid": safe_num(row.get("bid")),
                "ask": safe_num(row.get("ask")),
                "change": safe_num(row.get("change")),
                "percentChange": safe_num(row.get("percentChange")),
                "volume": safe_num(row.get("volume")),
                "openInterest": safe_num(row.get("openInterest")) or 0,
                "impliedVolatility": safe_num(row.get("impliedVolatility")),
                "inTheMoney": bool(row.get("inTheMoney", False)),
            })
        return records

    return {
        "underlyingPrice": safe_num(underlying_price) or 0,
        "expirationDate": expiration,
        "calls": parse_contracts(chain.calls),
        "puts": parse_contracts(chain.puts),
    }
