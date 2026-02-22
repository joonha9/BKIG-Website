"""
BKIG Terminal — Flask backend (Blueprint + SQLAlchemy).
/terminal 페이지와 /api/users API 제공. Session 기반 인증 + Role 접근 제어.
DB 스키마는 Flask-Migrate(Alembic)로 관리합니다.

[터미널에서 순서대로 실행]
  1. 의존성 설치:     pip install Flask-Migrate
  2. 마이그레이션 초기화:  flask db init
  3. 마이그레이션 생성:   flask db migrate -m "Initial migration and add is_active"
  4. DB 스키마 적용:    flask db upgrade

  (flask 명령 사용 시 FLASK_APP=app.py 또는 FLASK_APP=app 필요)
"""
import os
from functools import wraps
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# DB (app에서 init_terminal_db(app) 호출로 초기화; 스키마는 flask db upgrade 로 적용)
# ---------------------------------------------------------------------------
db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "terminal_users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    division = db.Column(db.String(120), nullable=False)
    team = db.Column(db.Integer, nullable=True)  # 팀 번호 (숫자)
    role = db.Column(db.String(32), nullable=False, default="analyst")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    watchlist = db.Column(db.String(120), nullable=True)  # 최대 3개 티커, 쉼표 구분 예: "AAPL,TSLA,MSFT"

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "division": self.division,
            "team": getattr(self, "team", None),
            "role": self.role,
            "is_active": getattr(self, "is_active", True),
        }


class Task(db.Model):
    __tablename__ = "terminal_tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("terminal_users.id"), nullable=False)
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("terminal_users.id"), nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(32), nullable=False, default="To Do")  # To Do, In Progress, Done

    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = db.relationship("User", foreign_keys=[assigned_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description or "",
            "assigned_to_id": self.assigned_to_id,
            "assigned_to_name": self.assigned_to.name if self.assigned_to else "",
            "assigned_by_id": self.assigned_by_id,
            "assigned_by_name": self.assigned_by.name if self.assigned_by else "",
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
        }


class Meeting(db.Model):
    __tablename__ = "terminal_meetings"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(20), nullable=True)  # e.g. "14:00"
    zoom_link = db.Column(db.String(500), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("terminal_users.id"), nullable=False)

    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "date": self.date.isoformat() if self.date else "",
            "time": self.time or "",
            "zoom_link": self.zoom_link or "",
            "created_by_id": self.created_by_id,
            "created_by_name": self.created_by.name if self.created_by else "",
        }


class Announcement(db.Model):
    __tablename__ = "terminal_announcements"

    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.Text, nullable=False)
    author_name = db.Column(db.String(120), nullable=False)
    author_title = db.Column(db.String(120), nullable=True)  # e.g. President
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    created_by_id = db.Column(db.Integer, db.ForeignKey("terminal_users.id"), nullable=True)

    created_by = db.relationship("User", foreign_keys=[created_by_id])


def init_terminal_db(app):
    """Flask app에 Terminal DB·Migrate 연결 (스키마 변경은 flask db upgrade 로 적용)."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    app.config.setdefault(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///" + os.path.join(base_dir, "terminal.db"),
    )
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    db.init_app(app)
    Migrate(app, db)


# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
terminal_bp = Blueprint("terminal", __name__, template_folder="template", static_folder="static", static_url_path="/static")

# 세션 키
SESSION_USER_ID = "terminal_user_id"
SESSION_USER_ROLE = "terminal_user_role"


def login_required(f):
    """터미널 페이지: 세션 없으면 로그인 유도(홈 + ?terminal=login)로 리다이렉트."""
    @wraps(f)
    def inner(*args, **kwargs):
        if not session.get(SESSION_USER_ID):
            return redirect(url_for("index") + "?terminal=login")
        return f(*args, **kwargs)
    return inner


def login_required_api(f):
    """API: 세션 없으면 401 JSON 반환."""
    @wraps(f)
    def inner(*args, **kwargs):
        if not session.get(SESSION_USER_ID):
            return jsonify({"error": "Unauthorized", "message": "Login required"}), 401
        return f(*args, **kwargs)
    return inner


def get_current_user():
    """현재 로그인 사용자. 세션의 user_id로 DB 조회 후 dict 반환. 없으면 None."""
    user_id = session.get(SESSION_USER_ID)
    if not user_id:
        return None
    user = User.query.get(user_id)
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "division": user.division,
        "role": user.role,
    }


def require_super_admin():
    """super_admin이 아니면 403 JSON 반환. 아니면 None."""
    user = get_current_user()
    if not user or user.get("role") != "super_admin":
        return jsonify({"error": "Forbidden", "message": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@terminal_bp.route("/api/login", methods=["POST"])
def api_login():
    """
    analyst_id(이메일 또는 ID), password 수신.
    유저 조회 후 비밀번호 검증, 성공 시 세션에 user_id/role 저장 후 JSON 성공 반환.
    """
    data = request.get_json(force=True, silent=True) or {}
    analyst_id = (data.get("analyst_id") or "").strip()
    password = data.get("password") or ""

    if not analyst_id or not password:
        return jsonify({"success": False, "message": "analyst_id and password are required"}), 400

    # 이메일로 조회 (analyst_id를 이메일로 사용)
    user = User.query.filter_by(email=analyst_id).first()
    if not user or not user.check_password(password):
        return jsonify({"success": False, "message": "Invalid ID or Password"}), 401
    if not getattr(user, "is_active", True):
        return jsonify({"success": False, "message": "Account is paused"}), 403

    session[SESSION_USER_ID] = user.id
    session[SESSION_USER_ROLE] = user.role
    session.permanent = True
    return jsonify({
        "success": True,
        "user": user.to_dict(),
    })


@terminal_bp.route("/api/logout", methods=["GET"])
def api_logout():
    """세션 파기 후 홈으로 리다이렉트."""
    session.pop(SESSION_USER_ID, None)
    session.pop(SESSION_USER_ROLE, None)
    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# Page & API routes (인증 필요)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Dashboard API (시장 데이터, 워치리스트, 업무, 미팅)
# ---------------------------------------------------------------------------
def _user_watchlist_symbols(user_id):
    """유저의 저장된 티커 리스트 (최대 3개). 없으면 기본 지수."""
    if not user_id:
        return None
    user = User.query.get(user_id)
    if not user or not getattr(user, "watchlist", None):
        return None
    parts = [s.strip().upper() for s in (user.watchlist or "").split(",") if s.strip()][:3]
    return parts if parts else None


@terminal_bp.route("/api/watchlist", methods=["GET", "PATCH"])
@login_required_api
def api_watchlist():
    """GET: 내가 저장한 티커 3개. PATCH: 저장 (body: {"symbols": ["AAPL", "TSLA", "MSFT"]})."""
    user_obj = User.query.get(session.get(SESSION_USER_ID))
    if not user_obj:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "GET":
        raw = getattr(user_obj, "watchlist", None) or ""
        symbols = [s.strip().upper() for s in raw.split(",") if s.strip()][:3]
        return jsonify({"symbols": symbols})

    if request.method == "PATCH":
        data = request.get_json(force=True, silent=True) or {}
        symbols = data.get("symbols")
        if not isinstance(symbols, list):
            return jsonify({"error": "Bad request", "message": "symbols array required"}), 400
        symbols = [str(s).strip().upper() for s in symbols if str(s).strip()][:3]
        user_obj.watchlist = ",".join(symbols) if symbols else None
        db.session.commit()
        return jsonify({"symbols": symbols})
    return jsonify({"error": "Method not allowed"}), 405


@terminal_bp.route("/api/market-data")
@login_required_api
def api_market_data():
    """실시간 시장 데이터. 기본 지수(SPY,QQQ,EWY) 항상 먼저, 그 아래 사용자 추가 티커 최대 3개."""
    try:
        from fmp_api import get_market_indices, INDEX_SYMBOLS
        user_id = session.get(SESSION_USER_ID)
        user_symbols = _user_watchlist_symbols(user_id) or []
        default_set = set(INDEX_SYMBOLS)
        extra = [s for s in user_symbols if s not in default_set]
        symbols = list(INDEX_SYMBOLS) + extra
        data = get_market_indices(symbols=symbols)
        return jsonify({"indices": data})
    except Exception:
        return jsonify({"indices": []})


# ---------------------------------------------------------------------------
# Financial Tools: 분리된 API (지연 로딩, limit=3)
# ---------------------------------------------------------------------------
@terminal_bp.route("/api/tools/profile/<ticker>")
@login_required_api
def api_tools_profile(ticker):
    """Profile + Historical Price. Query: period=1D|5D|1M|6M|1Y|5Y (기본 1Y)."""
    try:
        from fmp_api import get_company_profile, get_historical_price
        period = (request.args.get("period") or "1Y").strip().upper()
        if period not in ("1D", "5D", "1M", "6M", "1Y", "5Y"):
            period = "1Y"
        profile = get_company_profile(ticker)
        historical = get_historical_price(ticker, period=period)
        return jsonify({"profile": profile or {}, "historical": historical})
    except Exception:
        return jsonify({"profile": {}, "historical": []})


@terminal_bp.route("/api/tools/peers/<ticker>")
@login_required_api
def api_tools_peers(ticker):
    """검색 티커의 industry 기준 피어 목록. profile의 industry/sector + FMP stock-peers."""
    try:
        from fmp_api import get_company_profile, get_stock_peers
        sym = (ticker or "").strip().upper()
        if not sym:
            return jsonify({"industry": "", "sector": "", "peers": []})
        profile = get_company_profile(sym)
        industry = (profile or {}).get("industry") or (profile or {}).get("sector") or ""
        sector = (profile or {}).get("sector") or ""
        peers = get_stock_peers(sym)
        return jsonify({"industry": industry or sector, "sector": sector, "peers": peers})
    except Exception:
        return jsonify({"industry": "", "sector": "", "peers": []})


@terminal_bp.route("/api/tools/comps-data")
@login_required_api
def api_tools_comps_data():
    """Comps 테이블/차트용 티커별 지표. Query: tickers=TSLA,WMT,AAPL,TGT (최대 6개)."""
    try:
        from fmp_api import get_comps_data
        tickers_param = (request.args.get("tickers") or request.args.get("symbols") or "").strip()
        if not tickers_param:
            return jsonify({"data": []})
        tickers = [s.strip().upper() for s in tickers_param.split(",") if s.strip()][:6]
        data = [get_comps_data(t) for t in tickers]
        return jsonify({"data": data})
    except Exception:
        return jsonify({"data": []})


@terminal_bp.route("/api/tools/income-statement/<ticker>")
@login_required_api
def api_tools_income_statement(ticker):
    """Income Statement 최근 3년."""
    try:
        from fmp_api import get_income_statement
        data = get_income_statement(ticker, limit=3)
        return jsonify({"data": data})
    except Exception:
        return jsonify({"data": []})


@terminal_bp.route("/api/tools/balance-sheet/<ticker>")
@login_required_api
def api_tools_balance_sheet(ticker):
    """Balance Sheet 최근 3년."""
    try:
        from fmp_api import get_balance_sheet
        data = get_balance_sheet(ticker, limit=3)
        return jsonify({"data": data})
    except Exception:
        return jsonify({"data": []})


@terminal_bp.route("/api/tools/cash-flow/<ticker>")
@login_required_api
def api_tools_cash_flow(ticker):
    """Cash Flow Statement 최근 3년."""
    try:
        from fmp_api import get_cash_flow_statement
        data = get_cash_flow_statement(ticker, limit=3)
        return jsonify({"data": data})
    except Exception:
        return jsonify({"data": []})


@terminal_bp.route("/api/tools/ratios/<ticker>")
@login_required_api
def api_tools_ratios(ticker):
    """Key Ratios 최근 3년."""
    try:
        from fmp_api import get_ratios
        data = get_ratios(ticker, limit=3)
        return jsonify({"data": data})
    except Exception:
        return jsonify({"data": []})


@terminal_bp.route("/api/tools/ownership/<ticker>")
@login_required_api
def api_tools_ownership(ticker):
    """OWNERSHIP: 기관 보유 비율 + 내부자 거래 (FMP)."""
    try:
        from fmp_api import get_institutional_ownership_pct, get_insider_trading
        sym = (ticker or "").strip().upper()
        if not sym:
            return jsonify({"institutionalHoldingsPct": None, "insiderTransactions": []})
        pct = get_institutional_ownership_pct(sym)
        insiders = get_insider_trading(sym, limit=30)
        return jsonify({"institutionalHoldingsPct": pct, "insiderTransactions": insiders})
    except Exception:
        return jsonify({"institutionalHoldingsPct": None, "insiderTransactions": []})


@terminal_bp.route("/api/tools/estimates/<ticker>")
@login_required_api
def api_tools_estimates(ticker):
    """ESTIMATES: 목표가 컨센서스 + 실적 예측 (FMP)."""
    try:
        from fmp_api import get_estimates_data
        sym = (ticker or "").strip().upper()
        if not sym:
            return jsonify({"currentPrice": None, "priceTarget": {}, "earningsEstimates": []})
        data = get_estimates_data(sym)
        return jsonify(data)
    except Exception:
        return jsonify({"currentPrice": None, "priceTarget": {}, "earningsEstimates": []})


@terminal_bp.route("/api/tools/news/<ticker>")
@login_required_api
def api_tools_news(ticker):
    """NEWS: 티커별 뉴스 (FMP)."""
    try:
        from fmp_api import get_stock_news
        sym = (ticker or "").strip().upper()
        if not sym:
            return jsonify({"news": []})
        news = get_stock_news(sym, limit=25)
        return jsonify({"news": news})
    except Exception:
        return jsonify({"news": []})


# ---------------------------------------------------------------------------
# Portfolio: FACCTing API proxy (Bearer token) — portfolio, trade, journal
# ---------------------------------------------------------------------------
def _faccting_token():
    """Authorization: Bearer <token> from request header."""
    auth = request.headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _faccting_base():
    """FACCTing API base URL. Default so token-based calls always try real API."""
    return (os.environ.get("FACCTING_API_BASE") or "https://www.faccting.com").rstrip("/")


def _faccting_get(path, token):
    """Proxy GET to FACCTing. Returns (body_string, None) on success or (None, error_dict) on auth/API error."""
    if not token:
        return None, None
    base = _faccting_base()
    try:
        import ssl
        import urllib.request
        import urllib.error
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            base + path,
            headers={"Authorization": "Bearer " + token, "User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return resp.read().decode("utf-8"), None
    except Exception as e:
        err = {"message": str(e)}
        if hasattr(e, "code"):
            err["code"] = e.code
        if hasattr(e, "read") and callable(getattr(e, "read", None)):
            try:
                err["body"] = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
        return None, err


def _faccting_post(path, token, data):
    """Proxy POST to FACCTing. Returns (body_string, None) on success or (None, error_dict) on error."""
    if not token:
        return None, None
    base = _faccting_base()
    try:
        import ssl
        import urllib.request
        import urllib.error
        import json
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            base + path,
            data=body,
            method="POST",
            headers={
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0",
            },
        )
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return resp.read().decode("utf-8"), None
    except Exception as e:
        err = {"message": str(e)}
        if hasattr(e, "code"):
            err["code"] = e.code
        if hasattr(e, "read") and callable(getattr(e, "read", None)):
            try:
                err["body"] = e.read().decode("utf-8", errors="replace")[:500]
            except Exception:
                pass
        return None, err


def _faccting_get_latest_price(token, ticker):
    """Get latest price for ticker from FACCTing (portfolio holdings or quote). Returns float > 0 or None."""
    import json
    if not token or not (ticker or "").strip():
        return None
    ticker = (ticker or "").strip().upper()
    # 1) Try portfolio holdings (current_price / price per symbol)
    raw, err = _faccting_get("/api/v1/terminal/portfolio", token)
    if raw:
        try:
            data = json.loads(raw)
            holdings = data.get("holdings") or data.get("data", {}).get("holdings") or []
            if isinstance(data.get("data"), list):
                holdings = data["data"]
            for h in holdings if isinstance(holdings, list) else []:
                sym = (h.get("symbol") or h.get("ticker") or "").strip().upper()
                if sym == ticker:
                    p = h.get("current_price") or h.get("price") or h.get("last_price")
                    if p is not None:
                        try:
                            v = float(p)
                            if v > 0:
                                return v
                        except (TypeError, ValueError):
                            pass
        except Exception:
            pass
    # 2) Optional: quote/price endpoint (if FACCTing provides one)
    raw2, _ = _faccting_get("/api/v1/terminal/quote/" + ticker, token)
    if raw2:
        try:
            data = json.loads(raw2)
            p = data.get("price") or data.get("currentPrice") or data.get("current_price")
            if p is not None:
                v = float(p)
                if v > 0:
                    return v
        except Exception:
            pass
    return None


@terminal_bp.route("/api/v1/terminal/me", methods=["GET"])
@login_required_api
def api_v1_terminal_me():
    """GET: FACCTing user info (e.g. nickname). Bearer token in header. Proxy or empty."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    token = _faccting_token()
    raw, err = _faccting_get("/api/v1/terminal/me", token) if token else (None, None)
    if err:
        return jsonify({"error": "FACCTing API error", "message": err.get("message"), "code": err.get("code")}), err.get("code") or 502
    if raw:
        try:
            import json
            return jsonify(json.loads(raw))
        except Exception:
            pass
    return jsonify({"nickname": None})


@terminal_bp.route("/api/v1/terminal/portfolio", methods=["GET"])
@login_required_api
def api_v1_terminal_portfolio():
    """GET: FACCTing portfolio. Bearer token in header. Proxy to FACCTing or mock (no nickname in mock)."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    token = _faccting_token()
    raw, err = _faccting_get("/api/v1/terminal/portfolio", token) if token else (None, None)
    if err:
        return jsonify({"error": "FACCTing API error", "message": err.get("message"), "code": err.get("code")}), err.get("code") or 502
    if raw:
        try:
            import json
            return jsonify(json.loads(raw))
        except Exception:
            pass
    # Mock only when no token or proxy didn't return data (no fake nickname)
    return jsonify({
        "account_summary": {"cash": 50000.00, "total_value": 75000.00},
        "holdings": [
            {"symbol": "AAPL", "shares": 50, "price": 175.50, "market_value": 8775.00},
            {"symbol": "MSFT", "shares": 20, "price": 420.00, "market_value": 8400.00},
        ],
        "competition_status": {"is_active": False},
        "trading_allowed": True,
    })


@terminal_bp.route("/api/v1/terminal/journal", methods=["GET"])
@login_required_api
def api_v1_terminal_journal():
    """GET: FACCTing trading journal. Bearer token in header."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    token = _faccting_token()
    raw, err = _faccting_get("/api/v1/terminal/journal", token) if token else (None, None)
    if err:
        return jsonify({"error": "FACCTing API error", "message": err.get("message"), "code": err.get("code")}), err.get("code") or 502
    if raw:
        try:
            import json
            data = json.loads(raw)
            if isinstance(data, list):
                return jsonify(data)
            # FACCTing may return { "status": "success", "data": [...] } or { "data": { "trades": [...] } }
            lst = data.get("data")
            if isinstance(lst, list):
                return jsonify(lst)
            if isinstance(lst, dict):
                lst = lst.get("trades") or lst.get("entries") or lst.get("journal") or lst.get("list") or []
            else:
                lst = data.get("entries") or data.get("journal") or data.get("trades") or data.get("list") or []
            return jsonify(lst if isinstance(lst, list) else [])
        except Exception:
            pass
    return jsonify([
        {"timestamp": "2026-02-21 14:30", "action": "BUY", "symbol": "AAPL", "shares": 10, "price": 175.50, "rationale": "Q4 실적 호조 및 AI 신사업 기대감으로 인한 장기 보유 목적 매수"},
        {"timestamp": "2026-02-20 11:00", "action": "SELL", "symbol": "TSLA", "shares": 5, "price": 245.00, "rationale": "단기 목표가 도달 차익실현"},
    ])


@terminal_bp.route("/api/v1/terminal/trade", methods=["POST"])
@login_required_api
def api_v1_terminal_trade():
    """POST: Execute trade via FACCTing. Bearer token in header. Body uses TradingJournal fields: stock_ticker, quantity (int), reason.
    Main server (FACCTing) must exempt this path from CSRF (e.g. @csrf.exempt on /api/v1/terminal/trade) or POST will return 400."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    token = _faccting_token()
    data = request.get_json(silent=True) or {}
    if not data and request.get_data():
        return jsonify({"error": "Bad request", "message": "Invalid JSON body"}), 400
    # Frontend sends: ticker, action, shares, rationale → map to model: stock_ticker, quantity, reason
    ticker = (data.get("ticker") or data.get("symbol") or data.get("stock_ticker") or "").strip().upper()
    action = (data.get("action") or data.get("side") or "BUY").strip().upper()
    if action not in ("BUY", "SELL"):
        action = "BUY"
    shares_raw = data.get("shares") or data.get("quantity")
    try:
        quantity = int(shares_raw) if shares_raw is not None else 0
    except (TypeError, ValueError):
        quantity = 0
    reason = (data.get("rationale") or data.get("reason") or data.get("notes") or "").strip()
    if not ticker or quantity < 1:
        return jsonify({"error": "Bad request", "message": "ticker and shares (>= 1) required"}), 400
    # price = FACCTing 최신 주가 (포트폴리오 보유 종목 가격 또는 quote API)
    price = _faccting_get_latest_price(token, ticker) if token else None
    if price is None or price <= 0:
        return jsonify({"error": "Bad request", "message": "Could not get latest price for this ticker from FACCTing."}), 400
    # Body for _faccting_post: API validation expects ticker/shares/rationale/price; DB may use stock_ticker/quantity/reason. Send both.
    qty = int(quantity)
    body = {
        "ticker": ticker,
        "stock_ticker": ticker,
        "shares": qty,
        "quantity": qty,
        "rationale": reason,
        "reason": reason,
        "action": action,
        "price": round(price, 2),
    }
    raw, err = _faccting_post("/api/v1/terminal/trade", token, body) if token else (None, None)
    if err:
        msg = err.get("message") or "FACCTing API error"
        if err.get("body"):
            msg = msg + " | " + err["body"]
        return jsonify({"error": "FACCTing API error", "message": msg, "code": err.get("code")}), err.get("code") or 502
    if raw:
        try:
            import json
            return jsonify(json.loads(raw))
        except Exception:
            pass
    return jsonify({"ok": True, "message": "Order received (mock)"})


@terminal_bp.route("/api/tasks", methods=["GET", "POST"])
@login_required_api
def api_tasks():
    """GET: 내가 할당받은 업무 목록. POST: 업무 생성 (super_admin/division_lead만)."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "GET":
        tasks = Task.query.filter_by(assigned_to_id=user["id"]).order_by(Task.due_date.asc(), Task.id.desc()).all()
        return jsonify({"tasks": [t.to_dict() for t in tasks]})

    if request.method == "POST":
        if user.get("role") not in ("super_admin", "division_lead"):
            return jsonify({"error": "Forbidden", "message": "Admin or Division Lead only"}), 403
        data = request.get_json(force=True, silent=True) or {}
        title = (data.get("title") or "").strip()
        assigned_to_id = data.get("assigned_to_id")
        due = data.get("due_date")
        if not title:
            return jsonify({"error": "Bad request", "message": "title required"}), 400
        if not assigned_to_id:
            return jsonify({"error": "Bad request", "message": "assigned_to_id required"}), 400
        from datetime import datetime
        due_date = None
        if due:
            try:
                due_date = datetime.strptime(due[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass
        task = Task(
            title=title,
            description=(data.get("description") or "").strip() or None,
            assigned_to_id=int(assigned_to_id),
            assigned_by_id=user["id"],
            due_date=due_date,
            status=(data.get("status") or "To Do").strip() or "To Do",
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({"task": task.to_dict()}), 201

    return jsonify({"error": "Method not allowed"}), 405


@terminal_bp.route("/api/meetings", methods=["GET", "POST"])
@login_required_api
def api_meetings():
    """GET: 예정된 미팅 목록. POST: 미팅 생성 (super_admin/division_lead만)."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "GET":
        from datetime import date
        meetings = Meeting.query.filter(Meeting.date >= date.today()).order_by(Meeting.date.asc(), Meeting.time.asc()).limit(20).all()
        return jsonify({"meetings": [m.to_dict() for m in meetings]})

    if request.method == "POST":
        if user.get("role") not in ("super_admin", "division_lead"):
            return jsonify({"error": "Forbidden", "message": "Admin or Division Lead only"}), 403
        data = request.get_json(force=True, silent=True) or {}
        title = (data.get("title") or "").strip()
        meeting_date = data.get("date")
        if not title or not meeting_date:
            return jsonify({"error": "Bad request", "message": "title and date required"}), 400
        from datetime import datetime
        try:
            d = datetime.strptime(meeting_date[:10], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return jsonify({"error": "Bad request", "message": "Invalid date"}), 400
        meeting = Meeting(
            title=title,
            date=d,
            time=(data.get("time") or "").strip() or None,
            zoom_link=(data.get("zoom_link") or "").strip() or None,
            created_by_id=user["id"],
        )
        db.session.add(meeting)
        db.session.commit()
        return jsonify({"meeting": meeting.to_dict()}), 201

    return jsonify({"error": "Method not allowed"}), 405


@terminal_bp.route("/api/announcements", methods=["GET", "POST"])
@login_required_api
def api_announcements():
    """GET: 공지 목록. POST: 공지 작성 (super_admin만). JSON: body, author_name(optional), author_title(optional)."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == "GET":
        announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
        return jsonify({
            "announcements": [
                {"id": a.id, "body": a.body, "author_name": a.author_name, "author_title": a.author_title, "created_at": a.created_at.isoformat() if a.created_at else None}
                for a in announcements
            ]
        })

    if request.method == "POST":
        if user.get("role") != "super_admin":
            return jsonify({"error": "Forbidden", "message": "Super Admin only"}), 403
        data = request.get_json(force=True, silent=True) or {}
        body = (data.get("body") or "").strip()
        if not body:
            return jsonify({"error": "Bad request", "message": "body is required"}), 400
        author_name = (data.get("author_name") or "").strip() or user.get("name") or "Admin"
        author_title = (data.get("author_title") or "").strip() or None
        ann = Announcement(
            body=body,
            author_name=author_name,
            author_title=author_title,
            created_by_id=user.get("id"),
        )
        db.session.add(ann)
        db.session.commit()
        return jsonify({"id": ann.id, "body": ann.body, "author_name": ann.author_name, "author_title": ann.author_title}), 201

    return jsonify({"error": "Method not allowed"}), 405


@terminal_bp.route("/api/users/options")
@login_required_api
def api_users_options():
    """업무 할당용 유저 목록 (id, name). super_admin/division_lead만."""
    user = get_current_user()
    if not user or user.get("role") not in ("super_admin", "division_lead"):
        return jsonify({"users": []})
    users = User.query.filter_by(is_active=True).order_by(User.name).all()
    return jsonify({"users": [{"id": u.id, "name": u.name} for u in users]})


# ---------------------------------------------------------------------------
# Page & API routes (인증 필요)
# ---------------------------------------------------------------------------
def _initials(name):
    """이름에서 이니셜 2자 (첫 단어 첫 글자 + 둘째 단어 첫 글자, 없으면 이름 앞 2자)."""
    if not name or not name.strip():
        return "?"
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return (parts[0][:2].upper()) if len(parts[0]) >= 2 else parts[0].upper()


@terminal_bp.route("/terminal")
@login_required
def terminal_page():
    """Terminal SPA 페이지. current_user, team_members(같은 division), announcements 전달."""
    current_user = get_current_user()
    if not current_user:
        return redirect(url_for("index") + "?terminal=login")

    team_members = []
    division = current_user.get("division")
    if division:
        members = User.query.filter(
            User.division == division,
            User.id != current_user["id"],
            User.is_active.is_(True),
        ).order_by(User.name).all()
        team_members = [
            {
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "initials": _initials(u.name),
            }
            for u in members
        ]

    announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()

    return render_template(
        "terminal.html",
        current_user=current_user,
        team_members=team_members,
        announcements=announcements,
    )


@terminal_bp.route("/api/users", methods=["GET", "POST"])
@login_required_api
def api_users():
    """
    GET: 유저 목록 (super_admin만 허용)
    POST: 새 유저 생성 (super_admin만 허용). JSON: email, password, name, division, role(optional)
    """
    forbidden = require_super_admin()
    if forbidden is not None:
        return forbidden

    if request.method == "GET":
        users = User.query.order_by(User.id).all()
        return jsonify({"users": [u.to_dict() for u in users]})

    if request.method == "POST":
        data = request.get_json(force=True, silent=True) or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""
        name = (data.get("name") or "").strip()
        division = (data.get("division") or "").strip()
        team = data.get("team")
        if team is not None and team != "":
            try:
                team = int(team)
            except (TypeError, ValueError):
                team = None
        else:
            team = None
        role = (data.get("role") or "analyst").strip() or "analyst"
        if role not in ("super_admin", "analyst", "division_lead"):
            role = "analyst"

        if not email or not password or not name or not division:
            return jsonify({"error": "Bad request", "message": "email, password, name, division are required"}), 400

        try:
            user = User(
                email=email,
                password_hash=generate_password_hash(password),
                name=name,
                division=division,
                team=team,
                role=role,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()
            return jsonify({"user": user.to_dict()}), 201
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "Conflict", "message": "Email already exists"}), 409

    return jsonify({"error": "Method not allowed"}), 405


@terminal_bp.route("/api/users/<int:user_id>", methods=["PATCH", "DELETE"])
@login_required_api
def api_user_by_id(user_id):
    """PATCH: is_active 토글 (Pause/Resume). DELETE: 계정 삭제 (Terminate). super_admin만."""
    forbidden = require_super_admin()
    if forbidden is not None:
        return forbidden

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Not found", "message": "User not found"}), 404

    if request.method == "PATCH":
        data = request.get_json(force=True, silent=True) or {}
        is_active = data.get("is_active")
        if is_active is None:
            return jsonify({"error": "Bad request", "message": "is_active required"}), 400
        user.is_active = bool(is_active)
        db.session.commit()
        return jsonify({"user": user.to_dict()})

    if request.method == "DELETE":
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True}), 200

    return jsonify({"error": "Method not allowed"}), 405
