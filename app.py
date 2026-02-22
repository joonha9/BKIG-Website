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
from flask import Flask, render_template, send_file, abort, redirect, url_for

app = Flask(__name__, template_folder="template", static_folder="static", static_url_path="/static")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "bkig-dev-secret-change-in-production")

# BKIG Terminal (SPA 인트라넷)
from terminal import terminal_bp, init_terminal_db
init_terminal_db(app)
app.register_blueprint(terminal_bp)

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
    app.run(host="0.0.0.0", port=5002, debug=True)
