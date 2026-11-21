#!/usr/bin/env python3
"""Prepare prototype/ for static hosting.
- copies tutor prompts into prototype/ and embeds them in index.html and intro-ai.html (so Copy works offline)
- renders assets: og.png (1200x630), favicon-32.png, apple-touch-icon.png
- optional: --base-url https://USER.github.io/grokeversity/  rewrites og/twitter URLs to absolute (X needs absolute)."""
import argparse, html, pathlib, re, shutil
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parents[1]; SITE = ROOT / "prototype"; A = SITE / "assets"
ap = argparse.ArgumentParser(); ap.add_argument("--base-url", default=""); args = ap.parse_args()

def rewrite_meta(html_path, html):
    if not args.base_url:
        return html
    b = args.base_url.rstrip("/") + "/"
    html = re.sub(r'(property="og:image" content=")[^"]*"', rf'\1{b}assets/og.png"', html)
    html = re.sub(r'(name="twitter:image" content=")[^"]*"', rf'\1{b}assets/og.png"', html)
    rel = html_path.relative_to(SITE).as_posix()
    url = b if rel == "index.html" else b + rel
    html = re.sub(r'(property="og:url" content=")[^"]*"', rf'\1{url}"', html)
    return html

def embed(html_path, prompt_src, dest_md=None):
    prompt = prompt_src.read_text()
    if dest_md is not None:
        shutil.copy(prompt_src, dest_md)
    assert "</script" not in prompt.lower()
    html = html_path.read_text()
    if "<!--TUTOR_PROMPT_START-->" in html:
        html = re.sub(r"<!--TUTOR_PROMPT_START-->.*?<!--TUTOR_PROMPT_END-->",
                      lambda m, p=prompt: "<!--TUTOR_PROMPT_START-->" + p.replace("<!--", "&lt;!--") + "<!--TUTOR_PROMPT_END-->", html, flags=re.S)
    html = rewrite_meta(html_path, html)
    html_path.write_text(html)
    return len(prompt)

n_me = embed(SITE / "statics" / "unit-1.html", ROOT / "tutor/TUTOR_PROMPT.md", SITE / "tutor-prompt.md")
n_ai = embed(SITE / "intro-ai.html", ROOT / "tutor/TUTOR_PROMPT_AI.md", SITE / "tutor-prompt-ai.md")
# Landing has no tutor prompt; still rewrite absolute OG URLs when --base-url is set.
index = SITE / "index.html"
index.write_text(rewrite_meta(index, index.read_text()))

# Cache-bust app.css / app.js so a stale GitHub Pages or browser cache cannot
# serve old script against new HTML (later-slide graphics would not init).
import hashlib
def asset_ver():
    h=hashlib.sha256()
    for p in (SITE/'app.css', SITE/'app.js', SITE/'ai.js'):
        h.update(p.read_bytes())
    return h.hexdigest()[:8]
def stamp_assets(html_path, ver):
    html=html_path.read_text()
    html=re.sub(r'((?:href|src)=")([^"]*(?:app\.(?:css|js)|ai\.js))(?:\?v=[^"]*)?(")', rf'\1\2?v={ver}\3', html)
    html=re.sub(r'(statics/unit-1\.html)\?v=[^"\'&]+', rf'\1?v={ver}', html)
    html=re.sub(r'(href=")(intro-ai\.html)(?:\?v=[^"]*)?(")', rf'\1\2?v={ver}\3', html)
    html_path.write_text(html)
_ver=asset_ver()
for _p in (SITE/'statics'/'unit-1.html', SITE/'index.html', SITE/'intro-ai.html'):
    stamp_assets(_p, _ver)


F = "/usr/share/fonts/truetype/dejavu/"
f = lambda n, s: ImageFont.truetype(F + n, s)
def icon(size):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); k = size / 64
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(14 * k), fill="#1e2340")
    for (x2, y2), c in [((34, 18), "#ff8a65"), ((52, 40), "#4dd0e1"), ((50, 12), "#ffd54f")]:
        d.line([12 * k, 50 * k, x2 * k, y2 * k], fill=c, width=max(2, int(5 * k)))
    r = 5 * k; d.ellipse([12 * k - r, 50 * k - r, 12 * k + r, 50 * k + r], fill="#e8eaf6"); return im
icon(32).save(A / "favicon-32.png"); icon(180).convert("RGB").save(A / "apple-touch-icon.png")

W, H = 1200, 630; im = Image.new("RGB", (W, H), "#0f1220"); d = ImageDraw.Draw(im)
for y in range(H):  # soft top glow
    t = max(0, 1 - y / 420); d.line([0, y, W, y], fill=(int(15 + 28 * t), int(18 + 35 * t), int(32 + 78 * t)))
im.paste(icon(84), (70, 64), icon(84))
d.text((172, 78), "Grokeversity", font=f("DejaVuSans-Bold.ttf", 50), fill="#e8eaf6")
d.text((70, 190), "University-level curricula,", font=f("DejaVuSans-Bold.ttf", 54), fill="#ffffff")
d.text((70, 256), "curriculum, one concept at a time.", font=f("DejaVuSans-Bold.ttf", 54), fill="#7c9cff")
d.text((70, 350), "Mechanical Engineering  ·  Introduction to AI  ·  strict quizzes", font=f("DejaVuSans.ttf", 28), fill="#c5cae9")
d.text((70, 392), "Free & open source. Try Unit 1 of either track in your browser.", font=f("DejaVuSans.ttf", 28), fill="#c5cae9")
# vector motif
ox, oy = 1010, 595
for (dx, dy), c in [((-50, -120), "#ff8a65"), ((130, -50), "#4dd0e1"), ((85, -160), "#ffd54f")]:
    d.line([ox, oy, ox + dx, oy + dy], fill=c, width=9)
d.ellipse([ox - 10, oy - 10, ox + 10, oy + 10], fill="#e8eaf6")
d.text((70, 560), "Community project · not affiliated with xAI · not an accredited degree", font=f("DejaVuSans.ttf", 21), fill="#7a83b5")
im.save(A / "og.png"); print("built:", [p.name for p in A.iterdir()], "| prompts:", n_me, n_ai, "| base-url:", args.base_url or "(relative)")
