"""
DART Analysis — Korean Market (FSS DART API).
Standalone module for Korean company search, disclosures, and financial statements (K-IFRS).
Uses OpenDartReader; requires DART_API_KEY in .env.
"""
from __future__ import annotations

import io
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Any

import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Corp code cache: global DataFrame for vectorized search (lazy-loaded)
# ---------------------------------------------------------------------------
_CORP_DF: pd.DataFrame | None = None
_CORP_DF_LOADED = False
DART_CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
DART_FNLT_SINGL_ACNT_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json"
DART_FNLT_SINGL_ACNT_ALL_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"


def _tag_local(tag: str) -> str:
    if not tag:
        return ""
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _el_text_any(parent: ET.Element, *tags: str) -> str:
    """Get text from first matching child/descendant tag (supports namespaced or exact tag)."""
    for tag in tags:
        el = parent.find(tag)
        if el is not None and (el.text or "").strip():
            return (el.text or "").strip()
        for child in parent:
            if _tag_local(child.tag) == tag and (child.text or "").strip():
                return (child.text or "").strip()
        for desc in parent.iter():
            if _tag_local(desc.tag) == tag and (desc.text or "").strip():
                return (desc.text or "").strip()
    return ""


def _load_corp_code_df(api_key: str) -> pd.DataFrame | None:
    """
    Fetch corp code list from DART (ZIP with XML) and parse into a global Pandas DataFrame.
    Lazy-loaded; only runs on first search. Returns DataFrame with columns corp_code, corp_name, stock_code.
    """
    global _CORP_DF, _CORP_DF_LOADED
    if _CORP_DF_LOADED and _CORP_DF is not None and not _CORP_DF.empty:
        return _CORP_DF
    if not (api_key or "").strip():
        return None
    try:
        import requests
        r = requests.get(DART_CORP_CODE_URL, params={"crtfc_key": api_key}, timeout=15)
        r.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(r.content), "r") as z:
            names = z.namelist()
            xml_name = next((n for n in names if n.upper().endswith(".XML")), names[0] if names else None)
            if not xml_name:
                return _CORP_DF
            with z.open(xml_name) as f:
                raw = f.read()
            for enc in ("utf-8", "cp949", "euc-kr", "utf-8-sig"):
                try:
                    text = raw.decode(enc)
                    root = ET.fromstring(text)
                    break
                except (UnicodeDecodeError, ET.ParseError):
                    continue
            else:
                root = ET.fromstring(raw.decode("utf-8", errors="replace"))
        rows = []
        try:
            list_elems = root.findall(".//{*}list")
        except SyntaxError:
            list_elems = []
        if not list_elems:
            for list_el in root.iter():
                if _tag_local(list_el.tag) != "list":
                    continue
                list_elems.append(list_el)
        for list_el in list_elems:
            corp_code = _el_text_any(list_el, "corp_code")
            corp_name = _el_text_any(list_el, "corp_name")
            stock_code = _el_text_any(list_el, "stock_code")
            if corp_code:
                rows.append({
                    "corp_code": corp_code.strip(),
                    "corp_name": (corp_name or "").strip(),
                    "stock_code": (stock_code or "").strip(),
                })
        if rows:
            df = pd.DataFrame(rows)
            df["corp_name"] = df["corp_name"].fillna("").astype(str)
            df["stock_code"] = df["stock_code"].fillna("").astype(str)
        else:
            df = pd.DataFrame(columns=["corp_code", "corp_name", "stock_code"])
        _CORP_DF = df
        _CORP_DF_LOADED = True
        return _CORP_DF
    except Exception:
        return _CORP_DF


def _el_text(parent: ET.Element, tag: str) -> str:
    el = parent.find(tag)
    if el is not None and el.text:
        return el.text
    return ""


def _get_bsns_year_and_fallback(bsns_year: str | None) -> tuple[str, list[str]]:
    """
    Determine target year and ordered list of years to try (with retry mechanism).
    - If bsns_year is provided: use it first, then target_year-1, target_year-2 for retries.
    - If NOT provided: current_month < 4 (Jan–Mar) -> default current_year-1 but try current_year-2 first
      (last year's report may not be filed yet). current_month >= 4 -> default current_year-1.
    Returns (default_year, [year1, year2, ...]).
    """
    from datetime import datetime
    now = datetime.now()
    current_year = now.year
    month = now.month
    if (bsns_year or "").strip():
        try:
            y = int(bsns_year.strip())
            years = [str(y), str(y - 1), str(y - 2)]
            return (years[0], years)
        except (ValueError, TypeError):
            pass
    if month < 4:
        default = str(current_year - 1)
        years_to_try = [
            str(current_year - 2),
            str(current_year - 1),
            str(current_year - 3),
        ]
    else:
        default = str(current_year - 1)
        years_to_try = [
            str(current_year - 1),
            str(current_year - 2),
            str(current_year - 3),
        ]
    return (default, years_to_try)


def _split_dataframe_by_sj(df: pd.DataFrame | None) -> dict[str, list[dict[str, Any]]]:
    """
    Split a single DataFrame containing BS/IS/CF by sj_div or sj_nm column:
    BS / 재무상태표 -> Balance Sheet; IS, CIS, 손익계산서, 포괄손익계산서 -> Income Statement; CF / 현금흐름표 -> Cash Flow.
    """
    if df is None or not isinstance(df, pd.DataFrame) or df.empty:
        return {"balance_sheet": [], "income_statement": [], "cash_flow": []}
    col = None
    for c in ("sj_div", "sj_nm"):
        if c in df.columns:
            col = c
            break
    if col is None:
        return {"balance_sheet": [], "income_statement": [], "cash_flow": []}
    v = df[col].fillna("").astype(str).str.strip()
    v_upper = v.str.upper().str[:10]
    bs_mask = v_upper.str.startswith("BS") | v_upper.str.startswith("BALANCE") | v.str.contains("재무상태표", regex=False, na=False) | v.str.contains("대차대조표", regex=False, na=False)
    is_mask = v_upper.str.startswith("IS") | v_upper.str.startswith("CIS") | v_upper.str.startswith("INCOME") | v.str.contains("손익계산서", regex=False, na=False) | v.str.contains("포괄손익", regex=False, na=False)
    cf_mask = (
        v_upper.str.startswith("CF")
        | v_upper.str.startswith("SCF")
        | v_upper.str.startswith("CASH")
        | v.str.contains("현금흐름", regex=False, na=False)
        | v.str.contains("현금흐름표", regex=False, na=False)
        | v.str.upper().str.contains("CASH FLOW", regex=False, na=False)
    )
    return {
        "balance_sheet": _dataframe_to_list_of_dicts(df.loc[bs_mask]) if bs_mask.any() else [],
        "income_statement": _dataframe_to_list_of_dicts(df.loc[is_mask]) if is_mask.any() else [],
        "cash_flow": _dataframe_to_list_of_dicts(df.loc[cf_mask]) if cf_mask.any() else [],
    }


def _fetch_financials_dart_api(
    api_key: str,
    corp_code: str,
    bsns_year: str,
    reprt_code: str = "11011",
    fs_div: str = "CFS",
) -> dict[str, Any]:
    """
    DART 공식 API fnlttSinglAcnt.json 직접 호출.
    응답 list를 sj_div(BS/IS/CF)별로 나누어 반환.
    반환 dict에 balance_sheet, income_statement, cash_flow 외에
    dart_status, dart_message(선택)를 넣을 수 있음.
    """
    out: dict[str, Any] = {
        "balance_sheet": [],
        "income_statement": [],
        "cash_flow": [],
    }
    try:
        import requests
        params = {
            "crtfc_key": api_key,
            "corp_code": corp_code,
            "bsns_year": bsns_year,
            "reprt_code": reprt_code,
            "fs_div": fs_div,
        }
        r = requests.get(DART_FNLT_SINGL_ACNT_URL, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, dict):
            return out
        if data.get("status") == "013":
            out["dart_status"] = data.get("status", "")
            out["dart_message"] = data.get("message", "조회된 데이터가 없습니다.")
            return out
        items = data.get("list") or data.get("data") or data.get("result")
        if not isinstance(items, list):
            return out
        unclassified = []
        for row in items:
            if not isinstance(row, dict):
                continue
            sj = (row.get("sj_div") or row.get("sj_nm") or "").strip()
            if not sj and row.get("account_nm"):
                sj = (str(row.get("fs_nm") or "")).strip()
            sj_upper = (sj or "").upper()[:10]
            sj_raw = sj or ""
            if sj_upper.startswith("BS") or sj_upper.startswith("BALANCE") or "재무상태표" in sj_raw or "대차대조표" in sj_raw:
                out["balance_sheet"].append(row)
            elif sj_upper.startswith("IS") or sj_upper.startswith("INCOME") or "손익계산서" in sj_raw or "포괄손익" in sj_raw:
                out["income_statement"].append(row)
            elif (
                sj_upper.startswith("CF")
                or sj_upper.startswith("SCF")
                or sj_upper.startswith("CASH")
                or "현금흐름" in sj_raw
                or "현금흐름표" in sj_raw
                or "CASH FLOW" in sj_upper
            ):
                out["cash_flow"].append(row)
            else:
                unclassified.append((row, sj_raw or "(empty)"))
        if unclassified and not (out["balance_sheet"] or out["income_statement"] or out["cash_flow"]):
            for row, _ in unclassified:
                out["balance_sheet"].append(row)
        return out
    except Exception:
        return out


def _fetch_all_financials_dart_api(
    api_key: str,
    corp_code: str,
    bsns_year: str,
    reprt_code: str = "11011",
    fs_div: str = "CFS",
) -> dict[str, Any]:
    """
    DART 단일회사 전체 재무제표 API fnlttSinglAcntAll.json 호출.
    현금흐름표(CF)를 포함한 BS/IS/CF 전체를 반환. Major Accounts API에 없는 CF 데이터 제공.
    """
    out: dict[str, Any] = {
        "balance_sheet": [],
        "income_statement": [],
        "cash_flow": [],
    }
    try:
        import requests
        params = {
            "crtfc_key": api_key,
            "corp_code": corp_code,
            "bsns_year": bsns_year,
            "reprt_code": reprt_code,
            "fs_div": fs_div,
        }
        r = requests.get(DART_FNLT_SINGL_ACNT_ALL_URL, params=params, timeout=25)
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, dict):
            return out
        if data.get("status") == "013":
            return out
        items = data.get("list") or data.get("data") or data.get("result")
        if not isinstance(items, list):
            return out
        for row in items:
            if not isinstance(row, dict):
                continue
            sj = (row.get("sj_div") or row.get("sj_nm") or "").strip()
            if not sj and row.get("account_nm"):
                sj = (str(row.get("fs_nm") or "")).strip()
            sj_upper = (sj or "").upper()[:10]
            sj_raw = sj or ""
            if sj_upper.startswith("BS") or sj_upper.startswith("BALANCE") or "재무상태표" in sj_raw or "대차대조표" in sj_raw:
                out["balance_sheet"].append(row)
            elif sj_upper.startswith("IS") or sj_upper.startswith("INCOME") or "손익계산서" in sj_raw or "포괄손익" in sj_raw:
                out["income_statement"].append(row)
            elif (
                sj_upper.startswith("CF")
                or sj_upper.startswith("SCF")
                or sj_upper.startswith("CASH")
                or "현금흐름" in sj_raw
                or "현금흐름표" in sj_raw
                or "CASH FLOW" in sj_upper
            ):
                out["cash_flow"].append(row)
        return out
    except Exception:
        return out


# ---------------------------------------------------------------------------
# DartManager: OpenDartReader wrapper + corp code resolution
# ---------------------------------------------------------------------------
class DartManager:
    """Handles DART API calls with corp_code/stock_code/corp_name caching."""

    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key or os.environ.get("DART_API_KEY", "")).strip()
        self._reader = None

    def _get_reader(self):
        if self._reader is not None:
            return self._reader
        if not self.api_key:
            raise ValueError("DART_API_KEY is required")
        try:
            from OpenDartReader import OpenDartReader
            self._reader = OpenDartReader(self.api_key)
            return self._reader
        except ImportError:
            raise ImportError("OpenDartReader is required. Install with: pip install OpenDartReader")

    def _ensure_corp_df(self) -> pd.DataFrame | None:
        """Lazy-load the global corp code DataFrame on first use."""
        return _load_corp_code_df(self.api_key)

    def is_corp_loaded(self) -> bool:
        """Return True if the corp code DataFrame is loaded and non-empty (avoids materializing full list)."""
        df = self._ensure_corp_df()
        return df is not None and not df.empty

    def ensure_corp_cache(self) -> list[dict[str, str]]:
        """Load and return corp code list as list of dicts (for API compatibility). Prefer is_corp_loaded() + search() to avoid building a huge list."""
        df = self._ensure_corp_df()
        if df is None or df.empty:
            return []
        return df.replace({pd.NA: None}).to_dict(orient="records")

    def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        """
        Search companies by Korean name or stock ticker. Vectorized Pandas boolean indexing (no Python loop).
        Returns list of {corp_code, corp_name, stock_code} for API use. Sub-100ms when _CORP_DF is already loaded.
        """
        q = (query or "").strip()
        if not q:
            return []
        df = self._ensure_corp_df()
        if df is None or df.empty:
            return []
        mask = (
            df["corp_name"].str.contains(re.escape(q), case=False, na=False, regex=True)
            | (df["stock_code"].astype(str) == q)
        )
        result = df.loc[mask].head(limit)
        return result.replace({pd.NA: None}).to_dict(orient="records")

    def get_corp_code(self, name_or_ticker: str) -> str | None:
        """Resolve company name or stock ticker to DART corp_code. Returns first match or None."""
        results = self.search(name_or_ticker, limit=1)
        if results:
            return results[0].get("corp_code")
        return None

    def overview(self, corp_code: str) -> dict[str, Any]:
        """
        Company overview: company (CEO, est_dt, address, hm_url), employees (sm, jan_avrg_payment_amt, avrg_cnwk_sdy_tr), shareholders (nm, relate, stock_qota_rt) top 5.
        Each section fetched separately; partial data returned on partial failure.
        """
        if not corp_code or not self.api_key:
            return {"company": {}, "employees": {}, "shareholders": []}
        out: dict[str, Any] = {"company": {}, "employees": {}, "shareholders": []}
        from datetime import datetime
        current_year = datetime.now().year
        try:
            reader = self._get_reader()
        except Exception:
            return out
        for name in ("company", "company_report"):
            fn = getattr(reader, name, None)
            if not callable(fn):
                continue
            try:
                res = fn(corp_code)
                if res is None:
                    continue
                if hasattr(res, "empty") and res.empty:
                    continue
                if hasattr(res, "iloc"):
                    rec = res.iloc[0].to_dict() if not res.empty else {}
                elif isinstance(res, dict):
                    rec = res
                elif isinstance(res, list) and res and isinstance(res[0], dict):
                    rec = res[0]
                else:
                    rec = {}
                raw = {k: v for k, v in (rec or {}).items() if v is not None and str(v).strip() != ""}
                out["company"] = {
                    "ceo": raw.get("ceo_nm") or raw.get("ceo") or raw.get("대표자명") or "",
                    "est_dt": raw.get("est_dt") or raw.get("설립일") or "",
                    "address": raw.get("adres") or raw.get("address") or raw.get("주소") or "",
                    "website": raw.get("hm_url") or raw.get("homepage") or raw.get("website") or "",
                }
                break
            except Exception:
                continue
        for name in ("emp_sttus", "emp_status"):
            fn = getattr(reader, name, None)
            if not callable(fn):
                continue
            for year in (current_year - 1, current_year - 2):
                try:
                    res = fn(corp_code, str(year))
                    if res is None or (hasattr(res, "empty") and res.empty):
                        try:
                            res = fn(corp_code, str(year), reprt_code="11011")
                        except Exception:
                            res = None
                    if res is None or (hasattr(res, "empty") and res.empty):
                        continue
                    if hasattr(res, "to_dict"):
                        rows = _dataframe_to_list_of_dicts(res)
                    elif isinstance(res, list):
                        rows = res
                    else:
                        rows = []
                    if not rows or not isinstance(rows[0], dict):
                        continue
                    first = rows[0]
                    sm = first.get("sm") or first.get("tot_emp") or first.get("직원수")
                    if sm is None and len(rows) > 0:
                        sm = len(rows)
                    jan = first.get("jan_avrg_payment_amt") or first.get("avrg_slry") or first.get("평균연봉")
                    avrg_tenure = first.get("avrg_cnwk_sdy_tr") or first.get("acmslt_wn") or first.get("근속연수")
                    out["employees"] = {
                        "year": year,
                        "total_employees": sm,
                        "avg_salary": jan,
                        "avg_tenure": avrg_tenure,
                    }
                    break
                except Exception:
                    continue
            if out["employees"]:
                break
        for name in ("major_shareholders", "major_holder", "hyslr_chg_sttus"):
            fn = getattr(reader, name, None)
            if not callable(fn):
                continue
            try:
                res = fn(corp_code)
                if res is None:
                    continue
                if hasattr(res, "to_dict"):
                    rows = _dataframe_to_list_of_dicts(res)
                elif isinstance(res, list):
                    rows = res
                else:
                    rows = []
                out["shareholders"] = []
                for r in (rows or [])[:5]:
                    if not isinstance(r, dict):
                        continue
                    out["shareholders"].append({
                        "nm": r.get("nm") or r.get("major_holders_nm") or r.get("주주명") or r.get("성명") or "—",
                        "relate": r.get("relate") or r.get("relation") or r.get("관계") or "—",
                        "stock_qota_rt": r.get("stock_qota_rt") or r.get("hold_stock_qty_ratio") or r.get("지분") or r.get("비율"),
                    })
                break
            except Exception:
                continue
        return out

    def disclosures(
        self,
        corp_code: str,
        start: str | None = None,
        end: str | None = None,
        kind: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        List of filings (reports/disclosures) for the company.
        kind: e.g. 'jungsusi' for regular reports (정기시기), or DART kind code.
        """
        if not corp_code or not self.api_key:
            return []
        try:
            reader = self._get_reader()
            # OpenDartReader.list(corp_code, start, end, kind) -> DataFrame or None
            df = reader.list(corp_code, start=start, end=end, kind=kind)
            if df is None or df.empty:
                return []
            return _dataframe_to_list_of_dicts(df)
        except Exception:
            return []

    def financials(
        self,
        corp_code: str,
        fs_div: str = "CFS",
        bsns_year: str | None = None,
        reprt_code: str = "11011",
    ) -> dict[str, Any]:
        """
        Financial statements (BS, IS, CF).
        fs_div: 'CFS' (Consolidated/연결) or 'OFS' (Separate/별도).
        reprt_code: '11011'=사업보고서, '11012'=반기보고서, '11013'=1분기, '11014'=3분기.
        bsns_year: if not provided, defaults to current_year - 1; if month < April, prefers current_year - 2 and retries past years.
        Returns { balance_sheet: [], income_statement: [], cash_flow: [] } with list of dicts per report.
        """
        if not corp_code or not self.api_key:
            return {"balance_sheet": [], "income_statement": [], "cash_flow": []}
        fs_div = (fs_div or "CFS").strip().upper()
        if fs_div not in ("CFS", "OFS"):
            fs_div = "CFS"
        default_year, years_to_try = _get_bsns_year_and_fallback(bsns_year)
        bsns_year = (bsns_year or "").strip() or default_year
        out: dict[str, Any] = {"balance_sheet": [], "income_statement": [], "cash_flow": []}
        try:
            import pandas as pd
            reader = self._get_reader()
            if hasattr(reader, "finstate_all"):
                try:
                    all_df = reader.finstate_all(corp_code, bsns_year, reprt_code=reprt_code, fs_div=fs_div)
                    if isinstance(all_df, dict):
                        key_to_out = {
                            "balance_sheet": "balance_sheet", "bs": "balance_sheet", "BS": "balance_sheet",
                            "income_statement": "income_statement", "is": "income_statement", "IS": "income_statement",
                            "cash_flow": "cash_flow", "cf": "cash_flow", "CF": "cash_flow",
                        }
                        for key, out_key in key_to_out.items():
                            if key not in all_df or all_df[key] is None:
                                continue
                            arr = all_df[key]
                            if isinstance(arr, pd.DataFrame) and not arr.empty:
                                if "sj_div" in arr.columns or "sj_nm" in arr.columns:
                                    split = _split_dataframe_by_sj(arr)
                                    for k in ("balance_sheet", "income_statement", "cash_flow"):
                                        if split.get(k) and not out.get(k):
                                            out[k] = split[k]
                                else:
                                    out[out_key] = _dataframe_to_list_of_dicts(arr)
                    elif isinstance(all_df, pd.DataFrame) and not all_df.empty:
                        if "sj_div" in all_df.columns or "sj_nm" in all_df.columns:
                            split = _split_dataframe_by_sj(all_df)
                            out["balance_sheet"] = split.get("balance_sheet") or []
                            out["income_statement"] = split.get("income_statement") or []
                            out["cash_flow"] = split.get("cash_flow") or []
                        else:
                            out["balance_sheet"] = _dataframe_to_list_of_dicts(all_df)
                except Exception:
                    pass
            if not out["balance_sheet"] and not out["income_statement"] and hasattr(reader, "finstate"):
                try:
                    df = reader.finstate(corp_code, bsns_year, reprt_code=reprt_code, fs_div=fs_div)
                    if df is not None and isinstance(df, pd.DataFrame) and not df.empty:
                        if "sj_div" in df.columns or "sj_nm" in df.columns:
                            split = _split_dataframe_by_sj(df)
                            out["balance_sheet"] = split.get("balance_sheet") or []
                            out["income_statement"] = split.get("income_statement") or []
                            out["cash_flow"] = split.get("cash_flow") or []
                        else:
                            out["balance_sheet"] = _dataframe_to_list_of_dicts(df)
                except Exception:
                    pass
            need_cf_or_any = (not out["cash_flow"]) or (not (out["balance_sheet"] or out["income_statement"]))
            if need_cf_or_any:
                reprt_codes_to_try = [reprt_code, "11011", "11012", "11014", "11013"]
                other_fs = "OFS" if fs_div == "CFS" else "CFS"
                for try_fs in [fs_div, other_fs]:
                    if out["cash_flow"] and (out["balance_sheet"] or out["income_statement"]):
                        break
                    for try_year in years_to_try:
                        if out["cash_flow"] and (out["balance_sheet"] or out["income_statement"]):
                            break
                        for try_reprt in reprt_codes_to_try:
                            all_out = _fetch_all_financials_dart_api(
                                self.api_key, corp_code, try_year, reprt_code=try_reprt, fs_div=try_fs
                            )
                            for k in ("balance_sheet", "income_statement", "cash_flow"):
                                if not out.get(k) and all_out.get(k):
                                    out[k] = all_out[k]
                            if out["cash_flow"] and (out["balance_sheet"] or out["income_statement"]):
                                break
                        if out["cash_flow"] and (out["balance_sheet"] or out["income_statement"]):
                            break
                    if out["cash_flow"] and (out["balance_sheet"] or out["income_statement"]):
                        break
            if not out["balance_sheet"] and not out["income_statement"] and not out["cash_flow"]:
                reprt_codes_to_try = [reprt_code, "11011", "11012", "11014", "11013"]
                other_fs = "OFS" if fs_div == "CFS" else "CFS"
                for try_fs in [fs_div, other_fs]:
                    if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                        break
                    for try_year in years_to_try:
                        if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                            break
                        for try_reprt in reprt_codes_to_try:
                            api_out = _fetch_financials_dart_api(
                                self.api_key, corp_code, try_year, reprt_code=try_reprt, fs_div=try_fs
                            )
                            out["balance_sheet"] = api_out.get("balance_sheet") or []
                            out["income_statement"] = api_out.get("income_statement") or []
                            out["cash_flow"] = api_out.get("cash_flow") or []
                            if api_out.get("dart_status"):
                                out["dart_status"] = api_out.get("dart_status")
                                out["dart_message"] = api_out.get("dart_message", "")
                            if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                                break
            return out
        except Exception:
            out = {"balance_sheet": [], "income_statement": [], "cash_flow": []}
            try:
                _, years = _get_bsns_year_and_fallback(None)
                for try_year in years:
                    if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                        break
                    for try_reprt in (reprt_code or "11011", "11011", "11012", "11014", "11013"):
                        for try_fs in (fs_div, "OFS" if fs_div == "CFS" else "CFS"):
                            all_out = _fetch_all_financials_dart_api(
                                self.api_key, corp_code, try_year, reprt_code=try_reprt, fs_div=try_fs
                            )
                            for k in ("balance_sheet", "income_statement", "cash_flow"):
                                if not out.get(k) and all_out.get(k):
                                    out[k] = all_out[k]
                            if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                                break
                        if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                            break
                if not (out["balance_sheet"] or out["income_statement"] or out["cash_flow"]):
                    for try_year in years:
                        if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                            break
                        for try_reprt in (reprt_code or "11011", "11011", "11012", "11014", "11013"):
                            for try_fs in (fs_div, "OFS" if fs_div == "CFS" else "CFS"):
                                api_out = _fetch_financials_dart_api(
                                    self.api_key, corp_code, try_year, reprt_code=try_reprt, fs_div=try_fs
                                )
                                out["balance_sheet"] = api_out.get("balance_sheet") or []
                                out["income_statement"] = api_out.get("income_statement") or []
                                out["cash_flow"] = api_out.get("cash_flow") or []
                                if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                                    break
                            if out["balance_sheet"] or out["income_statement"] or out["cash_flow"]:
                                break
                return {
                    "balance_sheet": out.get("balance_sheet") or [],
                    "income_statement": out.get("income_statement") or [],
                    "cash_flow": out.get("cash_flow") or [],
                }
            except Exception:
                return {"balance_sheet": [], "income_statement": [], "cash_flow": []}


def _dataframe_to_list_of_dicts(df) -> list[dict[str, Any]]:
    try:
        import pandas as pd
        if df is None or (isinstance(df, pd.DataFrame) and df.empty):
            return []
        if isinstance(df, pd.DataFrame):
            return df.replace({pd.NA: None}).to_dict(orient="records")
        return []
    except Exception:
        return []


def _get_dart_manager() -> DartManager | None:
    key = os.environ.get("DART_API_KEY", "").strip()
    if not key:
        return None
    return DartManager(key)


def preload_dart_corp_cache() -> None:
    """Load the corp code DataFrame in the background so the first /api/dart/search is sub-100ms. Safe to call at app startup."""
    manager = _get_dart_manager()
    if manager:
        manager._ensure_corp_df()


# ---------------------------------------------------------------------------
# Excel export (XlsxWriter): BS, IS, CF sheets with navy header, accounting format
# ---------------------------------------------------------------------------
def export_financials_excel(
    corp_name: str,
    balance_sheet: list[dict],
    income_statement: list[dict],
    cash_flow: list[dict],
) -> io.BytesIO:
    """Build an Excel file with separate sheets for BS, IS, CF. Navy header, white bold text, comma numbers."""
    try:
        import pandas as pd
        import xlsxwriter
    except ImportError:
        raise ImportError("pandas and xlsxwriter are required for Excel export")
    buf = io.BytesIO()
    with xlsxwriter.Workbook(buf, {"in_memory": True}) as wb:
        header_fmt = wb.add_format({
            "bold": True,
            "font_color": "white",
            "bg_color": "#1e3a5f",
            "align": "left",
            "valign": "vcenter",
        })
        num_fmt = wb.add_format({"num_format": "#,##0"})
        num_fmt_neg = wb.add_format({"num_format": "#,##0;[Red]-#,##0"})
        for sheet_name, data, safe_name in [
            ("Balance_Sheet", balance_sheet or [], "Balance Sheet"),
            ("Income_Statement", income_statement or [], "Income Statement"),
            ("Cash_Flow", cash_flow or [], "Cash Flow"),
        ]:
            ws = wb.add_worksheet(safe_name[:31])
            if not data:
                ws.write_string(0, 0, "No data", header_fmt)
                continue
            df = pd.DataFrame(data)
            cols = list(df.columns)
            for c, col in enumerate(cols):
                ws.write_string(0, c, str(col), header_fmt)
            for r, row in df.iterrows():
                for c, col in enumerate(cols):
                    try:
                        val = row[col] if col in row.index else row.get(col)
                    except (KeyError, TypeError):
                        val = None
                    if val is None or (isinstance(val, float) and pd.isna(val)):
                        ws.write(r + 1, c, "")
                    elif isinstance(val, (int, float)):
                        if isinstance(val, float) and val != int(val):
                            ws.write_number(r + 1, c, val, num_fmt_neg if val < 0 else num_fmt)
                        else:
                            ws.write_number(r + 1, c, int(val) if isinstance(val, float) and val == int(val) else val, num_fmt_neg if val < 0 else num_fmt)
                    else:
                        ws.write_string(r + 1, c, str(val))
            ws.set_column(0, len(cols) - 1, 18)
    buf.seek(0)
    return buf


# ---------------------------------------------------------------------------
# Flask Blueprint: DART API routes (mounted under same app as terminal, so /api/dart/...)
# ---------------------------------------------------------------------------
def create_dart_blueprint(login_required_api, require_super_admin):
    """Create Flask blueprint for DART endpoints. Requires login + super_admin."""
    from flask import Blueprint, request, jsonify, send_file

    dart_bp = Blueprint("dart", __name__)

    @dart_bp.route("/api/dart/search", methods=["GET"])
    @login_required_api
    def api_dart_search():
        """GET /api/dart/search?q=삼성전자 or ?q=005930. Returns matched companies (corp_code, corp_name, stock_code)."""
        forbidden = require_super_admin()
        if forbidden:
            return forbidden
        q = (request.args.get("q") or "").strip()
        limit = request.args.get("limit", type=int) or 20
        if limit > 50:
            limit = 50
        manager = _get_dart_manager()
        if not manager:
            return jsonify({"error": "DART API가 설정되지 않았습니다. .env에 DART_API_KEY를 넣어 주세요.", "results": []}), 503
        try:
            if not manager.is_corp_loaded():
                return jsonify({
                    "error": "기업 목록을 불러올 수 없습니다. DART API 키와 인터넷 연결을 확인하세요.",
                    "results": [],
                }), 200
            results = manager.search(q, limit=limit)
            return jsonify({"results": results})
        except Exception as e:
            return jsonify({"error": str(e) or "검색 중 오류가 발생했습니다.", "results": []}), 500

    @dart_bp.route("/api/dart/overview", methods=["GET"])
    @login_required_api
    def api_dart_overview():
        """GET /api/dart/overview?corp_code=xxx. Company details, employees (avg salary, tenure, count), major shareholders."""
        forbidden = require_super_admin()
        if forbidden:
            return forbidden
        corp_code = (request.args.get("corp_code") or "").strip()
        if not corp_code:
            return jsonify({"error": "corp_code required", "company": {}, "employees": {}, "shareholders": []}), 400
        manager = _get_dart_manager()
        if not manager:
            return jsonify({"error": "DART API not configured", "company": {}, "employees": {}, "shareholders": []}), 503
        try:
            data = manager.overview(corp_code)
            return jsonify(data)
        except Exception as e:
            return jsonify({
                "error": str(e),
                "company": {}, "employees": {}, "shareholders": [],
            }), 500

    @dart_bp.route("/api/dart/disclosures", methods=["GET"])
    @login_required_api
    def api_dart_disclosures():
        """GET /api/dart/disclosures?corp_code=xxx&start=YYYYMMDD&end=YYYYMMDD&kind=jungsusi. List of filings."""
        forbidden = require_super_admin()
        if forbidden:
            return forbidden
        corp_code = (request.args.get("corp_code") or "").strip()
        if not corp_code:
            return jsonify({"error": "corp_code required", "list": []}), 400
        start = (request.args.get("start") or "").strip() or None
        end = (request.args.get("end") or "").strip() or None
        kind = (request.args.get("kind") or "").strip() or None  # e.g. jungsusi
        manager = _get_dart_manager()
        if not manager:
            return jsonify({"error": "DART API not configured", "list": []}), 503
        try:
            items = manager.disclosures(corp_code, start=start, end=end, kind=kind)
            return jsonify({"list": items})
        except Exception as e:
            return jsonify({"error": str(e), "list": []}), 500

    @dart_bp.route("/api/dart/financials", methods=["GET"])
    @login_required_api
    def api_dart_financials():
        """GET /api/dart/financials?corp_code=xxx&fs_div=CFS|OFS&bsns_year=YYYY&reprt_code=11011. BS, IS, CF."""
        forbidden = require_super_admin()
        if forbidden:
            return forbidden
        corp_code = (request.args.get("corp_code") or "").strip()
        if not corp_code:
            return jsonify({"error": "corp_code required", "balance_sheet": [], "income_statement": [], "cash_flow": []}), 400
        fs_div = (request.args.get("fs_div") or "CFS").strip().upper()
        if fs_div not in ("CFS", "OFS"):
            fs_div = "CFS"
        bsns_year = (request.args.get("bsns_year") or "").strip() or None
        reprt_code = (request.args.get("reprt_code") or "11011").strip()
        manager = _get_dart_manager()
        if not manager:
            return jsonify({
                "error": "DART API not configured",
                "balance_sheet": [], "income_statement": [], "cash_flow": [],
            }), 503
        try:
            data = manager.financials(corp_code, fs_div=fs_div, bsns_year=bsns_year, reprt_code=reprt_code)
            return jsonify(data)
        except Exception as e:
            return jsonify({
                "error": str(e),
                "balance_sheet": [], "income_statement": [], "cash_flow": [],
            }), 500

    @dart_bp.route("/api/dart/export_excel", methods=["GET"])
    @login_required_api
    def api_dart_export_excel():
        """GET /api/dart/export_excel?corp_code=xxx&corp_name=삼성전자&fs_div=CFS. Download Excel with BS, IS, CF sheets."""
        forbidden = require_super_admin()
        if forbidden:
            return forbidden
        corp_code = (request.args.get("corp_code") or "").strip()
        corp_name = (request.args.get("corp_name") or "DART").strip() or "DART"
        fs_div = (request.args.get("fs_div") or "CFS").strip().upper()
        if fs_div not in ("CFS", "OFS"):
            fs_div = "CFS"
        if not corp_code:
            return jsonify({"error": "corp_code required"}), 400
        manager = _get_dart_manager()
        if not manager:
            return jsonify({"error": "DART API not configured"}), 503
        try:
            data = manager.financials(corp_code, fs_div=fs_div)
            buf = export_financials_excel(
                corp_name,
                data.get("balance_sheet") or [],
                data.get("income_statement") or [],
                data.get("cash_flow") or [],
            )
            safe_name = re.sub(r'[^\w\s-]', '', corp_name)[:30]
            filename = f"DART_{safe_name}_{fs_div}.xlsx"
            return send_file(
                buf,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=filename,
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return dart_bp
