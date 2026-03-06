"""
BKIG Website — Flask app
Run: python app.py  →  http://127.0.0.1:5002
"""
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from flask import Flask, render_template, send_file, abort, redirect, url_for, Response

app = Flask(__name__, template_folder="template", static_folder="static", static_url_path="/static")

# Secret key: production에서는 반드시 환경변수로 설정 (랜덤 32자 이상 권장)
_default_secret = "bkig-dev-secret-change-in-production"
_secret = os.environ.get("SECRET_KEY", _default_secret)
if _secret == _default_secret and os.environ.get("FLASK_ENV") == "production":
    raise RuntimeError("SECRET_KEY must be set in production. Use a long random string (e.g. openssl rand -hex 32).")
app.config["SECRET_KEY"] = _secret

# 세션 쿠키 보안 (프로덕션/HTTPS에서 적용 권장)
if os.environ.get("FLASK_ENV") == "production" or os.environ.get("SESSION_SECURE_COOKIE", "").lower() in ("1", "true", "yes"):
    app.config["SESSION_COOKIE_SECURE"] = True
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Research PDF: URL 파일명 → 실제 파일명 (파일은 static/pdf/ 에 있음)
RESEARCH_PDF_MAP = {
    "zscaler_research_en.pdf": "BKIG Research Zscaler (EN).pdf",
    "zscaler_research_ko.pdf": "BKIG Research Zscaler (KR).pdf",
    "chevron_research_en.pdf": "BKIG_Chevron_ENG.pdf",
    "chevron_research_ko.pdf": "BKIG_Chevron_KOR.pdf",
    "hyundai_research_ko.pdf": "2nd Stock Pitch Template.pdf",
    "dave_busters_research_en.pdf": "Dave & Buster's Sell Side Pitch.pdf",
    "lemonade_research_ko.pdf": "BKIG_Lemonade_JK.pdf",
}


# Chrome DevTools가 요청하는 설정 파일 — 404 방지
@app.route("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools_well_known():
    return Response("{}", mimetype="application/json")


@app.route("/")
@app.route("/index.html")
def index():
    return render_template("index.html")


@app.route("/join_us")
def join_us():
    return render_template("join_us.html")


@app.route("/donation")
def donation():
    return render_template("donation.html")


@app.route("/partnership")
def partnership():
    return render_template("partnership.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/people")
def people():
    return render_template("people.html")


@app.route("/research")
def research():
    return render_template("research.html")


@app.route("/activity")
def activity():
    return render_template("activity.html")


@app.route("/research/download/<filename>")
def research_download(filename):
    """Research PDF 다운로드. 파일이 있을 때만 PDF로 내려보냄. 없으면 연구 페이지로 이동."""
    if filename not in RESEARCH_PDF_MAP:
        return redirect(url_for("research"))
    actual_name = RESEARCH_PDF_MAP[filename]
    path = os.path.join(app.root_path, app.static_folder, "pdf", actual_name)
    if not os.path.isfile(path):
        return redirect(url_for("research"))
    return send_file(
        path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf",
    )


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/terms-of-use")
def terms_of_use():
    return render_template("terms_of_use.html")


@app.route("/privacy-policy")
def privacy_policy():
    return render_template("privacy_policy.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=True)
