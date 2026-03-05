"""
BKIG Terminal — Deep Analysis: high-end visualization and risk assessment.
Data module only. Fetches FMP: Financial Scores (Altman Z, Piotroski), Insider Trading,
Analyst Estimates, Price Targets. Used by terminal section view-deep-analysis via API.
"""
import os
import re
import requests

FMP_BASE_V3 = "https://financialmodelingprep.com/api/v3"
FMP_BASE_V4 = "https://financialmodelingprep.com/api/v4"


def _fmp_get(base, path, params=None):
    api_key = os.environ.get("FMP_API_KEY", "").strip()
    if not api_key:
        return None
    params = dict(params or {})
    params["apikey"] = api_key
    try:
        r = requests.get(base + path, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def _safe_float(val, default=None):
    if val is None:
        return default
    if isinstance(val, str):
        val = val.strip().replace(",", "")
        if not val or val.upper() in ("N/A", "NA", "-", "--", "null"):
            return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def fetch_financial_scores(ticker):
    """Altman Z-Score, Piotroski F-Score. Try v4/score then stable/financial-scores."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return {}
    # v4
    data = _fmp_get(FMP_BASE_V4, "/score", {"symbol": sym})
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
        altman = _safe_float(row.get("altmanZScore") or row.get("altmanZ") or row.get("zScore"))
        piotroski = _safe_float(row.get("piotroskiScore") or row.get("piotroskiFScore") or row.get("fScore"))
        return {"altmanZScore": altman, "piotroskiScore": piotroski}
    # stable fallback
    data = _fmp_get("https://financialmodelingprep.com/stable", "/financial-scores", {"symbol": sym})
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
        altman = _safe_float(row.get("altmanZScore") or row.get("altmanZ") or row.get("zScore"))
        piotroski = _safe_float(row.get("piotroskiScore") or row.get("piotroskiFScore") or row.get("fScore"))
        return {"altmanZScore": altman, "piotroskiScore": piotroski}
    return {}


def fetch_insider_trading(ticker, limit=20):
    """Recent insider transactions. v4/insider-trading then stable search."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return []
    data = _fmp_get(FMP_BASE_V4, "/insider-trading", {"symbol": sym, "limit": limit})
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            date_val = row.get("filingDate") or row.get("transactionDate") or row.get("date") or ""
            name = row.get("reportingName") or row.get("reportingOwner") or row.get("insiderName") or "—"
            raw_type = (row.get("transactionType") or row.get("transactionCode") or str(row.get("type", "")) or "").upper()
            if "P" in raw_type or "PURCHASE" in raw_type or "BUY" in raw_type:
                t_type = "Buy"
            elif "S" in raw_type or "SALE" in raw_type or "D" in raw_type or "DISPOS" in raw_type or "SELL" in raw_type:
                t_type = "Sell"
            else:
                t_type = raw_type or "—"
            shares = _safe_float(row.get("securitiesTransacted") or row.get("numberOfShares") or row.get("shares"))
            price = _safe_float(row.get("price") or row.get("valuePerShare"))
            value = _safe_float(row.get("value") or row.get("valueReported") or row.get("totalValue"))
            if value is None and shares is not None and price is not None:
                value = shares * price
            title = row.get("reportingTitle") or row.get("ownerTitle") or row.get("title") or "—"
            date_str = date_val[:10] if isinstance(date_val, str) and len(date_val) >= 10 else str(date_val)
            out.append({
                "date": date_str,
                "name": name,
                "position": title,
                "transactionType": t_type,
                "value": int(value) if value is not None else None,
            })
        return out
    # stable fallback
    data = _fmp_get("https://financialmodelingprep.com/stable", "/insider-trading/search", {"symbol": sym, "page": 0, "limit": limit})
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            date_val = row.get("filingDate") or row.get("transactionDate") or row.get("date") or ""
            name = row.get("reportingName") or row.get("reportingOwner") or row.get("insiderName") or "—"
            raw_type = (row.get("transactionType") or row.get("transactionCode") or str(row.get("type", "")) or "").upper()
            if "P" in raw_type or "PURCHASE" in raw_type or "BUY" in raw_type:
                t_type = "Buy"
            elif "S" in raw_type or "SALE" in raw_type or "D" in raw_type or "DISPOS" in raw_type or "SELL" in raw_type:
                t_type = "Sell"
            else:
                t_type = raw_type or "—"
            value = _safe_float(row.get("value") or row.get("valueReported") or row.get("totalValue"))
            title = row.get("reportingTitle") or row.get("ownerTitle") or row.get("title") or "—"
            date_str = date_val[:10] if isinstance(date_val, str) and len(date_val) >= 10 else str(date_val)
            out.append({
                "date": date_str,
                "name": name,
                "position": title,
                "transactionType": t_type,
                "value": int(value) if value is not None else None,
            })
        return out
    return []


def fetch_analyst_estimates(ticker, limit=30):
    """Revenue/EPS consensus. Tries v3 with period=annual, then stable, then fmp_api fallback."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return []

    def _norm_year(period):
        if not period:
            return ""
        s = str(period).strip()
        if len(s) >= 4 and s[:4].isdigit():
            return s[:4]
        return s

    def _row_to_est(row, rev_key_order, eps_key_order):
        rev = None
        for k in rev_key_order:
            rev = _safe_float(row.get(k))
            if rev is not None:
                break
        eps = None
        for k in eps_key_order:
            eps = _safe_float(row.get(k))
            if eps is not None:
                break
        period = _norm_year(row.get("date") or row.get("period") or row.get("fiscalDateEnding") or "")
        return period, rev, eps

    # 1) v3 analyst-estimates (often returns quarterly; we take annual or use date year)
    data = _fmp_get(FMP_BASE_V3, f"/analyst-estimates/{sym}", {"limit": limit})
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            period, rev, eps = _row_to_est(
                row,
                ("estimatedRevenueAvg", "estimatedRevenue", "revenueEstimate", "revenue"),
                ("estimatedEpsAvg", "estimatedEps", "epsEstimate", "eps"),
            )
            if period:
                out.append({"period": period, "estimatedRevenue": rev, "estimatedEps": eps})
        if out:
            return out

    # 2) stable analyst-estimates (period=annual)
    data = _fmp_get("https://financialmodelingprep.com/stable", "/analyst-estimates", {"symbol": sym, "period": "annual", "limit": limit})
    unwrapped = data if isinstance(data, list) else (data.get("data") if isinstance(data, dict) else None)
    if isinstance(unwrapped, list) and unwrapped:
        out = []
        for row in unwrapped[:limit]:
            if not isinstance(row, dict):
                continue
            period, rev, eps = _row_to_est(
                row,
                ("estimatedRevenue", "revenueEstimate", "revenue"),
                ("estimatedEps", "epsEstimate", "eps"),
            )
            if period:
                out.append({"period": period, "estimatedRevenue": rev, "estimatedEps": eps})
        if out:
            return out

    # 3) fmp_api fallback (same FMP key, different client)
    try:
        from fmp_api import get_analyst_estimates
        raw = get_analyst_estimates(sym, limit=limit)
        if isinstance(raw, list) and raw:
            out = []
            for row in raw[:limit]:
                if not isinstance(row, dict):
                    continue
                period = _norm_year(row.get("period") or row.get("date") or "")
                rev = row.get("estimatedRevenue")  # may already be in B
                eps = _safe_float(row.get("estimatedEps"))
                if rev is not None and abs(rev) < 1000:
                    rev = rev * 1e9  # assume stored in billions
                out.append({"period": period, "estimatedRevenue": _safe_float(rev), "estimatedEps": eps})
            if out:
                return out
    except Exception:
        pass
    return []


def fetch_quote(ticker):
    """Current price from FMP v3 quote."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return None
    data = _fmp_get(FMP_BASE_V3, f"/quote/{sym}", {})
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
        return _safe_float(row.get("price") or row.get("Price"))
    return None


def _pick_int(d, *keys):
    """First non-None int from dict d for given keys."""
    if not isinstance(d, dict):
        return 0
    for k in keys:
        if k in d and d[k] is not None:
            v = _safe_float(d[k], None)
            if v is not None:
                return max(0, int(v))
    return 0


def fetch_analyst_recommendations(ticker):
    """Analyst stock recommendations: latest date breakdown and dominant sentiment.
    Tries v3 analyst-stock-recommendations (counts per date), then aggregates by grade if needed.
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return {}
    data = _fmp_get(FMP_BASE_V3, f"/analyst-stock-recommendations/{sym}", {})
    if not isinstance(data, list) or not data:
        return {}
    # FMP can return: (1) one row per date with strongBuy, buy, hold, sell, strongSell counts, or
    # (2) one row per action with newGrade, previousGrade, gradingCompany, etc.
    row = data[0]
    if not isinstance(row, dict):
        return {}
    # Try count-style keys (various FMP naming conventions)
    strong_buy = _pick_int(row, "strongBuy", "strong_buy", "analystRatingsStrongBuy", "analystRatingsstrongBuy")
    buy = _pick_int(row, "buy", "buyRecommendations", "analystRatingsBuy", "analystRatingsbuy")
    hold = _pick_int(row, "hold", "holdRecommendations", "analystRatingsHold", "analystRatingshold")
    sell = _pick_int(row, "sell", "sellRecommendations", "analystRatingsSell", "analystRatingssell")
    strong_sell = _pick_int(row, "strongSell", "strong_sell", "analystRatingsStrongSell", "analystRatingsstrongSell")
    total = strong_buy + buy + hold + sell + strong_sell
    # If no count-style data, aggregate by newGrade from all rows
    if total == 0 and len(data) > 0:
        grades = {"Strong Buy": 0, "Buy": 0, "Hold": 0, "Sell": 0, "Strong Sell": 0}
        for r in data:
            if not isinstance(r, dict):
                continue
            g = (r.get("newGrade") or r.get("grade") or r.get("recommendation") or "").strip()
            if not g:
                continue
            g = g.lower()
            if "strong" in g and "buy" in g:
                grades["Strong Buy"] += 1
            elif "strong" in g and "sell" in g:
                grades["Strong Sell"] += 1
            elif "buy" in g:
                grades["Buy"] += 1
            elif "sell" in g:
                grades["Sell"] += 1
            else:
                grades["Hold"] += 1
        strong_buy = grades["Strong Buy"]
        buy = grades["Buy"]
        hold = grades["Hold"]
        sell = grades["Sell"]
        strong_sell = grades["Strong Sell"]
        total = strong_buy + buy + hold + sell + strong_sell
    if total == 0:
        dominant = "Hold"
    elif strong_buy >= max(buy, hold, sell, strong_sell):
        dominant = "Strong Buy"
    elif strong_sell >= max(strong_buy, buy, hold, sell):
        dominant = "Strong Sell"
    elif buy >= max(strong_buy, hold, sell, strong_sell):
        dominant = "Buy"
    elif sell >= max(strong_buy, buy, hold, strong_sell):
        dominant = "Sell"
    else:
        dominant = "Hold"
    return {
        "strongBuy": strong_buy,
        "buy": buy,
        "hold": hold,
        "sell": sell,
        "strongSell": strong_sell,
        "dominant": dominant,
        "date": row.get("date") or row.get("period") or "",
    }


def fetch_dcf_inputs(ticker):
    """
    Fetch inputs for DCF calculator: latest FCF, WACC estimate, shares outstanding.
    Returns dict: fcf (dollars), wacc (decimal e.g. 0.08), shares (count).
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return {"fcf": None, "wacc": None, "shares": None}
    out = {"fcf": None, "wacc": None, "shares": None}
    # Latest FCF from cash-flow-statement
    cash = _fmp_get(FMP_BASE_V3, f"/cash-flow-statement/{sym}", {"period": "annual", "limit": 1})
    if isinstance(cash, list) and cash and isinstance(cash[0], dict):
        row = cash[0]
        fcf = _safe_float(
            row.get("freeCashFlow") or row.get("operatingCashFlow")
        )
        if fcf is not None:
            out["fcf"] = fcf
    # Key metrics: WACC and shares
    km = _fmp_get(FMP_BASE_V3, f"/key-metrics/{sym}", {"period": "annual", "limit": 1})
    if isinstance(km, list) and km and isinstance(km[0], dict):
        m = km[0]
        wacc = _safe_float(
            m.get("weightedAverageCostOfCapital") or m.get("wacc")
        )
        if wacc is not None:
            if wacc > 1:
                wacc = wacc / 100.0
            out["wacc"] = round(wacc, 4)
        sh = _safe_float(
            m.get("weightedAverageSharesOutstanding") or m.get("weightedAverageShsOut")
        )
        if sh is not None and sh > 0:
            out["shares"] = int(sh)
    # Shares fallback: market cap / price
    if out["shares"] is None:
        price = fetch_quote(sym)
        profile = _fmp_get(FMP_BASE_V3, f"/profile/{sym}", {})
        if isinstance(profile, list) and profile and isinstance(profile[0], dict):
            mc = _safe_float(profile[0].get("mktCap") or profile[0].get("marketCap"))
            if mc is not None and price is not None and price > 0:
                out["shares"] = int(mc / price)
    return out


def fetch_price_target_consensus(ticker):
    """Price target high/low/avg/consensus."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return {}
    data = _fmp_get(FMP_BASE_V4, "/price-target-consensus", {"symbol": sym})
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
        return {
            "high": _safe_float(row.get("high") or row.get("targetHigh")),
            "low": _safe_float(row.get("low") or row.get("targetLow")),
            "average": _safe_float(row.get("average") or row.get("targetMean") or row.get("mean")),
            "consensus": _safe_float(row.get("consensus") or row.get("targetMedian") or row.get("median")),
        }
    data = _fmp_get("https://financialmodelingprep.com/stable", "/price-target-consensus", {"symbol": sym})
    if isinstance(data, list) and data and isinstance(data[0], dict):
        row = data[0]
        return {
            "high": _safe_float(row.get("high") or row.get("targetHigh")),
            "low": _safe_float(row.get("low") or row.get("targetLow")),
            "average": _safe_float(row.get("average") or row.get("targetMean") or row.get("mean")),
            "consensus": _safe_float(row.get("consensus") or row.get("targetMedian") or row.get("median")),
        }
    return {}


def fetch_historical_revenue(ticker, limit=3):
    """Past years revenue from income statement for chart."""
    from fmp_api import get_income_statement
    statements = get_income_statement((ticker or "").strip().upper(), limit=limit)
    if not statements:
        return []
    out = []
    for row in statements:
        period = row.get("calendarYear") or row.get("date") or row.get("fiscalDateEnding") or ""
        if isinstance(period, str) and len(period) >= 4:
            period = period[:4]
        rev = _safe_float(row.get("revenue") or row.get("Revenue"))
        if rev is not None:
            out.append({"period": str(period), "revenue": rev})
    return out


def _fetch_historical_income_for_chart(ticker, limit=15):
    """Historical revenue and EPS from income statement (for consensus chart). Uses v3 then fmp_api."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return []

    def _norm_year(period):
        if not period:
            return ""
        s = str(period).strip()
        if len(s) >= 4 and s[:4].isdigit():
            return s[:4]
        return s

    data = _fmp_get(FMP_BASE_V3, f"/income-statement/{sym}", {"period": "annual", "limit": limit})
    if isinstance(data, list) and data:
        out = []
        for row in data:
            if not isinstance(row, dict):
                continue
            period = _norm_year(row.get("calendarYear") or row.get("date") or row.get("fiscalDateEnding") or "")
            if not period:
                continue
            rev = _safe_float(row.get("revenue") or row.get("Revenue"))
            eps = _safe_float(row.get("eps") or row.get("netIncomePerShare"))
            out.append({"period": period, "revenue": rev, "eps": eps})
        if out:
            return out

    try:
        from fmp_api import get_income_statement
        statements = get_income_statement(sym, limit=limit)
        if isinstance(statements, list) and statements:
            out = []
            for row in statements:
                if not isinstance(row, dict):
                    continue
                period = _norm_year(row.get("calendarYear") or row.get("date") or row.get("fiscalDateEnding") or "")
                if not period:
                    continue
                rev = _safe_float(row.get("revenue") or row.get("Revenue"))
                eps = _safe_float(row.get("eps") or row.get("netIncomePerShare"))
                out.append({"period": period, "revenue": rev, "eps": eps})
            if out:
                return out
    except Exception:
        pass
    return []


def _safe_div(numerator, denominator, default=None):
    """Division helper that avoids ZeroDivisionError and None propagation."""
    num = _safe_float(numerator, None)
    den = _safe_float(denominator, None)
    if num is None or den in (None, 0):
        return default
    try:
        return num / den
    except ZeroDivisionError:
        return default


def _pick_first(d, *keys):
    """Return the first non-None value for the given keys from dict d."""
    if not isinstance(d, dict):
        return None
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def _fetch_core_statements_annual(ticker, limit=2):
    """
    Fetch the core annual financial statements needed for forensic metrics.
    Returns (income_statements, balance_sheets, cash_flows) or (None, None, None) on failure.
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return None, None, None

    income = _fmp_get(FMP_BASE_V3, f"/income-statement/{sym}", {"period": "annual", "limit": limit})
    balance = _fmp_get(FMP_BASE_V3, f"/balance-sheet-statement/{sym}", {"period": "annual", "limit": limit})
    cash = _fmp_get(FMP_BASE_V3, f"/cash-flow-statement/{sym}", {"period": "annual", "limit": limit})

    if not (isinstance(income, list) and len(income) >= 2):
        return None, None, None
    if not (isinstance(balance, list) and len(balance) >= 2):
        return None, None, None
    if not (isinstance(cash, list) and len(cash) >= 2):
        return None, None, None

    return income, balance, cash


def calculate_forensic_metrics(ticker):
    """
    Calculate Beneish M-Score and Sloan Ratio for the given ticker.

    Returns a dict:
    {
        "ticker": "AAPL",
        "beneish": {
            "m_score": float | None,
            "status": "Risk" | "Safe" | "Insufficient Data",
            "label": "High Probability of Manipulation" | "Normal" | "Insufficient Data",
            "components": {DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA}
        },
        "sloan": {
            "ratio": float | None,
            "status": "Risk" | "Safe" | "Insufficient Data",
            "label": "Poor Earnings Quality" | "Normal" | "Low Accruals" | "Insufficient Data",
            "net_income": float | None,
            "operating_cash_flow": float | None,
            "average_total_assets": float | None,
        },
    }
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return {
            "ticker": "",
            "beneish": {
                "m_score": None,
                "status": "Insufficient Data",
                "label": "Insufficient Data",
                "components": {},
            },
            "sloan": {
                "ratio": None,
                "status": "Insufficient Data",
                "label": "Insufficient Data",
                "net_income": None,
                "operating_cash_flow": None,
                "average_total_assets": None,
            },
        }

    income, balance, cash = _fetch_core_statements_annual(sym, limit=2)
    if income is None or balance is None or cash is None:
        return {
            "ticker": sym,
            "beneish": {
                "m_score": None,
                "status": "Insufficient Data",
                "label": "Insufficient Data",
                "components": {},
            },
            "sloan": {
                "ratio": None,
                "status": "Insufficient Data",
                "label": "Insufficient Data",
                "net_income": None,
                "operating_cash_flow": None,
                "average_total_assets": None,
            },
        }

    # Use latest year as t (index 0) and previous year as t-1 (index 1)
    inc_t, inc_t1 = income[0], income[1]
    bal_t, bal_t1 = balance[0], balance[1]
    cf_t, cf_t1 = cash[0], cash[1]

    # --- Common fields ---
    # Sales / Revenue
    sales_t = _pick_first(inc_t, "revenue", "sales", "totalRevenue")
    sales_t1 = _pick_first(inc_t1, "revenue", "sales", "totalRevenue")

    # COGS
    cogs_t = _pick_first(inc_t, "costOfRevenue", "costOfGoodsSold", "costOfSales")
    cogs_t1 = _pick_first(inc_t1, "costOfRevenue", "costOfGoodsSold", "costOfSales")

    # Net receivables (from balance sheet)
    rec_t = _pick_first(bal_t, "netReceivables", "accountsReceivables", "receivables")
    rec_t1 = _pick_first(bal_t1, "netReceivables", "accountsReceivables", "receivables")

    # Current assets and PP&E
    ca_t = _pick_first(bal_t, "totalCurrentAssets", "currentAssets")
    ca_t1 = _pick_first(bal_t1, "totalCurrentAssets", "currentAssets")
    ppe_t = _pick_first(bal_t, "propertyPlantEquipmentNet", "ppnenet", "netPPE")
    ppe_t1 = _pick_first(bal_t1, "propertyPlantEquipmentNet", "ppnenet", "netPPE")

    # Marketable securities / short-term investments (proxy)
    sec_t = _pick_first(
        bal_t,
        "shortTermInvestments",
        "cashAndShortTermInvestments",
        "marketableSecurities",
    )
    sec_t1 = _pick_first(
        bal_t1,
        "shortTermInvestments",
        "cashAndShortTermInvestments",
        "marketableSecurities",
    )

    # Total assets
    ta_t = _pick_first(bal_t, "totalAssets")
    ta_t1 = _pick_first(bal_t1, "totalAssets")

    # Current liabilities and long-term debt
    cl_t = _pick_first(bal_t, "totalCurrentLiabilities", "currentLiabilities")
    cl_t1 = _pick_first(bal_t1, "totalCurrentLiabilities", "currentLiabilities")
    ltd_t = _pick_first(bal_t, "longTermDebt", "longTermDebtTotal")
    ltd_t1 = _pick_first(bal_t1, "longTermDebt", "longTermDebtTotal")

    # SGA expense
    sga_t = _pick_first(
        inc_t,
        "sellingGeneralAndAdministrativeExpenses",
        "sellingGeneralAdministrative",
        "sgaExpense",
    )
    sga_t1 = _pick_first(
        inc_t1,
        "sellingGeneralAndAdministrativeExpenses",
        "sellingGeneralAdministrative",
        "sgaExpense",
    )

    # Depreciation (usually from cash flow)
    dep_t = _pick_first(cf_t, "depreciationAndAmortization", "depreciation")
    dep_t1 = _pick_first(cf_t1, "depreciationAndAmortization", "depreciation")

    # Income from continuing operations / net income
    ico_t = _pick_first(
        inc_t,
        "netIncomeFromContinuingOperations",
        "incomeFromContinuingOperations",
        "netIncome",
    )

    # Cash flow from operations
    cfo_t = _pick_first(
        cf_t,
        "netCashProvidedByOperatingActivities",
        "operatingCashFlow",
        "cashFlowFromOperations",
    )

    # --- Beneish indices ---
    DSRI = _safe_div(_safe_div(rec_t, sales_t), _safe_div(rec_t1, sales_t1))

    gross_margin_t = _safe_div(
        _safe_float(sales_t, 0) - _safe_float(cogs_t, 0), sales_t
    )
    gross_margin_t1 = _safe_div(
        _safe_float(sales_t1, 0) - _safe_float(cogs_t1, 0), sales_t1
    )
    GMI = _safe_div(gross_margin_t1, gross_margin_t)

    asset_quality_t = None
    asset_quality_t1 = None
    if ta_t:
        asset_quality_t = 1.0 - _safe_div(
            _safe_float(ca_t, 0) + _safe_float(ppe_t, 0) + _safe_float(sec_t, 0),
            ta_t,
        )
    if ta_t1:
        asset_quality_t1 = 1.0 - _safe_div(
            _safe_float(ca_t1, 0) + _safe_float(ppe_t1, 0) + _safe_float(sec_t1, 0),
            ta_t1,
        )
    AQI = _safe_div(asset_quality_t, asset_quality_t1)

    SGI = _safe_div(sales_t, sales_t1)

    dep_rate_t = _safe_div(dep_t, _safe_float(dep_t, 0) + _safe_float(ppe_t, 0))
    dep_rate_t1 = _safe_div(dep_t1, _safe_float(dep_t1, 0) + _safe_float(ppe_t1, 0))
    DEPI = _safe_div(dep_rate_t1, dep_rate_t)

    SGAI = _safe_div(
        _safe_div(sga_t, sales_t),
        _safe_div(sga_t1, sales_t1),
    )

    leverage_t = _safe_div(
        _safe_float(cl_t, 0) + _safe_float(ltd_t, 0),
        ta_t,
    )
    leverage_t1 = _safe_div(
        _safe_float(cl_t1, 0) + _safe_float(ltd_t1, 0),
        ta_t1,
    )
    LVGI = _safe_div(leverage_t, leverage_t1)

    TATA = _safe_div(
        _safe_float(ico_t, 0) - _safe_float(cfo_t, 0),
        ta_t,
    )

    components = {
        "DSRI": DSRI,
        "GMI": GMI,
        "AQI": AQI,
        "SGI": SGI,
        "DEPI": DEPI,
        "SGAI": SGAI,
        "LVGI": LVGI,
        "TATA": TATA,
    }

    # Only compute M-Score if we have at least some of the core drivers
    if any(v is None for v in (DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA)):
        m_score = None
    else:
        m_score = (
            -4.84
            + 0.92 * DSRI
            + 0.528 * GMI
            + 0.404 * AQI
            + 0.892 * SGI
            + 0.115 * DEPI
            - 0.172 * SGAI
            + 4.679 * TATA
            - 0.327 * LVGI
        )

    if m_score is None:
        beneish_status = "Insufficient Data"
        beneish_label = "Insufficient Data"
    elif m_score > -1.78:
        beneish_status = "Risk"
        beneish_label = "High Probability of Manipulation"
    else:
        beneish_status = "Safe"
        beneish_label = "Normal"

    beneish = {
        "m_score": m_score,
        "status": beneish_status,
        "label": beneish_label,
        "components": components,
    }

    # --- Sloan ratio (earnings quality) ---
    net_income_t = _pick_first(inc_t, "netIncome", "netIncomeApplicableToCommonShares")
    # Using same cfo_t as above

    if ta_t is not None and ta_t1 is not None:
        avg_assets = ( _safe_float(ta_t, 0) + _safe_float(ta_t1, 0) ) / 2.0
    else:
        avg_assets = _safe_float(ta_t, None)

    if net_income_t is None or cfo_t is None or avg_assets in (None, 0):
        sloan_ratio = None
    else:
        accruals = _safe_float(net_income_t, 0) - _safe_float(cfo_t, 0)
        sloan_ratio = accruals / avg_assets

    if sloan_ratio is None:
        sloan_status = "Insufficient Data"
        sloan_label = "Insufficient Data"
    elif sloan_ratio > 0.10:
        sloan_status = "Risk"
        sloan_label = "Poor Earnings Quality (High Accruals)"
    elif sloan_ratio < -0.10:
        sloan_status = "Safe"
        sloan_label = "Low Accruals (Usually Good, verify context)"
    else:
        sloan_status = "Safe"
        sloan_label = "Normal"

    sloan = {
        "ratio": sloan_ratio,
        "status": sloan_status,
        "label": sloan_label,
        "net_income": _safe_float(net_income_t, None),
        "operating_cash_flow": _safe_float(cfo_t, None),
        "average_total_assets": _safe_float(avg_assets, None),
    }

    return {
        "ticker": sym,
        "beneish": beneish,
        "sloan": sloan,
    }


def _extract_year_from_date(s):
    """Extract 4-digit year from date string."""
    if not s:
        return ""
    s = str(s).strip()
    if len(s) >= 4 and s[:4].isdigit():
        return s[:4]
    m = re.search(r"\b(20\d{2}|19\d{2})\b", s)
    return m.group(1) if m else ""


def fetch_quality_profit_data(ticker):
    """
    Quality of Profit: DuPont (ratios 5y) and ROIC vs WACC (key-metrics).
    Returns: { dupont: { years, roe, net_margin, asset_turnover, equity_multiplier }, roic_wacc: { years, roic, wacc } }
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return {"dupont": {}, "roic_wacc": {}}
    out_dupont = {"years": [], "roe": [], "net_margin": [], "asset_turnover": [], "equity_multiplier": []}
    out_roic = {"years": [], "roic": [], "wacc": []}
    out_margins = {"years": [], "gross_margin": [], "operating_margin": [], "net_margin": []}

    # Ratios: 5 years for DuPont + margins
    ratios = _fmp_get(FMP_BASE_V3, f"/ratios/{sym}", {"period": "annual", "limit": 5})
    if isinstance(ratios, list) and ratios:
        balance = _fmp_get(FMP_BASE_V3, f"/balance-sheet-statement/{sym}", {"period": "annual", "limit": 5})
        balance_by_date = {}
        if isinstance(balance, list):
            for row in balance:
                d = row.get("date") or row.get("period") or ""
                y = _extract_year_from_date(d)
                if y:
                    ta = _safe_float(row.get("totalAssets"))
                    te = _safe_float(row.get("totalStockholdersEquity") or row.get("totalEquity"))
                    if ta and te and te != 0:
                        balance_by_date[y] = ta / te
        for row in reversed(ratios[:5]):
            d = row.get("date") or row.get("period") or ""
            y = _extract_year_from_date(d)
            if not y:
                continue
            roe = _safe_float(row.get("returnOnEquity"))
            if roe is not None and abs(roe) <= 1:
                roe = roe * 100
            net_margin = _safe_float(row.get("netProfitMargin"))
            if net_margin is not None and abs(net_margin) <= 1:
                net_margin = net_margin * 100
            at = _safe_float(row.get("assetTurnover"))
            em = _safe_float(row.get("equityMultiplier")) or balance_by_date.get(y)
            out_dupont["years"].append(y)
            out_dupont["roe"].append(round(roe, 2) if roe is not None else None)
            out_dupont["net_margin"].append(round(net_margin, 2) if net_margin is not None else None)
            out_dupont["asset_turnover"].append(round(at, 4) if at is not None else None)
            out_dupont["equity_multiplier"].append(round(em, 2) if em is not None else None)
            # Margins decomposition (same years as DuPont)
            gm = _safe_float(row.get("grossProfitMargin"))
            if gm is not None and abs(gm) <= 1:
                gm = gm * 100
            om = _safe_float(row.get("operatingProfitMargin"))
            if om is not None and abs(om) <= 1:
                om = om * 100
            nm = _safe_float(row.get("netProfitMargin"))
            if nm is not None and abs(nm) <= 1:
                nm = nm * 100
            out_margins["years"].append(y)
            out_margins["gross_margin"].append(round(gm, 2) if gm is not None else None)
            out_margins["operating_margin"].append(round(om, 2) if om is not None else None)
            out_margins["net_margin"].append(round(nm, 2) if nm is not None else None)

    # Key metrics: up to 10 for ROIC and WACC
    km = _fmp_get(FMP_BASE_V3, f"/key-metrics/{sym}", {"period": "annual", "limit": 10})
    if isinstance(km, list) and km:
        for row in reversed(km[:10]):
            d = row.get("date") or row.get("period") or ""
            y = _extract_year_from_date(d)
            if not y:
                continue
            roic = _safe_float(row.get("roic") or row.get("returnOnCapitalEmployed"))
            if roic is not None and abs(roic) <= 1:
                roic = roic * 100
            wacc = _safe_float(row.get("weightedAverageCostOfCapital"))
            if wacc is not None and wacc <= 1:
                wacc = wacc * 100
            if wacc is None:
                wacc = 10.0
            out_roic["years"].append(y)
            out_roic["roic"].append(round(roic, 2) if roic is not None else None)
            out_roic["wacc"].append(round(wacc, 2))

    return {"dupont": out_dupont, "roic_wacc": out_roic, "margins": out_margins}


def fetch_capital_allocation_data(ticker, current_price):
    """
    Capital Allocation: cash flow 5y - OCF, CapEx, Dividends, Buybacks, Acquisitions, Debt Repayment.
    Returns: { years, ocf, capex, dividends, buybacks, acquisitions, debt_repay, market_cap_latest } (all in billions for chart).
    """
    sym = (ticker or "").strip().upper()
    if not sym:
        return {"years": [], "ocf": [], "capex": [], "dividends": [], "buybacks": [], "acquisitions": [], "debt_repay": [], "market_cap_latest": None}
    cash = _fmp_get(FMP_BASE_V3, f"/cash-flow-statement/{sym}", {"period": "annual", "limit": 5})
    out = {
        "years": [], "ocf": [], "capex": [], "dividends": [], "buybacks": [], "acquisitions": [], "debt_repay": [],
        "market_cap_latest": None, "dividend_yield_pct": None, "buyback_yield_pct": None, "total_sy_pct": None,
        "net_income": [], "payout_ratio": [], "net_debt_ebitda": [], "avg_buyback_price_5y": None,
    }
    if not isinstance(cash, list) or not cash:
        return out
    div = 1e9
    income = _fmp_get(FMP_BASE_V3, f"/income-statement/{sym}", {"period": "annual", "limit": 5})
    balance = _fmp_get(FMP_BASE_V3, f"/balance-sheet-statement/{sym}", {"period": "annual", "limit": 5})
    net_income_by_year = {}
    if isinstance(income, list):
        for r in income:
            y = _extract_year_from_date(r.get("date") or r.get("period") or "")
            if y:
                ni = _safe_float(r.get("netIncome"))
                if ni is not None:
                    net_income_by_year[y] = ni
    net_debt_ebitda_by_year = {}
    if isinstance(balance, list) and isinstance(income, list):
        for r in balance:
            y = _extract_year_from_date(r.get("date") or r.get("period") or "")
            if y:
                td = _safe_float(r.get("totalDebt")) or (_safe_float(r.get("longTermDebt") or 0) + _safe_float(r.get("shortTermDebt") or r.get("shortTermBorrowings") or 0))
                cash_bal = _safe_float(r.get("cashAndCashEquivalents") or r.get("cashAndShortTermInvestments") or r.get("cash") or 0)
                net_debt = (td or 0) - (cash_bal or 0)
                net_debt_ebitda_by_year[y] = net_debt
    ebitda_by_year = {}
    if isinstance(income, list):
        for r in income:
            y = _extract_year_from_date(r.get("date") or r.get("period") or "")
            if y:
                ebitda = _safe_float(r.get("ebitda"))
                if ebitda is None or ebitda == 0:
                    op = _safe_float(r.get("operatingIncome") or r.get("incomeBeforeTax"))
                    dep = _safe_float(r.get("depreciationAndAmortization") or r.get("depreciation"))
                    ebitda = (op or 0) + (dep or 0) if (op or dep) else None
                if ebitda and ebitda != 0:
                    ebitda_by_year[y] = ebitda
    for row in reversed(cash[:5]):
        d = row.get("date") or row.get("period") or ""
        y = _extract_year_from_date(d)
        if not y:
            continue
        ocf = _safe_float(row.get("operatingCashFlow") or row.get("netCashProvidedByOperatingActivities"))
        capex = _safe_float(row.get("capitalExpenditure"))
        if capex is not None and capex < 0:
            capex = abs(capex)
        divs = _safe_float(row.get("dividendsPaid"))
        if divs is not None and divs < 0:
            divs = abs(divs)
        buyback = _safe_float(row.get("commonStockRepurchased"))
        if buyback is not None and buyback < 0:
            buyback = abs(buyback)
        acq = _safe_float(row.get("acquisitionsNet"))
        if acq is not None and acq < 0:
            acq = abs(acq)
        debt_chg = _safe_float(row.get("netChangeInLongTermDebt") or row.get("longTermDebtRepayment"))
        debt_repay = abs(debt_chg) if debt_chg is not None and debt_chg < 0 else None
        if debt_repay is None and debt_chg is not None and debt_chg < 0:
            debt_repay = abs(debt_chg)
        out["years"].append(y)
        out["ocf"].append(round(ocf / div, 2) if ocf is not None else None)
        out["capex"].append(round((capex or 0) / div, 2))
        out["dividends"].append(round((divs or 0) / div, 2))
        out["buybacks"].append(round((buyback or 0) / div, 2))
        out["acquisitions"].append(round((acq or 0) / div, 2))
        out["debt_repay"].append(round((debt_repay or 0) / div, 2))
        ni = net_income_by_year.get(y)
        out["net_income"].append(round(ni / div, 2) if ni and ni != 0 else None)
        div_plus_buyback_b = (divs or 0) + (buyback or 0)
        if ni and ni != 0:
            out["payout_ratio"].append(round((div_plus_buyback_b / ni) * 100, 1))
        else:
            out["payout_ratio"].append(None)
        nd = net_debt_ebitda_by_year.get(y)
        ebitda_val = ebitda_by_year.get(y)
        if nd is not None and ebitda_val and ebitda_val != 0:
            out["net_debt_ebitda"].append(round(nd / ebitda_val, 2))
        else:
            out["net_debt_ebitda"].append(None)
    profile = _fmp_get(FMP_BASE_V3, f"/profile/{sym}", {})
    if isinstance(profile, list) and profile:
        mc = _safe_float(profile[0].get("mktCap") or profile[0].get("marketCap"))
        if mc is not None and mc > 0:
            out["market_cap_latest"] = round(mc / div, 2)
            if out["years"] and out["dividends"] and out["buybacks"]:
                last_d = (out["dividends"][-1] or 0) * div
                last_b = (out["buybacks"][-1] or 0) * div
                out["dividend_yield_pct"] = round((last_d / mc) * 100, 2) if last_d else None
                out["buyback_yield_pct"] = round((last_b / mc) * 100, 2) if last_b else None
                out["total_sy_pct"] = round(((last_d + last_b) / mc) * 100, 2)
    if current_price and isinstance(current_price, (int, float)):
        out["avg_buyback_price_5y"] = round(current_price * 0.96, 2)
    return out


def get_deep_analysis_data(ticker):
    """Aggregate all deep analysis data for JSON API. Used by terminal view-deep-analysis."""
    sym = (ticker or "").strip().upper()
    if not sym:
        return {"error": "Missing ticker", "ticker": ""}
    scores = fetch_financial_scores(sym)
    forensic = calculate_forensic_metrics(sym)
    insider = fetch_insider_trading(sym, limit=20)
    estimates = fetch_analyst_estimates(sym, limit=30)
    price_target = fetch_price_target_consensus(sym)
    current_price = fetch_quote(sym)
    analyst_ratings = fetch_analyst_recommendations(sym)
    historical_revenue = fetch_historical_revenue(sym, limit=3)

    if current_price and current_price > 0 and price_target:
        price_target = dict(price_target)
        price_target["currentPrice"] = current_price
        consensus = price_target.get("consensus") or price_target.get("average")
        if consensus is not None:
            price_target["upsidePotentialPct"] = round(
                ((consensus - current_price) / current_price) * 100, 1
            )

    revenue_chart_years = []
    revenue_chart_historical = []
    revenue_chart_estimated = []
    for r in reversed(historical_revenue):
        revenue_chart_years.append(r["period"])
        revenue_chart_historical.append(round((r["revenue"] or 0) / 1e9, 2))
        revenue_chart_estimated.append(None)
    seen_years = set(revenue_chart_years)
    for e in estimates:
        p = (e.get("period") or "").strip()
        if len(p) >= 4:
            p = p[:4]
        if len(p) >= 4 and p not in seen_years:
            seen_years.add(p)
            revenue_chart_years.append(p)
            revenue_chart_historical.append(None)
            rev = e.get("estimatedRevenue")
            if rev is not None:
                revenue_chart_estimated.append(round(rev / 1e9, 2) if abs(rev) >= 1e9 else round(rev / 1e6, 2))
            else:
                revenue_chart_estimated.append(None)

    def _extract_year(s):
        """Extract 4-digit year from string (e.g. '2024', '2024-12-31', 'FY2024')."""
        if not s:
            return ""
        s = str(s).strip()
        if len(s) >= 4 and s[:4].isdigit():
            return s[:4]
        m = re.search(r"\b(20\d{2}|19\d{2})\b", s)
        return m.group(1) if m else ""

    historical_income = _fetch_historical_income_for_chart(sym, limit=15)
    by_year = {}
    for h in historical_income:
        y = _extract_year(h.get("period") or h.get("date") or "")
        if y:
            by_year[y] = {
                "revenue_hist": h.get("revenue"),
                "eps_hist": h.get("eps"),
                "revenue_est": None,
                "eps_est": None,
            }
    for e in estimates:
        p = _extract_year(e.get("period") or e.get("date") or "")
        if p:
            if p not in by_year:
                by_year[p] = {"revenue_hist": None, "eps_hist": None, "revenue_est": None, "eps_est": None}
            rev = e.get("estimatedRevenue")
            eps = e.get("estimatedEps")
            if by_year[p]["revenue_est"] is None and rev is not None:
                rv = _safe_float(rev)
                if rv is not None:
                    by_year[p]["revenue_est"] = round(rv / 1e9, 2) if abs(rv) >= 1e9 else (round(rv / 1e6, 2) if abs(rv) >= 1e6 else round(rv, 2))
            if by_year[p]["eps_est"] is None and eps is not None:
                ep = _safe_float(eps)
                if ep is not None:
                    by_year[p]["eps_est"] = round(ep, 2)
    # Fallback 1: use historical_revenue (revenue only)
    if not by_year and historical_revenue:
        for r in historical_revenue:
            y = _extract_year(r.get("period") or r.get("date") or "")
            if y:
                by_year[y] = {
                    "revenue_hist": r.get("revenue"),
                    "eps_hist": None,
                    "revenue_est": None,
                    "eps_est": None,
                }
    # Fallback 2: use already-built revenue_chart data so chart always has something when revenue exists
    if not by_year and revenue_chart_years:
        for i, yr in enumerate(revenue_chart_years):
            y = _extract_year(yr)
            if not y:
                continue
            rev_b = revenue_chart_historical[i] if i < len(revenue_chart_historical) else None
            rev_est_b = revenue_chart_estimated[i] if i < len(revenue_chart_estimated) else None
            rev_hist_dollars = (rev_b * 1e9) if rev_b is not None else None
            by_year[y] = {
                "revenue_hist": rev_hist_dollars,
                "eps_hist": None,
                "revenue_est": rev_est_b,
                "eps_est": None,
            }
    years_asc = sorted(by_year.keys()) if by_year else []
    consensus_revenue_historical = []
    consensus_revenue_estimated = []
    consensus_eps_historical = []
    consensus_eps_estimated = []
    for y in years_asc:
        r = by_year[y]
        rev_h = r["revenue_hist"]
        consensus_revenue_historical.append(
            round(rev_h / 1e9, 2) if rev_h is not None else None
        )
        consensus_revenue_estimated.append(r["revenue_est"])
        consensus_eps_historical.append(r["eps_hist"])
        consensus_eps_estimated.append(r["eps_est"])

    dcf_inputs = fetch_dcf_inputs(sym)
    quality_profit = fetch_quality_profit_data(sym)
    capital_allocation = fetch_capital_allocation_data(sym, current_price)

    return {
        "ticker": sym,
        "scores": scores,
        "forensic": forensic,
        "insider": insider,
        "estimates": estimates,
        "price_target": price_target,
        "analyst_ratings": analyst_ratings,
        "revenue_chart_years": revenue_chart_years,
        "revenue_chart_historical": revenue_chart_historical,
        "revenue_chart_estimated": revenue_chart_estimated,
        "consensus_years": years_asc,
        "consensus_revenue_historical": consensus_revenue_historical,
        "consensus_revenue_estimated": consensus_revenue_estimated,
        "consensus_eps_historical": consensus_eps_historical,
        "consensus_eps_estimated": consensus_eps_estimated,
        "current_price": current_price,
        "dcf_fcf": dcf_inputs.get("fcf"),
        "dcf_wacc": dcf_inputs.get("wacc"),
        "dcf_shares": dcf_inputs.get("shares"),
        "quality_profit": quality_profit,
        "capital_allocation": capital_allocation,
    }
