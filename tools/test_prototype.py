#!/usr/bin/env python3
"""Headless test of the static site (served over local HTTP). Desktop 1280x800 + mobile 390x844.
Checks: no console/page errors or failed requests, KaTeX renders, drag interactions, quiz grading,
mastery unlocks, localStorage persistence across reload, copy-prompt to clipboard, OG tags."""
import http.server, pathlib, socketserver, sys, threading, functools
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]; SITE = ROOT / "prototype"; SHOTS = SITE / "screenshots"; SHOTS.mkdir(exist_ok=True)
for old in SHOTS.glob("*.png"): old.unlink()
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = f"http://127.0.0.1:{port}/index.html"
errors = []
def watch(pg):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
    pg.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}"))
    pg.on("response", lambda r: r.status >= 400 and errors.append(f"HTTP {r.status}: {r.url}"))
def answer(pg, qid, vals):
    loc = pg.locator("#Q" + qid.replace(".", "_"))
    for i, v in enumerate(vals): loc.locator("input").nth(i).fill(v)
    loc.locator("button").nth(0).click(); return loc.locator(".fb").inner_text()
def drag(pg, sel, dx, dy):
    pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'instant'}})"); pg.wait_for_timeout(150)
    b = pg.locator(sel).bounding_box(); x, y = b["x"] + b["width"]/2, b["y"] + b["height"]/2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx, y + dy, steps=10); pg.mouse.up()
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=f"http://127.0.0.1:{port}")
    pg = ctx.new_page(); watch(pg); pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.scrollBehavior='auto')"); pg.goto(URL); pg.wait_for_load_state("networkidle")
    og = pg.evaluate("[...document.querySelectorAll('meta[property^=og],meta[name^=twitter]')].map(m=>(m.getAttribute('property')||m.name)+'='+m.content)")
    print("OG/Twitter tags:", len(og)); assert any("og:image=" in t for t in og) and any("summary_large_image" in t for t in og)
    print("KaTeX nodes:", pg.locator(".katex").count()); assert pg.locator(".katex").count() > 15
    pg.screenshot(path=str(SHOTS / "desktop_01_landing.png"))
    pg.locator("#track").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_02_track_map.png"))
    pg.locator("#learn").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    before = pg.inner_text("#rr"); drag(pg, "#d2", -60, -40); after = pg.inner_text("#rr")
    print("Drag F2: R", before, "->", after); assert before != after
    pg.screenshot(path=str(SHOTS / "desktop_03_concept1_vectors.png"))
    for _ in range(5): pg.click("#next1")
    fb = answer(pg, "q1.1", ["512", "100.5 deg"]); print("no-units:", fb); assert "units" in fb
    pg.locator("#Qq1_1 button").nth(1).click()
    fb = answer(pg, "q1.1", ["0.5122 kN", "100.5 deg"]); print("kN accepted:", fb); assert "Correct" in fb
    pg.locator("#Qq1_1").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_04_quiz_feedback.png"))
    assert "Correct" in answer(pg, "q1.3", ["371.8 N", "-27.4 deg"]); assert "Correct" in answer(pg, "q1.4", ["245 N", "65.9 deg"])
    print("C1 mastery:", pg.inner_text("#mpct"))
    pg.click('#clist [data-c="2"]'); assert pg.is_visible("#c2")
    for k in ["Ax", "Ay", "By", "Bx"]: pg.click(f'#palette [data-k="{k}"]')
    pg.click("#checkfbd"); print("FBD w/ Bx:", pg.inner_text("#fbdfb")); pg.click('#palette [data-k="Bx"]'); pg.click("#checkfbd")
    print("FBD:", pg.inner_text("#fbdfb")); assert "Correct" in pg.inner_text("#fbdfb")
    pg.locator("#c2 .card").nth(2).scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_05_concept2_fbd.png"))
    for qid, v in [("q2.1", ["1", "2", "3", "1"]), ("q2.3", ["4", "3", "1"]), ("q2.5", ["3", "6"])]: assert "Correct" in answer(pg, qid, v)
    pg.click('#clist [data-c="3"]'); assert pg.is_visible("#c3"); pg.locator("#eq").scroll_into_view_if_needed()
    t1 = pg.inner_text("#eT1"); drag(pg, "#ringH", 80, 60); t1b = pg.inner_text("#eT1"); print("Ring drag T1:", t1, "->", t1b); assert t1 != t1b
    pg.screenshot(path=str(SHOTS / "desktop_06_concept3_equilibrium.png"))
    fb = answer(pg, "q3.2", ["156.96 N", "135.9 N", "169.9 mm"]); print("q3.2 (mm→m):", fb); assert "Correct" in fb
    pg.click("#copyPrompt"); clip = pg.evaluate("navigator.clipboard.readText()"); print("Clipboard chars:", len(clip)); assert clip.startswith("# Grokeversity Tutor Prompt")
    pg.wait_for_timeout(300); pg.locator(".tutor").screenshot(path=str(SHOTS / "desktop_07_tutor_copy.png"))
    pg.reload(); pg.wait_for_load_state("networkidle")
    print("After reload: current concept visible c3 =", pg.is_visible("#c3"), "| q1.1 status:", pg.locator("#Qq1_1 .fb").inner_text(), "| list:", pg.inner_text("#clist").replace("\n", " "))
    assert pg.is_visible("#c3")
    pg.locator("footer").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_08_footer_disclaimer.png"))
    # mobile
    m = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page(); watch(m)
    m.goto(URL); m.wait_for_load_state("networkidle")
    sw = m.evaluate("document.documentElement.scrollWidth"); print("Mobile scrollWidth:", sw); assert sw <= 392, "horizontal overflow on mobile"
    m.screenshot(path=str(SHOTS / "mobile_01_landing.png"))
    m.locator("#learn").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.screenshot(path=str(SHOTS / "mobile_02_lesson.png"))
    m.locator("#quiz1").scroll_into_view_if_needed(); m.screenshot(path=str(SHOTS / "mobile_03_quiz.png"))
    m.locator("footer").scroll_into_view_if_needed(); m.screenshot(path=str(SHOTS / "mobile_04_footer.png"))
    br.close()
srv.shutdown()
print("Errors:", errors or "none"); sys.exit(1 if errors else 0)
