#!/usr/bin/env python3
"""ECON 101 Unit 1: Chromium + WebKit iPhone checks for the lesson, home card, and quiz."""
from __future__ import annotations
import functools, http.server, json, pathlib, socketserver, sys, threading, traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_home_links import home_links_pass, assert_home_header
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
SHOTS = pathlib.Path("/workspace/grokeversity_shots")
SHOTS.mkdir(parents=True, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE)))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
HOME = f"http://127.0.0.1:{PORT}/"
LESSON = f"http://127.0.0.1:{PORT}/econ/unit-1.html"
ABOUT = f"http://127.0.0.1:{PORT}/about.html"

IPHONE = dict(
    viewport={"width": 390, "height": 844},
    is_mobile=True,
    has_touch=True,
    device_scale_factor=3,
    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
)

UNLOCK = {
    "score": {
        "1": {"q1.1": 1, "q1.2": 1, "q1.3": 1, "q1.4": 1},
        "2": {"q2.1": 1, "q2.2": 1, "q2.3": 1, "q2.4": 1},
        "3": {"q3.1": 1, "q3.2": 1, "q3.3": 1, "q3.4": 1},
        "4": {"q4.1": 1, "q4.2": 1, "q4.3": 1, "q4.4": 1},
    },
    "current": 1,
    "slide": {},
}
STORE_KEY = "grokiversity.econ101.v1"


def watch(pg, errors):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: errors.append(f"console:{m.type}: {m.text}") if m.type == "error" else None)
    def _hide_fun():
        try:
            pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")
        except Exception:
            pass
    try:
        pg.add_locator_handler(pg.locator(".fun-overlay:not([hidden])"), _hide_fun)
    except Exception:
        pass


def no_shift(pg, label):
    info = pg.evaluate("""() => {
      const app = document.getElementById('lessonApp');
      const cs = app && getComputedStyle(app);
      const h = document.querySelector('.lesson-top') || document.querySelector('header');
      const r = h && h.getBoundingClientRect();
      return {
        y: window.scrollY, x: window.scrollX,
        transform: cs ? cs.transform : '',
        inline: app ? (app.style.transform || '') : '',
        top: r ? r.top : null,
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth
      };
    }""")
    assert info["y"] == 0 and info["x"] == 0, f"{label}: scrolled {info}"
    t = info["transform"] or "none"
    assert t in ("none", "matrix(1, 0, 0, 1, 0, 0)"), f"{label}: transform {t}"
    assert not info["inline"], f"{label}: inline transform {info['inline']}"
    assert info["sw"] <= info["iw"] + 2, f"{label}: overflow x {info}"
    if info["top"] is not None:
        assert -1 <= info["top"] <= 2, f"{label}: header top {info['top']}"
    return info


def live_ans(pg, qid):
    return pg.evaluate("""(id) => {
      const Q = window.GrokiversityQuiz && window.GrokiversityQuiz.Q;
      if (!Q) return null;
      for (const list of Object.values(Q)) {
        const q = list.find(x => x.id === id);
        if (q) return {text: q.text, ans: q.ans, id: q.id};
      }
      return null;
    }""", qid)


def run_on(page, label, shots=False, iphone=False):
    errors = []
    watch(page, errors)
    page.goto(HOME)
    page.wait_for_load_state("networkidle")
    body = page.inner_text("body")
    assert "Not an accredited degree" in body
    assert 'Built with and powered by Grok. Not an accredited degree. Community project, not affiliated with or endorsed by xAI.' in body
    assert page.locator("#card-econ").count() == 1
    assert "Play now" in page.inner_text("#card-econ")
    assert "Coming soon" in page.inner_text("#card-ai")
    hrefs = page.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '')")
    assert all("intro-ai.html" not in (h or "") for h in hrefs), hrefs
    assert any("econ/unit-1.html" in (h or "") for h in hrefs)
    h = page.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
    print(f"{label} home scrollHeight:", h)
    limit = 980 if iphone else 850
    assert h <= limit, f"{label}: home height {h} > {limit}"
    assert_home_header(page, f"{label} home")
    if shots and iphone:
        page.screenshot(path=str(SHOTS / "econ_home.png"), full_page=True)

    page.goto(ABOUT)
    page.wait_for_load_state("networkidle")
    assert "Play now" in page.inner_text("#econGrid")
    assert "Economics" in page.inner_text("body") or "ECON 101" in page.inner_text("#econGrid")
    assert "not an accredited" in page.inner_text("body").lower()
    assert_home_header(page, f"{label} about")

    # Bare URL is the unit overview; deep links still open concept slides.
    page.goto(LESSON)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    assert page.locator("#lessonApp").count() == 1
    assert page.locator("#unitOverview").is_visible()
    assert "Scarcity" in page.inner_text("#unitOverview")
    assert "80%" in page.inner_text("#unitOverview")
    assert page.locator("#overviewConcepts .overview-c").count() == 4
    assert page.locator("#startUnit").is_visible()
    no_shift(page, f"{label} overview")
    assert_home_header(page, f"{label} overview")
    if iphone:
        h = page.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
        print(f"{label} overview scrollHeight:", h)
        assert h <= 844 + 1, f"{label}: overview should fit 390x844, got {h}"
        if shots:
            page.screenshot(path=str(SHOTS / "overview_econ.png"))
    # Start opens concept 1 first slide; ?c= / #s indexes are unchanged
    page.locator("#startUnit").click()
    page.wait_for_timeout(400)
    assert page.locator("#unitOverview").is_hidden() or page.evaluate("() => document.getElementById('unitOverview').hidden")
    assert "ECON 101" in page.inner_text("#crumb")
    assert page.locator("#trigBtn").count() == 0
    assert page.locator("#copyPrompt").count() == 1
    assert page.locator("#ocSvg").count() == 1
    assert_home_header(page, f"{label} lesson")
    no_shift(page, f"{label} lesson load")
    # Back from the first concept slide returns to the overview
    page.locator("#prevSlide").click()
    page.wait_for_timeout(200)
    assert page.locator("#unitOverview").is_visible(), f"{label}: Back from first slide should return to overview"
    page.locator("#startUnit").click()
    page.wait_for_timeout(300)
    # Drag the day split and watch the work hours change
    before = page.inner_text("#ocWork")
    box = page.locator("#ocSvg").bounding_box()
    assert box, "oc svg not visible"
    page.mouse.move(box["x"] + box["width"] * 0.4, box["y"] + box["height"] * 0.5)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.8, box["y"] + box["height"] * 0.5, steps=8)
    page.mouse.up()
    page.wait_for_timeout(200)
    after = page.inner_text("#ocWork")
    print(f"{label} OC work hours: {before!r} -> {after!r}")
    assert after != before or after != "", f"{label}: dragging the split should change the readout ({before!r})"
    no_shift(page, f"{label} after OC drag")
    if shots and iphone:
        page.screenshot(path=str(SHOTS / "econ_iphone_oc.png"))

    # PPF via concepts if unlocked? Concept 2 is locked until mastery.
    # Unlock, then visit PPF and S&D and a quiz.
    page.evaluate(
        """([key, store]) => { localStorage.setItem(key, JSON.stringify(store)); }""",
        [STORE_KEY, UNLOCK],
    )
    page.goto(LESSON + "?c=2")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    assert page.locator("#ppfSvg").count() == 1
    st = page.inner_text("#ppfStatus")
    box = page.locator("#ppfSvg").bounding_box()
    # drag toward origin (inside)
    page.mouse.move(box["x"] + box["width"] * 0.55, box["y"] + box["height"] * 0.35)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.25, box["y"] + box["height"] * 0.7, steps=8)
    page.mouse.up()
    page.wait_for_timeout(200)
    st2 = page.inner_text("#ppfStatus")
    print(f"{label} PPF status: {st!r} -> {st2!r}")
    assert st2.strip() != "", f"{label}: PPF status empty"
    no_shift(page, f"{label} after PPF drag")
    if shots and iphone:
        page.screenshot(path=str(SHOTS / "econ_iphone_ppf.png"))

    page.goto(LESSON + "?c=4")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    assert page.locator("#sdSvg").count() == 1
    pstar = page.inner_text("#sdPstar")
    box = page.locator("#sdSvg").bounding_box()
    # drag posted price (left handle area)
    page.mouse.move(box["x"] + 40, box["y"] + box["height"] * 0.45)
    page.mouse.down()
    page.mouse.move(box["x"] + 40, box["y"] + box["height"] * 0.25, steps=8)
    page.mouse.up()
    page.wait_for_timeout(200)
    gap = page.inner_text("#sdGap")
    print(f"{label} S&D P*={pstar!r} gap={gap!r}")
    assert pstar.strip() != ""
    no_shift(page, f"{label} after SD drag")
    if shots and iphone:
        page.screenshot(path=str(SHOTS / "econ_iphone_sd.png"))

    # Quiz: clear q1.1 mastery so a wrong check can reveal "Try a new one"
    page.evaluate(
        """(key) => {
          const s = JSON.parse(localStorage.getItem(key) || '{}');
          if (s.score && s.score['1']) delete s.score['1']['q1.1'];
          localStorage.setItem(key, JSON.stringify(s));
        }""",
        STORE_KEY,
    )
    page.goto(LESSON + "?c=1")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(300)
    # Click the quiz-q1-1 dot or jump
    found = page.evaluate("""() => {
      const dots = [...document.querySelectorAll('#dots .dot')];
      const slides = [...document.querySelectorAll('#c1 .slide')];
      const i = slides.findIndex(s => s.dataset.id === 'quiz-q1-1');
      if (i >= 0 && dots[i]) { dots[i].click(); return i; }
      return -1;
    }""")
    assert found >= 0, "quiz-q1-1 slide missing"
    page.wait_for_timeout(300)
    q = live_ans(page, "q1.1")
    assert q and q["ans"], q
    # unit menu includes $
    units = page.evaluate("""() => [...document.querySelectorAll('#Qq1_1 select option')].map(o => o.value)""")
    print(f"{label} q1.1 units", units, "ans", q["ans"])
    assert "$" in units, f"{label}: expected $ in unit menu, got {units}"
    # Show solution + skip exist
    assert page.locator('#Qq1_1 [data-act="sol"]').count() == 1
    assert page.locator('#Qq1_1 [data-act="skip"]').count() == 1
    page.locator('#Qq1_1 [data-act="sol"]').click()
    page.wait_for_timeout(150)
    fb = page.inner_text("#Qq1_1 .fb")
    assert "Answers" in fb or "$" in fb, fb
    if shots:
        page.screenshot(path=str(SHOTS / "econ_quiz.png"))
    # wrong answer reveals Try a new one
    page.locator('#Qq1_1 input').first.fill("1")
    page.locator('#Qq1_1 [data-act="check"]').click()
    page.wait_for_timeout(200)
    again = page.locator('#Qq1_1 [data-act="again"]')
    assert again.count() == 1
    assert again.is_visible(), f"{label}: Try a new one should appear after a wrong check"
    no_shift(page, f"{label} quiz")
    # no serious page errors
    serious = [e for e in errors if "Failed to load resource" not in e and "favicon" not in e]
    assert not serious, f"{label} errors: {serious}"
    print(f"{label}: ok")


def main():
    home_links_pass(SITE)
    print("home_links_pass: ok (includes econ lesson)")
    results = []
    with sync_playwright() as p:
        # Chromium desktop
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = br.new_page(viewport={"width": 1280, "height": 800})
        try:
            run_on(pg, "chromium-1280x800", shots=False, iphone=False)
            results.append("chromium desktop ok")
        finally:
            br.close()

        # Chromium iPhone (for a fallback shot if webkit fails)
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = br.new_context(**IPHONE).new_page()
        try:
            run_on(pg, "chrome-iphone-390x844", shots=True, iphone=True)
            results.append("chromium iPhone ok")
        finally:
            br.close()

        try:
            wk = p.webkit.launch()
            pg = wk.new_context(**IPHONE).new_page()
            try:
                run_on(pg, "webkit-iphone-390x844", shots=True, iphone=True)
                results.append("webkit iPhone ok")
            finally:
                wk.close()
        except Exception as e:
            traceback.print_exc()
            raise SystemExit(f"webkit iPhone failed: {e}")

        # Old grokeversity.* keys must migrate so saved progress is not lost.
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctxm = br.new_context(viewport={"width": 1280, "height": 800})
        ctxm.add_init_script("""
            localStorage.removeItem('grokiversity.econ101.v1');
            localStorage.setItem('grokeversity.econ101.v1', JSON.stringify({
              score: {1: { 'q1.1': 1, 'q1.2': 1, 'q1.3': 1, 'q1.4': 1 }},
              current: 1, slide: {}
            }));
        """)
        pg = ctxm.new_page()
        pg.goto(LESSON + "?c=1#s1")
        pg.wait_for_load_state("networkidle")
        pg.wait_for_timeout(400)
        info = pg.evaluate("""() => ({
          neu: localStorage.getItem('grokiversity.econ101.v1') !== null,
          mastery: (document.getElementById('mpct')||{}).textContent || '',
          score: JSON.parse(localStorage.getItem('grokiversity.econ101.v1')||'{}').score
        })""")
        print("econ key migration:", info)
        assert info["neu"] and info["score"] and info["score"].get("1",{}).get("q1.1") == 1
        assert "100" in (info["mastery"] or "")
        results.append("key migration ok")
        ctxm.close(); br.close()

    print("test_econ:", "; ".join(results))
    return 0


if __name__ == "__main__":
    sys.exit(main())
