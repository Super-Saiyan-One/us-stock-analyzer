from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import yfinance as yf
import numpy as np
from utils import safe_num

router = APIRouter()


class BatchRequest(BaseModel):
    symbols: list[str]


@router.post("/batch/screen")
def batch_screen(req: BatchRequest):
    symbols = [s.upper().strip() for s in req.symbols if s.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No symbols provided")
    if len(symbols) > 100:
        raise HTTPException(status_code=400, detail="Max 100 symbols per batch")

    try:
        hist = yf.download(
            symbols,
            period="1y",
            auto_adjust=True,
            threads=True,
            progress=False,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"yfinance download failed: {e}")

    results = []

    for sym in symbols:
        try:
            if sym not in hist["Close"].columns:
                continue
            close = hist["Close"][sym]
            vol = hist["Volume"][sym]

            close = close.dropna()
            vol = vol.dropna()

            if len(close) < 5:
                continue

            current_price = float(close.iloc[-1])
            prev_close = float(close.iloc[-2]) if len(close) >= 2 else current_price

            price_5d_ago = float(close.iloc[-6]) if len(close) >= 6 else current_price
            price_20d_ago = float(close.iloc[-21]) if len(close) >= 21 else current_price

            high_52w = float(close.max())
            low_52w = float(close.min())

            current_vol = float(vol.iloc[-1]) if len(vol) > 0 else 0
            avg_vol_20d = float(vol.tail(20).mean()) if len(vol) >= 20 else float(vol.mean())

            change_1d = ((current_price - prev_close) / prev_close * 100) if prev_close else 0
            change_5d = ((current_price - price_5d_ago) / price_5d_ago * 100) if price_5d_ago else 0
            change_20d = ((current_price - price_20d_ago) / price_20d_ago * 100) if price_20d_ago else 0

            entry = {
                "symbol": sym,
                "price": safe_num(current_price),
                "previousClose": safe_num(prev_close),
                "change1D": safe_num(change_1d),
                "change5D": safe_num(change_5d),
                "change20D": safe_num(change_20d),
                "fiftyTwoWeekHigh": safe_num(high_52w),
                "fiftyTwoWeekLow": safe_num(low_52w),
                "volume": safe_num(current_vol),
                "avgVolume20D": safe_num(avg_vol_20d),
                "priceHistory": [
                    {"date": d.strftime("%Y-%m-%d"), "close": safe_num(float(v))}
                    for d, v in list(close.tail(25).items())
                ],
            }
            results.append(entry)

        except Exception:
            continue

    return {
        "results": results,
        "count": len(results),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/batch/fundamentals")
def batch_fundamentals(req: BatchRequest):
    symbols = [s.upper().strip() for s in req.symbols if s.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No symbols provided")
    if len(symbols) > 50:
        raise HTTPException(status_code=400, detail="Max 50 symbols per batch")

    results = []
    for sym in symbols:
        try:
            t = yf.Ticker(sym)
            info = t.info
            results.append({
                "symbol": sym,
                "name": info.get("longName") or info.get("shortName") or sym,
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "marketCap": safe_num(info.get("marketCap")),
                "trailingPE": safe_num(info.get("trailingPE")),
                "forwardPE": safe_num(info.get("forwardPE")),
                "pegRatio": safe_num(info.get("pegRatio")),
                "revenueGrowth": safe_num(info.get("revenueGrowth")),
                "earningsGrowth": safe_num(info.get("earningsGrowth")),
                "profitMargins": safe_num(info.get("profitMargins")),
                "returnOnEquity": safe_num(info.get("returnOnEquity")),
                "debtToEquity": safe_num(info.get("debtToEquity")),
                "beta": safe_num(info.get("beta")),
                "shortPercentOfFloat": safe_num(info.get("shortPercentOfFloat")),
                "shortRatio": safe_num(info.get("shortRatio")),
            })
        except Exception:
            continue

    return {
        "results": results,
        "count": len(results),
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/universe/sp500")
def get_sp500():
    try:
        import pandas as pd
        table = pd.read_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")
        df = table[0]
        symbols = df["Symbol"].str.replace(".", "-", regex=False).tolist()
        sectors = df.set_index("Symbol")["GICS Sector"].to_dict()
        names = df.set_index("Symbol")["Security"].to_dict()
        return {
            "symbols": symbols,
            "sectors": {k.replace(".", "-"): v for k, v in sectors.items()},
            "names": {k.replace(".", "-"): v for k, v in names.items()},
            "count": len(symbols),
            "source": "Wikipedia",
            "fetchedAt": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch SP500 list: {e}")
