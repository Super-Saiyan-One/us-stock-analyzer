from fastapi import APIRouter, HTTPException
from datetime import datetime
import yfinance as yf
from utils import safe_num

router = APIRouter()


@router.get("/{symbol}/financials")
def get_financials(symbol: str):
    try:
        t = yf.Ticker(symbol)
        info = t.info
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "symbol": symbol.upper(),
        "longName": info.get("longName", symbol.upper()),
        "price": safe_num(info.get("currentPrice") or info.get("regularMarketPrice")),
        "previousClose": safe_num(info.get("previousClose") or info.get("regularMarketPreviousClose")),
        "marketCap": safe_num(info.get("marketCap")),
        "trailingPE": safe_num(info.get("trailingPE")),
        "forwardPE": safe_num(info.get("forwardPE")),
        "pegRatio": safe_num(info.get("pegRatio")),
        "priceToBook": safe_num(info.get("priceToBook")),
        "dividendYield": safe_num(info.get("dividendYield")),
        "grossMargins": safe_num(info.get("grossMargins")),
        "operatingMargins": safe_num(info.get("operatingMargins")),
        "profitMargins": safe_num(info.get("profitMargins")),
        "revenueGrowth": safe_num(info.get("revenueGrowth")),
        "earningsGrowth": safe_num(info.get("earningsGrowth")),
        "returnOnEquity": safe_num(info.get("returnOnEquity")),
        "debtToEquity": safe_num(info.get("debtToEquity")),
        "freeCashflow": safe_num(info.get("freeCashflow")),
        "enterpriseValue": safe_num(info.get("enterpriseValue")),
        "beta": safe_num(info.get("beta")),
        "fiftyTwoWeekHigh": safe_num(info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": safe_num(info.get("fiftyTwoWeekLow")),
        "volume": safe_num(info.get("volume")),
        "floatShares": safe_num(info.get("floatShares")),
        "sharesOutstanding": safe_num(info.get("sharesOutstanding")),
        "sharesShort": safe_num(info.get("sharesShort")),
        "sharesShortPriorMonth": safe_num(info.get("sharesShortPriorMonth")),
        "shortRatio": safe_num(info.get("shortRatio")),
        "shortPercentOfFloat": safe_num(info.get("shortPercentOfFloat")),
        "dateShortInterest": safe_num(info.get("dateShortInterest")),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "meta": {
            "source": "yfinance (Yahoo Finance)",
            "asOf": datetime.utcnow().date().isoformat(),
            "fetchedAt": datetime.utcnow().isoformat() + "Z",
            "frequency": "on-demand",
            "confidence": "high",
        },
    }


@router.get("/{symbol}/earnings")
def get_earnings(symbol: str):
    try:
        t = yf.Ticker(symbol)
        hist = t.earnings_history
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    if hist is None or hist.empty:
        return {"symbol": symbol.upper(), "earnings": []}

    records = []
    for _, row in hist.iterrows():
        records.append({
            "date": str(row.name) if hasattr(row, "name") else str(row.get("Earnings Date", "")),
            "epsActual": safe_num(row.get("Reported EPS")),
            "epsEstimate": safe_num(row.get("EPS Estimate")),
            "surprise": safe_num(row.get("Surprise(%)")),
        })

    return {"symbol": symbol.upper(), "earnings": records}


@router.get("/{symbol}/search")
def search_stock(symbol: str, q: str = ""):
    query = q or symbol
    try:
        results = yf.search(query, max_results=8)
    except Exception:
        results = {"quotes": []}

    quotes = results.get("quotes", [])
    return [
        {
            "symbol": item.get("symbol", ""),
            "name": item.get("longname") or item.get("shortname", ""),
            "exchange": item.get("exchange", ""),
            "type": item.get("quoteType", ""),
        }
        for item in quotes
        if item.get("symbol")
    ]
