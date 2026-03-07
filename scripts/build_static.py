#!/usr/bin/env python3
"""
Flask templates → static HTML for GitHub Pages.
Run from project root: python scripts/build_static.py
"""
import os
import re

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(PROJECT_ROOT, "template")
OUTPUT_DIR = PROJECT_ROOT  # HTML files at project root

# Page route → output filename (no .html in key; we add it)
ROUTE_TO_FILE = {
    "index": "index.html",
    "about": "about.html",
    "people": "people.html",
    "research": "research.html",
    "activity": "activity.html",
    "join_us": "join_us.html",
    "donation": "donation.html",
    "partnership": "partnership.html",
    "contact": "contact.html",
    "terms_of_use": "terms-of-use.html",
    "privacy_policy": "privacy-policy.html",
}

# url_for('static', filename='X') → /static/X
def replace_static(m):
    return "/static/" + m.group(1)

# url_for('index') → index.html, url_for('about') → about.html, etc.
def replace_route(m):
    name = m.group(1)
    if name == "index":
        return "index.html"
    if name in ROUTE_TO_FILE:
        return ROUTE_TO_FILE[name]
    return name + ".html"

# url_for('research_download', filename='x.pdf') → /static/pdf/x.pdf with download="Display Name"
PDF_DOWNLOAD_NAMES = {
    "zscaler_research_en.pdf": "BKIG Research Zscaler (EN).pdf",
    "zscaler_research_ko.pdf": "BKIG Research Zscaler (KR).pdf",
    "chevron_research_en.pdf": "BKIG_Chevron_ENG.pdf",
    "chevron_research_ko.pdf": "BKIG_Chevron_KOR.pdf",
    "hyundai_research_ko.pdf": "2nd Stock Pitch Template.pdf",
    "dave_busters_research_en.pdf": "Dave & Buster's Sell Side Pitch.pdf",
    "lemonade_research_ko.pdf": "BKIG_Lemonade_JK.pdf",
}

def apply_replacements(text):
    text = re.sub(r'\{\{\s*url_for\s*\(\s*[\'"]static[\'"]\s*,\s*filename\s*=\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\}\}', replace_static, text)
    # research_download: href="{{ url_for('research_download', filename='x.pdf') }}" ... → href="/static/pdf/x.pdf" download="DisplayName" ...
    text = re.sub(
        r'href="\{\{\s*url_for\s*\(\s*[\'"]research_download[\'"]\s*,\s*filename\s*=\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\}\}"([^>]*)>',
        lambda m: f'href="/static/pdf/{m.group(1)}" download="{PDF_DOWNLOAD_NAMES.get(m.group(1), m.group(1))}"{m.group(2)}>',
        text
    )
    text = re.sub(r'\{\{\s*url_for\s*\(\s*[\'"](\w+)[\'"]\s*\)\s*\}\}', replace_route, text)
    return text

def extract_block(content, block_name):
    start = re.search(r"{%\s*block\s+" + block_name + r"\s*%}", content)
    if not start:
        return ""
    # Find the {% endblock %} that follows this block start (not an earlier one)
    end = re.search(r"{%\s*endblock\s*%}", content[start.end() :])
    if not end:
        return ""
    end_pos = start.end() + end.start()
    return content[start.end() : end_pos].strip()

def extract_content_only(content):
    """Remove {% extends %}, {% block %} wrappers and return only the inner content."""
    m = re.search(r"{%\s*block\s+content\s*%}(.*){%\s*endblock\s*%}", content, re.DOTALL)
    if m:
        return m.group(1).strip()
    return content

def extract_scripts(content):
    m = re.search(r"{%\s*block\s+scripts\s*%}(.*){%\s*endblock\s*%}", content, re.DOTALL)
    if m:
        return m.group(1).strip()
    return ""

def main():
    base_path = os.path.join(TEMPLATE_DIR, "base.html")
    with open(base_path, "r", encoding="utf-8") as f:
        base = f.read()

    # Replace all url_for in base so nav/footer/scripts use /static/ and .html
    base = apply_replacements(base)

    # Search index URLs: /about → about.html etc. (keep '/' for home)
    base = re.sub(r"url: '/about'", "url: 'about.html'", base)
    base = re.sub(r"url: '/people'", "url: 'people.html'", base)
    base = re.sub(r"url: '/research'", "url: 'research.html'", base)
    base = re.sub(r"url: '/activity'", "url: 'activity.html'", base)
    base = re.sub(r"url: '/join_us'", "url: 'join_us.html'", base)
    base = re.sub(r"url: '/partnership'", "url: 'partnership.html'", base)
    base = re.sub(r"url: '/donation'", "url: 'donation.html'", base)
    base = re.sub(r"url: '/contact'", "url: 'contact.html'", base)
    base = re.sub(r"url: '/terms-of-use'", "url: 'terms-of-use.html'", base)
    base = re.sub(r"url: '/privacy-policy'", "url: 'privacy-policy.html'", base)

    pages = [
        ("index.html", "BKIG | Boston Korea Investment Group", "index"),
        ("about.html", "About Us | BKIG", "about"),
        ("people.html", "Our People | BKIG", "people"),
        ("research.html", "Research | BKIG", "research"),
        ("activity.html", "Activity | BKIG", "activity"),
        ("join_us.html", "Join Us | BKIG", "join_us"),
        ("donation.html", "Donation | BKIG", "donation"),
        ("partnership.html", "Partnership | BKIG", "partnership"),
        ("contact.html", "Contact Us | BKIG", "contact"),
        ("terms-of-use.html", "Terms of Use | BKIG", "terms_of_use"),
        ("privacy-policy.html", "Privacy Policy | BKIG", "privacy_policy"),
    ]

    for out_name, default_title, template_basename in pages:
        tpl_name = "index.html" if template_basename == "index" else template_basename + ".html"
        tpl_path = os.path.join(TEMPLATE_DIR, tpl_name)
        if not os.path.isfile(tpl_path):
            print("Skip (no template):", tpl_path)
            continue

        with open(tpl_path, "r", encoding="utf-8") as f:
            tpl = f.read()

        title = extract_block(tpl, "title") or default_title
        head_extra = apply_replacements(extract_block(tpl, "head"))
        content = apply_replacements(extract_content_only(tpl))
        scripts_extra = apply_replacements(extract_scripts(tpl))

        # Build full page from a copy of base and substitute blocks
        page = base
        page = re.sub(r"{%\s*block\s+title\s*%}.*?{%\s*endblock\s*%}", title, page, flags=re.DOTALL)
        # Head/scripts: base has "  {% block head %}{% endblock %}" on one line
        if head_extra:
            page = page.replace("{% block head %}{% endblock %}", head_extra, 1)
        else:
            page = page.replace("{% block head %}{% endblock %}", "", 1)
        page = re.sub(r"{%\s*block\s+content\s*%}.*?{%\s*endblock\s*%}", content, page, flags=re.DOTALL)
        if scripts_extra:
            page = page.replace("{% block scripts %}{% endblock %}", scripts_extra, 1)
        else:
            page = page.replace("{% block scripts %}{% endblock %}", "", 1)

        out_path = os.path.join(OUTPUT_DIR, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(page)
        print("Wrote:", out_path)

    print("Done. Static HTML files are in project root.")

if __name__ == "__main__":
    main()
