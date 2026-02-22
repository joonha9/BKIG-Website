"""
BKIG Terminal — FMP(Financial Modeling Prep) API 연동.
.env 의 FMP_API_KEY 로 실시간 시장 지수 조회.
"""
import os
import re
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

FMP_BASE = "https://financialmodelingprep.com/api/v3"
FMP_STABLE = "https://financialmodelingprep.com/stable"  # profile, statements, ratios, historical
INDEX_SYMBOLS = ["SPY", "QQQ", "EWY"]
INDEX_NAMES = {"SPY": "S&P 500", "QQQ": "NASDAQ", "EWY": "KOSPI"}
LIMIT_3 = 3  # 최근 3년

# FMP는 changesPercentage를 숫자 또는 "(+1.23%)" 형태 문자열로 줄 수 있음
def _parse_change_percent(value):
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return 0.0
    # "(+1.23%)", "-2.5%", "3.45" 등에서 숫자만 추출
    m = re.search(r"([-+]?\d*\.?\d+)", s.replace(",", "."))
    return float(m.group(1)) if m else 0.0


def get_market_indices(symbols=None):
    """
    FMP API로 시장 지수/주가 실시간 가격·변동률 조회.
    symbols: 최대 3개 티커 리스트 (예: ["AAPL", "TSLA", "MSFT"]). None이면 기본 지수(SPY,QQQ,EWY).
    반환: [{"name": "AAPL", "symbol": "AAPL", "price": 500.0, "change_percent": 0.5}, ...]
    """
    api_key = os.getenv("FMP_API_KEY", "").strip()
    if not api_key:
        return _fallback_indices(symbols)

    use = (symbols or INDEX_SYMBOLS)[:10]
    if not use:
        use = INDEX_SYMBOLS
    url = f"{FMP_BASE}/quote/{','.join(use)}"
    try:
        r = requests.get(url, params={"apikey": api_key}, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return _fallback_indices(symbols)

    if isinstance(data, dict):
        if "Error Message" in data or "error" in str(data).lower():
            return _fallback_indices(symbols)
        data = [data]
    if not isinstance(data, list):
        return _fallback_indices(symbols)

    def _get(d, *keys):
        for k in keys:
            if k in d and d[k] is not None:
                return d[k]
        return None

    out = []
    for item in data:
        symbol = (item.get("symbol") or "").strip().upper()
        name = INDEX_NAMES.get(symbol, symbol)
        try:
            price = float(_get(item, "price", "Price") or 0)
        except (TypeError, ValueError):
            price = 0
        raw_pct = _get(item, "changesPercentage", "changesPercent", "changePercent", "ChangePercentage")
        change_pct = _parse_change_percent(raw_pct)
        # API가 변동률을 안 주면 change(절대값)과 price로 계산
        if price and (change_pct == 0 or raw_pct is None):
            try:
                change_abs = float(_get(item, "change", "Change") or 0)
                if change_abs != 0:
                    prev = price - change_abs
                    if prev and prev != 0:
                        change_pct = 100.0 * change_abs / prev
            except (TypeError, ValueError):
                pass
        out.append({
            "name": name,
            "symbol": symbol,
            "price": round(price, 2),
            "change_percent": round(change_pct, 2),
        })
    return out if out else _fallback_indices(symbols)


def _fallback_indices(symbols=None):
    """API 키 없음/오류 시 표시용 더미."""
    use = (symbols or INDEX_SYMBOLS)[:10] or INDEX_SYMBOLS
    return [{"name": INDEX_NAMES.get(s, s), "symbol": s, "price": 0, "change_percent": 0} for s in use]


# ---------------------------------------------------------------------------
# Financial Tools: 분리된 API (지연 로딩·캐싱용, limit=3 최근 3년)
# ---------------------------------------------------------------------------
def _fmp_stable_get(path, params=None):
    """FMP stable API GET. apikey 자동 첨부."""
    api_key = os.getenv("FMP_API_KEY", "").strip()
    if not api_key:
        return None
    params = dict(params or {})
    params["apikey"] = api_key
    try:
        r = requests.get(FMP_STABLE + path, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def _fmp_v3_get(path, params=None):
    """FMP v3 API GET (historical-price-full 등). apikey 자동 첨부."""
    api_key = os.getenv("FMP_API_KEY", "").strip()
    if not api_key:
        return None
    params = dict(params or {})
    params["apikey"] = api_key
    try:
        r = requests.get(FMP_BASE + path, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def _fmp_unwrap(data):
    """Stable API가 { "data": [...] } 또는 { "list": [...] } 로 감싸서 오는 경우 언래핑."""
    if data is None:
        return None
    if isinstance(data, dict):
        if "data" in data and data["data"] is not None:
            return data["data"]
        if "list" in data and data["list"] is not None:
            return data["list"]
    return data


def get_company_profile(symbol):
    """회사 프로필 1건. companyName, price, changesPercentage, industry, sector 등."""
    if not (symbol or "").strip():
        return None
    data = _fmp_stable_get("/profile", {"symbol": symbol.strip().upper()})
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict) and "Error Message" not in data:
        return data
    return None


def get_stock_peers(symbol):
    """동일 산업/섹터·시가총액 구간의 피어 티커 목록. FMP stable /stock-peers."""
    if not (symbol or "").strip():
        return []
    data = _fmp_stable_get("/stock-peers", {"symbol": symbol.strip().upper()})
    if not data or isinstance(data, dict) and data.get("Error Message"):
        return []
    if isinstance(data, list):
        out = []
        for item in data:
            if isinstance(item, str):
                out.append(item.strip().upper())
            elif isinstance(item, dict) and item.get("symbol"):
                out.append(str(item["symbol"]).strip().upper())
        return out
    return []


def _period_to_days(period):
    """1D, 5D, 1M, 6M, 1Y, 5Y -> 대략 일수."""
    m = {"1D": 2, "5D": 7, "1M": 35, "6M": 195, "1Y": 370, "5Y": 365 * 5 + 30}
    return m.get((period or "1Y").upper(), 370)


def get_historical_price(symbol, period="1Y"):
    """기간별 EOD 가격+거래량. period: 1D|5D|1M|6M|1Y|5Y. [{ date, open, high, low, close, volume }, ...] 오래된순."""
    if not (symbol or "").strip():
        return []
    from datetime import datetime, timedelta
    end = datetime.utcnow()
    days = _period_to_days(period)
    start = end - timedelta(days=days)
    ticker = symbol.strip().upper()
    data = _fmp_v3_get("/historical-price-full/" + ticker, {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d")})
    if not isinstance(data, dict):
        return []
    hist = data.get("historical")
    if not isinstance(hist, list):
        return []
    out = []
    for row in hist:
        d = row.get("date") or row.get("Date")
        o = row.get("open") or row.get("Open")
        h = row.get("high") or row.get("High")
        l_ = row.get("low") or row.get("Low")
        c = row.get("close") or row.get("Close") or row.get("adjClose")
        vol = row.get("volume") or row.get("Volume")
        if d and c is not None:
            try:
                item = {"date": d, "close": float(c)}
                if o is not None:
                    item["open"] = float(o)
                if h is not None:
                    item["high"] = float(h)
                if l_ is not None:
                    item["low"] = float(l_)
                if vol is not None:
                    item["volume"] = int(vol)
                else:
                    item["volume"] = 0
                out.append(item)
            except (TypeError, ValueError):
                pass
    out.sort(key=lambda x: x["date"])
    return out


def get_income_statement(symbol, limit=LIMIT_3):
    """Income Statement 최근 limit년(기본 3년). period=annual."""
    if not (symbol or "").strip():
        return []
    data = _fmp_stable_get("/income-statement", {"symbol": symbol.strip().upper(), "limit": limit, "period": "annual"})
    if not isinstance(data, list):
        return []
    return data[:limit]


def get_balance_sheet(symbol, limit=LIMIT_3):
    """Balance Sheet 최근 limit년(기본 3년). period=annual."""
    if not (symbol or "").strip():
        return []
    data = _fmp_stable_get("/balance-sheet-statement", {"symbol": symbol.strip().upper(), "limit": limit, "period": "annual"})
    if not isinstance(data, list):
        return []
    return data[:limit]


def get_cash_flow_statement(symbol, limit=LIMIT_3):
    """Cash Flow Statement 최근 limit년(기본 3년). period=annual."""
    if not (symbol or "").strip():
        return []
    data = _fmp_stable_get("/cash-flow-statement", {"symbol": symbol.strip().upper(), "limit": limit, "period": "annual"})
    if not isinstance(data, list):
        return []
    return data[:limit]


def get_ratios(symbol, limit=LIMIT_3):
    """Key Ratios 최근 limit년(기본 3년). period=annual."""
    if not (symbol or "").strip():
        return []
    data = _fmp_stable_get("/ratios", {"symbol": symbol.strip().upper(), "limit": limit, "period": "annual"})
    if not isinstance(data, list):
        return []
    return data[:limit]


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


def _row_eps_revenue(row):
    """From any FMP row, extract (estimated_eps, estimated_revenue) by scanning keys."""
    if not isinstance(row, dict):
        return None, None
    eps, rev = None, None
    for k, v in row.items():
        if v is None:
            continue
        klo = k.lower()
        if eps is None and ("eps" in klo or "earnings" in klo) and "date" not in klo and "period" not in klo and "fiscal" not in klo:
            eps = _safe_float(v)
        if rev is None and "revenue" in klo and "date" not in klo and "period" not in klo and "fiscal" not in klo:
            rev = _safe_float(v)
    return eps, rev


def get_comps_data(symbol):
    """
    Comps 테이블/차트용 1개 티커 지표. FMP profile, income, ratios 등 조합.
    반환: { ticker, marketCap, ev, ltmRevenue, ltmEbitda, grossMargin, evToEbitda, peRatio, pbRatio, roe, roic }
    """
    sym = (symbol or "").strip().upper()
    if not sym:
        return {"ticker": sym or "", "marketCap": None, "ev": None, "ltmRevenue": None, "ltmEbitda": None, "grossMargin": None, "evToEbitda": None, "peRatio": None, "pbRatio": None, "roe": None, "roic": None}
    out = {"ticker": sym, "marketCap": None, "ev": None, "ltmRevenue": None, "ltmEbitda": None, "grossMargin": None, "evToEbitda": None, "peRatio": None, "pbRatio": None, "roe": None, "roic": None}
    profile = get_company_profile(sym)
    if profile:
        mc = _safe_float(profile.get("mktCap") or profile.get("marketCap") or profile.get("marketCapitalization"))
        if mc is not None:
            out["marketCap"] = round(mc / 1e9, 1) if mc >= 1e9 else (round(mc / 1000, 1) if mc >= 1000 else round(mc, 1))
    ev_data = _fmp_stable_get("/enterprise-values", {"symbol": sym})
    if isinstance(ev_data, list) and ev_data:
        ev_val = _safe_float(ev_data[0].get("enterpriseValue") or ev_data[0].get("value"))
        if ev_val is not None:
            out["ev"] = round(ev_val / 1e9, 1) if ev_val >= 1e9 else (round(ev_val / 1000, 1) if ev_val >= 1000 else round(ev_val, 1))
    inc = _fmp_stable_get("/income-statement", {"symbol": sym, "limit": 1, "period": "annual"})
    if isinstance(inc, list) and inc:
        row = inc[0]
        rev = _safe_float(row.get("revenue") or row.get("Revenue"))
        if rev is not None and rev > 0:
            out["ltmRevenue"] = round(rev / 1e9, 1) if rev >= 1e9 else round(rev / 1e9, 2)
        ebitda = _safe_float(row.get("ebitda") or row.get("EBITDA"))
        if ebitda is not None:
            out["ltmEbitda"] = round(ebitda / 1e9, 1) if abs(ebitda) >= 1e9 else round(ebitda / 1e9, 2)
        gp = _safe_float(row.get("grossProfit") or row.get("Gross Profit"))
        if rev and rev > 0 and gp is not None:
            out["grossMargin"] = round(100.0 * gp / rev, 1)
    ratios = _fmp_stable_get("/ratios", {"symbol": sym, "limit": 1, "period": "annual"})
    if isinstance(ratios, list) and ratios:
        r = ratios[0]
        out["evToEbitda"] = _safe_float(r.get("enterpriseValueOverEBITDA") or r.get("evToEbitda"))
        out["peRatio"] = _safe_float(r.get("priceEarningsRatio") or r.get("peRatio"))
        out["pbRatio"] = _safe_float(r.get("priceToBookRatio") or r.get("pbRatio"))
        roe = _safe_float(r.get("returnOnEquity") or r.get("roe"))
        if roe is not None:
            out["roe"] = round(roe * 100, 1) if abs(roe) <= 5 else round(roe, 1)
        roic = _safe_float(r.get("returnOnCapitalEmployed") or r.get("roic"))
        if roic is not None:
            out["roic"] = round(roic * 100, 1) if abs(roic) <= 5 else round(roic, 1)
    key_metrics = _fmp_stable_get("/key-metrics", {"symbol": sym, "limit": 1})
    if isinstance(key_metrics, list) and key_metrics:
        m = key_metrics[0]
        if out["marketCap"] is None:
            mc = _safe_float(m.get("marketCapTTM") or m.get("marketCapitalization"))
            if mc is not None:
                out["marketCap"] = round(mc / 1e9, 1) if mc >= 1e9 else round(mc, 1)
        if out["ev"] is None:
            ev = _safe_float(m.get("enterpriseValueTTM") or m.get("enterpriseValue"))
            if ev is not None:
                out["ev"] = round(ev / 1e9, 1) if ev >= 1e9 else round(ev, 1)
    return out


# ---------------------------------------------------------------------------
# OWNERSHIP: Institutional ownership % + Insider transactions (FMP)
# ---------------------------------------------------------------------------
def get_institutional_holders(symbol):
    """v3 institutional-holder: list of holders. Used to derive institutional %."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return []
    data = _fmp_v3_get("/institutional-holder/" + sym)
    if isinstance(data, dict) and ("Error Message" in data or "error" in str(data).lower()):
        return []
    if isinstance(data, list):
        return data[:50]
    return []


def get_institutional_ownership_pct(symbol):
    """기관 보유 비율(%). institutional-holder 합계 / 시가총액 또는 stable positions-summary."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return None
    from datetime import datetime
    now = datetime.utcnow()
    year, quarter = now.year, (now.month - 1) // 3 + 1
    for y, q in [(year, quarter), (year, quarter - 1), (year - 1, 4)]:
        if q < 1:
            q, y = 4, y - 1
        data = _fmp_stable_get("/institutional-ownership/symbol-positions-summary", {"symbol": sym, "year": y, "quarter": q})
        data = _fmp_unwrap(data)
        if isinstance(data, list) and data:
            row = data[0] if isinstance(data[0], dict) else {}
            pct = _safe_float(row.get("ownershipPercentage") or row.get("institutionalOwnership") or row.get("percentage") or row.get("institutionOwnership"))
            if pct is not None:
                return round(pct, 1) if pct <= 100 else round(pct / 100, 1)
    # Fallback: sum v3 institutional-holder reported value / mktCap
    holders = get_institutional_holders(sym)
    if not holders:
        return None
    profile = get_company_profile(sym)
    mkt_cap = _safe_float(profile.get("mktCap") or profile.get("marketCap") or profile.get("marketCapitalization")) if profile else None
    if mkt_cap is None or mkt_cap <= 0:
        return None
    total = 0
    for h in holders:
        if not isinstance(h, dict):
            continue
        v = _safe_float(h.get("valueReported") or h.get("value") or h.get("reportValue") or h.get("holdingValue"))
        if v is not None and v > 0:
            total += v
    if total <= 0:
        return None
    pct = 100.0 * total / mkt_cap
    return round(min(100.0, pct), 1)


def _parse_insider_row(row, limit_none=False):
    """FMP insider row -> 우리 포맷 { date, insiderName, title, transactionType, shares, price, value }."""
    if not isinstance(row, dict):
        return None
    date = row.get("filingDate") or row.get("transactionDate") or row.get("date") or ""
    name = row.get("reportingName") or row.get("insiderName") or row.get("name") or row.get("reportingOwner") or "—"
    raw_type = row.get("transactionType") or row.get("transactionCode") or str(row.get("type", "")) or ""
    t_type = (raw_type or "").upper()
    if "P" in t_type or "PURCHASE" in t_type or "BUY" in t_type or (raw_type or "").startswith("P"):
        t_type = "BUY"
    elif "S" in t_type or "SALE" in t_type or "D" in t_type or "DISPOS" in t_type or "SELL" in t_type or (raw_type or "").startswith("S"):
        t_type = "SELL"
    else:
        t_type = t_type or "—"
    shares = _safe_float(row.get("securitiesTransacted") or row.get("shares") or row.get("numberOfShares") or row.get("quantity"))
    price = _safe_float(row.get("price") or row.get("valuePerShare") or row.get("pricePerShare"))
    value = _safe_float(row.get("value") or row.get("valueReported") or row.get("totalValue"))
    if value is None and shares is not None and price is not None:
        value = shares * price
    title = row.get("reportingTitle") or row.get("title") or row.get("ownerTitle") or "—"
    date_str = date[:10] if isinstance(date, str) and len(date) >= 10 else str(date)
    return {
        "date": date_str,
        "insiderName": name,
        "title": title,
        "transactionType": t_type,
        "shares": int(shares) if shares is not None else None,
        "price": round(price, 2) if price is not None else None,
        "value": int(value) if value is not None else None,
    }


def get_insider_trading(symbol, limit=20):
    """내부자 거래 목록. stable insider-trading/search 먼저, 없으면 v3."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return []
    # 1) stable: /insider-trading/search?symbol=AAPL&page=0&limit=100
    data = _fmp_stable_get("/insider-trading/search", {"symbol": sym, "page": 0, "limit": limit})
    data = _fmp_unwrap(data)
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            parsed = _parse_insider_row(row)
            if parsed:
                out.append(parsed)
        if out:
            return out
    # 2) v3 (path에 하이픈 사용)
    for path in ["/insider_trading", "/insider-trading"]:
        data = _fmp_v3_get(path, {"symbol": sym})
        if isinstance(data, dict) and ("Error Message" in data or "error" in str(data).lower()):
            continue
        if isinstance(data, list) and data:
            out = []
            for row in data[:limit]:
                parsed = _parse_insider_row(row)
                if parsed:
                    out.append(parsed)
            if out:
                return out
    return []


# ---------------------------------------------------------------------------
# ESTIMATES: Analyst estimates + Price target (FMP stable)
# ---------------------------------------------------------------------------
def get_analyst_estimates(symbol, limit=4):
    """Analyst estimates (EPS, Revenue). analyst-estimates 먼저, 없으면 stable /earnings (Earnings Report)."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return []
    for period_val in ("quarter", "annual"):
        data = _fmp_stable_get("/analyst-estimates", {"symbol": sym, "period": period_val, "page": 0, "limit": max(limit, 10)})
        data = _fmp_unwrap(data)
        if isinstance(data, list) and data:
            out = []
            for row in data[:limit]:
                if not isinstance(row, dict):
                    continue
                period = row.get("period") or row.get("date") or row.get("quarter") or row.get("fiscalPeriod") or "—"
                eps = _safe_float(row.get("estimatedEps") or row.get("eps") or row.get("epsEstimate") or row.get("epsAverage") or row.get("eps_estimated"))
                rev = _safe_float(row.get("estimatedRevenue") or row.get("revenue") or row.get("revenueEstimate") or row.get("revenueAverage") or row.get("revenue_estimated"))
                if eps is None or rev is None:
                    scan_eps, scan_rev = _row_eps_revenue(row)
                    if eps is None and scan_eps is not None:
                        eps = scan_eps
                    if rev is None and scan_rev is not None:
                        rev = scan_rev
                if rev is not None and abs(rev) >= 1e9:
                    rev = round(rev / 1e9, 2)
                elif rev is not None and abs(rev) >= 1e6:
                    rev = round(rev / 1e9, 2)
                out.append({"period": period, "estimatedEps": eps, "estimatedRevenue": rev})
            if out:
                return out
    # Fallback 1: stable /earnings (Earnings Report API)
    data = _fmp_stable_get("/earnings", {"symbol": sym})
    data = _fmp_unwrap(data)
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            period = row.get("period") or row.get("date") or row.get("fiscalDateEnding") or row.get("quarter") or "—"
            eps = _safe_float(row.get("epsEstimate") or row.get("estimatedEps") or row.get("eps") or row.get("epsAverage") or row.get("eps_estimated"))
            rev = _safe_float(row.get("revenueEstimate") or row.get("estimatedRevenue") or row.get("revenue") or row.get("revenueAverage") or row.get("revenue_estimated"))
            if eps is None:
                for k, v in row.items():
                    if v is not None and ("eps" in k.lower() or "earnings" in k.lower()) and k.lower() not in ("fiscaldateending",):
                        eps = _safe_float(v)
                        if eps is not None:
                            break
            if rev is None:
                for k, v in row.items():
                    if v is not None and "revenue" in k.lower() and k.lower() not in ("fiscaldateending",):
                        rev = _safe_float(v)
                        if rev is not None:
                            break
            if rev is not None and abs(rev) >= 1e9:
                rev = round(rev / 1e9, 2)
            elif rev is not None and abs(rev) >= 1e6:
                rev = round(rev / 1e9, 2)
            out.append({"period": period, "estimatedEps": eps, "estimatedRevenue": rev})
        if out:
            return out
    # Fallback 2: v3 earnings-surprises (date, estimatedEps, actualEps)
    data = _fmp_v3_get("/earnings-surprises/" + sym)
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            period = row.get("date") or row.get("fiscalDateEnding") or row.get("quarter") or "—"
            eps = _safe_float(row.get("estimatedEps") or row.get("epsEstimate") or row.get("actualEps") or row.get("eps"))
            scan_eps, rev = _row_eps_revenue(row)
            if eps is None and scan_eps is not None:
                eps = scan_eps
            if rev is not None and abs(rev) >= 1e9:
                rev = round(rev / 1e9, 2)
            elif rev is not None and abs(rev) >= 1e6:
                rev = round(rev / 1e9, 2)
            out.append({"period": period, "estimatedEps": eps, "estimatedRevenue": rev})
        if out:
            return out
    # Fallback 3: stable earnings-calendar (from/to, optional symbol) - include past year so we get data
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    from_date = (now - timedelta(days=365)).strftime("%Y-%m-%d")
    to_date = (now + timedelta(days=365 * 2)).strftime("%Y-%m-%d")
    data = _fmp_stable_get("/earnings-calendar", {"from": from_date, "to": to_date, "symbol": sym})
    data = _fmp_unwrap(data)
    if isinstance(data, list) and data:
        out = []
        for row in data[:limit]:
            if not isinstance(row, dict):
                continue
            if str(row.get("symbol") or "").upper() != sym:
                continue
            period = row.get("date") or row.get("reportDate") or row.get("fiscalDateEnding") or "—"
            eps = _safe_float(row.get("epsEstimated") or row.get("eps_estimated") or row.get("epsEstimate") or row.get("estimatedEps") or row.get("eps"))
            rev = _safe_float(row.get("revenueEstimated") or row.get("revenue_estimated") or row.get("revenueEstimate") or row.get("estimatedRevenue") or row.get("revenue"))
            if eps is None or rev is None:
                scan_eps, scan_rev = _row_eps_revenue(row)
                if eps is None and scan_eps is not None:
                    eps = scan_eps
                if rev is None and scan_rev is not None:
                    rev = scan_rev
            if rev is not None and abs(rev) >= 1e9:
                rev = round(rev / 1e9, 2)
            elif rev is not None and abs(rev) >= 1e6:
                rev = round(rev / 1e9, 2)
            out.append({"period": period, "estimatedEps": eps, "estimatedRevenue": rev})
        if out:
            return out
    return []


def get_price_target_consensus(symbol):
    """Price target consensus: high, low, average, consensus. consensus 먼저, 없으면 price-target-summary."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return {}
    data = _fmp_stable_get("/price-target-consensus", {"symbol": sym})
    data = _fmp_unwrap(data)
    row = None
    if isinstance(data, list) and data:
        row = data[0] if isinstance(data[0], dict) else None
    elif isinstance(data, dict):
        row = data
    if row:
        high = _safe_float(row.get("high") or row.get("targetHigh") or row.get("priceWhenPosted"))
        low = _safe_float(row.get("low") or row.get("targetLow"))
        avg = _safe_float(row.get("average") or row.get("targetMean") or row.get("mean") or row.get("adjPriceTarget"))
        consensus = _safe_float(row.get("consensus") or row.get("targetMedian") or row.get("median"))
        if high is not None or low is not None or avg is not None or consensus is not None:
            return {"high": high, "low": low, "average": avg, "consensus": consensus}
    # Fallback: price-target-summary (average targets by period)
    data = _fmp_stable_get("/price-target-summary", {"symbol": sym})
    data = _fmp_unwrap(data)
    if isinstance(data, list) and data:
        row = data[0] if isinstance(data[0], dict) else None
    elif isinstance(data, dict):
        row = data
    if isinstance(row, dict):
        avg = _safe_float(row.get("average") or row.get("targetMean") or row.get("mean") or row.get("lastMonthAvg") or row.get("lastQuarterAvg") or row.get("lastYearAvg"))
        high = _safe_float(row.get("high") or row.get("targetHigh"))
        low = _safe_float(row.get("low") or row.get("targetLow"))
        if avg is not None or high is not None or low is not None:
            return {"high": high, "low": low, "average": avg, "consensus": avg}
    profile = get_company_profile(sym)
    price = _safe_float(profile.get("price") or profile.get("Price")) if profile else None
    return {"high": None, "low": None, "average": None, "consensus": None, "currentPrice": price}


def get_estimates_data(symbol):
    """ESTIMATES 탭용: currentPrice, priceTarget {high,low,average,consensus}, earningsEstimates[]."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return {"currentPrice": None, "priceTarget": {}, "earningsEstimates": []}
    profile = get_company_profile(sym)
    current = _safe_float(profile.get("price") or profile.get("Price")) if profile else None
    if current is None:
        quote = _fmp_v3_get("/quote/" + sym)
        if isinstance(quote, list) and quote:
            current = _safe_float(quote[0].get("price") or quote[0].get("Price"))
    pt = get_price_target_consensus(sym)
    if current is not None:
        pt["currentPrice"] = current
    estimates = get_analyst_estimates(sym, limit=4)
    return {"currentPrice": current, "priceTarget": pt, "earningsEstimates": estimates}


# ---------------------------------------------------------------------------
# NEWS: Stock news by symbol (FMP stable)
# ---------------------------------------------------------------------------
def get_stock_news(symbol, limit=20):
    """Stock news for symbol. Returns list of { publishedDate, source, title, url }."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return []
    data = _fmp_stable_get("/news/stock", {"symbols": sym, "limit": limit})
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        pub = item.get("publishedDate") or item.get("published") or item.get("date") or ""
        if isinstance(pub, str) and "T" in pub:
            pub = pub.replace("T", " ")[:16]
        source = item.get("site") or item.get("source") or item.get("author") or "—"
        title = item.get("title") or item.get("headline") or item.get("text") or "—"
        url = item.get("url") or item.get("link") or "#"
        out.append({"publishedDate": pub, "source": source, "title": title, "url": url})
    return out
