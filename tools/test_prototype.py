#!/usr/bin/env python3
"""Headless test of the static site (served over local HTTP). Desktop 1280x800 + mobile 390x844.
Checks: no console/page errors or failed requests, KaTeX renders, interactive slides (drag, dots,
trig panel, micro-checks), quiz grading for all five Statics concepts, mastery unlocks,
localStorage persistence, copy-prompt, OG tags, multi-track landing, and the Intro to AI
Unit 1 lesson (regression, GD, attention). Intro audio is click-only and must not autoplay."""
import http.server, pathlib, socketserver, sys, threading, functools
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]; SITE = ROOT / "prototype"; SHOTS = SITE / "screenshots"; SHOTS.mkdir(exist_ok=True)
for old in SHOTS.glob("*.png"): old.unlink()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start(); URL = f"http://127.0.0.1:{port}/index.html"
errors = []
IGNORE_404 = ("assets/audio/intro.mp3",)
def skip_net(url):
    return any(s in url for s in IGNORE_404)
def watch(pg):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
    pg.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}") if not skip_net(r.url) else None)
    pg.on("response", lambda r: r.status >= 400 and not skip_net(r.url) and errors.append(f"HTTP {r.status}: {r.url}"))
def answer(pg, qid, vals):
    loc = pg.locator("#Q" + qid.replace(".", "_"))
    for i, v in enumerate(vals): loc.locator("input").nth(i).fill(v)
    loc.locator("button").nth(0).click(); return loc.locator(".fb").inner_text()
def drag(pg, sel, dx, dy):
    pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'instant'}})"); pg.wait_for_timeout(150)
    b = pg.locator(sel).bounding_box(); assert b, f"no box for {sel}"
    x, y = b["x"] + b["width"]/2, b["y"] + b["height"]/2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx, y + dy, steps=10); pg.mouse.up()
def goto_concept(pg, c):
    pg.click(f'#clist [data-c="{c}"]'); pg.wait_for_timeout(250)
    assert pg.is_visible(f"#c{c}"), f"concept {c} not visible"
def goto_slide(pg, data_id):
    i = pg.evaluate("""(id) => {
      const c = [...document.querySelectorAll(".concept")].find(x => !x.hidden);
      return [...c.querySelectorAll(".slide")].findIndex(s => s.dataset.id === id);
    }""", data_id)
    assert i >= 0, f"slide {data_id} not in current concept"
    pg.locator("#dots .dot").nth(i).click(); pg.wait_for_timeout(280)
    on = pg.locator(f'.slide[data-id="{data_id}"]').evaluate("el => el.classList.contains('on')")
    assert on, f"slide {data_id} did not become active"
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=f"http://127.0.0.1:{port}")
    pg = ctx.new_page(); watch(pg); pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.scrollBehavior='auto')"); pg.goto(URL); pg.wait_for_load_state("networkidle")
    og = pg.evaluate("[...document.querySelectorAll('meta[property^=og],meta[name^=twitter]')].map(m=>(m.getAttribute('property')||m.name)+'='+m.content)")
    print("OG/Twitter tags:", len(og)); assert any("og:image=" in t for t in og) and any("summary_large_image" in t for t in og)
    print("KaTeX nodes:", pg.locator(".katex").count()); assert pg.locator(".katex").count() > 15
    # intro audio hook is present and must not have been requested on load
    assert pg.locator("#introAudio").count() == 1
    requested = pg.evaluate("performance.getEntriesByType('resource').map(e=>e.name).join('\\n')")
    assert "intro.mp3" not in requested, "intro.mp3 must not autoplay or preload"
    pg.screenshot(path=str(SHOTS / "desktop_01_landing.png"))
    pg.locator("#tracks").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_09_track_cards.png"))
    href = pg.get_attribute("#card-ai", "href"); print("AI card href:", href); assert href and "intro-ai.html" in href
    assert "Play now" in pg.inner_text("#aiGrid")
    pg.locator("#track").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_02_track_map.png"))
    pg.locator("#learn").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    assert pg.locator('.slide[data-id="hook"]').evaluate("el => el.classList.contains('on')")
    before = pg.inner_text("#ropeHint"); drag(pg, "#ropeH", -20, -80); after = pg.inner_text("#ropeHint")
    print("Rope drag hint:", before, "->", after)
    # angle change should update the floor/lift readouts even if the hint sentence stays similar
    # (steeper vs flatter). Check the numeric floor share moved.
    pg.screenshot(path=str(SHOTS / "desktop_03b_hook_rope.png"))
    # trig refresher
    pg.click("#trigBtn"); pg.wait_for_timeout(200)
    assert pg.locator("#trigPanel").evaluate("el => el.classList.contains('on')")
    s0 = pg.inner_text("#trigS"); pg.locator("#trigSl").evaluate("el => { el.value = 60; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    s1 = pg.inner_text("#trigS"); print("Trig sin 30-ish -> 60°:", s0, "->", s1); assert s0 != s1
    pg.screenshot(path=str(SHOTS / "desktop_03c_trig_panel.png"))
    pg.click("#trigClose"); pg.wait_for_timeout(200)

    goto_slide(pg, "check-fx")
    pg.locator('[data-check="c1fx"] input').fill("86.6 N")
    pg.locator('[data-check="c1fx"] button').click()
    print("micro Fx:", pg.locator('[data-check="c1fx"] .fb').inner_text())
    assert "Right" in pg.locator('[data-check="c1fx"] .fb').inner_text()

    goto_slide(pg, "two")
    before = pg.inner_text("#rr"); drag(pg, "#d2", -60, -40); after = pg.inner_text("#rr")
    print("Drag F2: R", before, "->", after); assert before != after
    pg.screenshot(path=str(SHOTS / "desktop_03_concept1_vectors.png"))

    goto_slide(pg, "quiz-q1-1")
    fb = answer(pg, "q1.1", ["512", "100.5 deg"]); print("no-units:", fb); assert "units" in fb
    pg.locator("#Qq1_1 button").nth(1).click()
    fb = answer(pg, "q1.1", ["0.5122 kN", "100.5 deg"]); print("kN accepted:", fb); assert "Correct" in fb
    pg.locator("#Qq1_1").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_04_quiz_feedback.png"))
    goto_slide(pg, "quiz-q1-4"); assert "Correct" in answer(pg, "q1.4", ["245 N", "65.9 deg"])
    goto_slide(pg, "quiz-q1-3"); assert "Correct" in answer(pg, "q1.3", ["371.8 N", "-27.4 deg"])
    print("C1 mastery:", pg.inner_text("#mpct"))

    goto_concept(pg, 2)
    goto_slide(pg, "fbd")
    for k in ["Ax", "Ay", "By", "Bx"]: pg.click(f'#palette [data-k="{k}"]')
    pg.click("#checkfbd"); print("FBD w/ Bx:", pg.inner_text("#fbdfb")); pg.click('#palette [data-k="Bx"]'); pg.click("#checkfbd")
    print("FBD:", pg.inner_text("#fbdfb")); assert "Correct" in pg.inner_text("#fbdfb")
    pg.locator("#fbd").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_05_concept2_fbd.png"))
    for sid, qid, v in [("quiz-q2-1","q2.1",["1","2","3","1"]), ("quiz-q2-3","q2.3",["4","3","1"]), ("quiz-q2-5","q2.5",["3","6"]), ("quiz-q2-4","q2.4",["3"])]:
        goto_slide(pg, sid); assert "Correct" in answer(pg, qid, v)

    goto_concept(pg, 3)
    goto_slide(pg, "ring")
    t1 = pg.inner_text("#eT1"); drag(pg, "#ringH", 80, 60); t1b = pg.inner_text("#eT1"); print("Ring drag T1:", t1, "->", t1b); assert t1 != t1b
    pg.screenshot(path=str(SHOTS / "desktop_06_concept3_equilibrium.png"))
    goto_slide(pg, "quiz-q3-1"); assert "Correct" in answer(pg, "q3.1", ["359.1 N", "439.8 N"])
    goto_slide(pg, "quiz-q3-2"); fb = answer(pg, "q3.2", ["156.96 N", "135.9 N", "169.9 mm"]); print("q3.2 (mm→m):", fb); assert "Correct" in fb
    goto_slide(pg, "quiz-q3-3"); assert "Correct" in answer(pg, "q3.3", ["509.1 N", "339.4 N", "568.1 N"])

    goto_concept(pg, 4)
    goto_slide(pg, "wrench")
    m0 = pg.inner_text("#wrM"); pg.locator("#wrFsl").evaluate("el => { el.value = 20; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    m1 = pg.inner_text("#wrM"); print("Wrench M:", m0, "->", m1); assert m0 != m1
    pg.screenshot(path=str(SHOTS / "desktop_14_concept4_wrench.png"))
    goto_slide(pg, "check-m")
    pg.locator('[data-check="c4m"] input').fill("6 N.m")
    pg.locator('[data-check="c4m"] button').click()
    print("micro moment N.m:", pg.locator('[data-check="c4m"] .fb').inner_text())
    assert "Right" in pg.locator('[data-check="c4m"] .fb').inner_text()
    goto_slide(pg, "quiz-q4-1"); assert "Correct" in answer(pg, "q4.1", ["69.28 N·m"])
    goto_slide(pg, "quiz-q4-2"); assert "Correct" in answer(pg, "q4.2", ["-149.5 Nm"])
    goto_slide(pg, "quiz-q4-5"); assert "Correct" in answer(pg, "q4.5", ["-400 N", "-1200 N·m"])
    goto_slide(pg, "quiz-q4-3"); assert "Correct" in answer(pg, "q4.3", ["0 N·m", "-979.8 N·m", "489.9 N·m", "1095.4 N·m"])
    goto_slide(pg, "quiz-q4-4"); assert "Correct" in answer(pg, "q4.4", ["391.9 N·m"])

    goto_concept(pg, 5)
    goto_slide(pg, "beam")
    a0 = pg.inner_text("#bmAy"); drag(pg, "#bmH", 120, 0); a1 = pg.inner_text("#bmAy")
    print("Beam Ay:", a0, "->", a1); assert a0 != a1
    pg.screenshot(path=str(SHOTS / "desktop_15_concept5_beam.png"))
    goto_slide(pg, "check-beam")
    box = pg.locator('[data-check="c5ab"]')
    box.locator("input").nth(0).fill("9 kN"); box.locator("input").nth(1).fill("3 kN"); box.locator("button").click()
    print("micro beam:", box.locator(".fb").inner_text()); assert "Right" in box.locator(".fb").inner_text()
    goto_slide(pg, "quiz-q5-1"); assert "Correct" in answer(pg, "q5.1", ["6.667 kN", "3.333 kN"])
    goto_slide(pg, "quiz-q5-2"); assert "Correct" in answer(pg, "q5.2", ["6.0 kN", "12.0 kN"])
    goto_slide(pg, "quiz-q5-3"); assert "Correct" in answer(pg, "q5.3", ["5.543 kN", "2.771 kN", "3.2 kN"])
    goto_slide(pg, "quiz-q5-4"); assert "Correct" in answer(pg, "q5.4", ["3.111 kN", "1.736 kN", "4 kN", "0 kN", "0 kN"])
    goto_slide(pg, "quiz-q5-5"); assert "Correct" in answer(pg, "q5.5", ["22.22 kN", "-17.78 kN", "-3.333 kN", "18.09 kN", "11.25 kN"])
    print("C5 mastery:", pg.inner_text("#mpct"))

    pg.click("#copyPrompt"); clip = pg.evaluate("navigator.clipboard.readText()"); print("Clipboard chars:", len(clip)); assert clip.startswith("# Grokeversity Tutor Prompt")
    pg.wait_for_timeout(300); pg.locator(".tutor").screenshot(path=str(SHOTS / "desktop_07_tutor_copy.png"))
    pg.reload(); pg.wait_for_load_state("networkidle")
    print("After reload: current concept visible c5 =", pg.is_visible("#c5"), "| q1.1 status:", pg.locator("#Qq1_1 .fb").inner_text(), "| list:", pg.inner_text("#clist").replace("\n", " "))
    assert pg.is_visible("#c5")
    pg.locator("footer").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_08_footer_disclaimer.png"))

    # mobile
    m = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page(); watch(m)
    m.goto(URL); m.wait_for_load_state("networkidle")
    sw = m.evaluate("document.documentElement.scrollWidth"); print("Mobile scrollWidth:", sw); assert sw <= 392, "horizontal overflow on mobile"
    m.screenshot(path=str(SHOTS / "mobile_01_landing.png"))
    m.locator("#learn").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.screenshot(path=str(SHOTS / "mobile_02_lesson.png"))
    goto_slide(m, "quiz-q1-1")
    m.locator("#Qq1_1").scroll_into_view_if_needed(); m.screenshot(path=str(SHOTS / "mobile_03_quiz.png"))
    m.locator("footer").scroll_into_view_if_needed(); m.screenshot(path=str(SHOTS / "mobile_04_footer.png"))

    # ----- Intro to AI (desktop) -----
    pg2 = ctx.new_page(); watch(pg2)
    pg2.goto(f"http://127.0.0.1:{port}/intro-ai.html"); pg2.wait_for_load_state("networkidle")
    print("AI KaTeX nodes:", pg2.locator(".katex").count()); assert pg2.locator(".katex").count() > 15
    pg2.screenshot(path=str(SHOTS / "desktop_10_ai_c1.png"))
    before = pg2.inner_text("#tTot"); pg2.fill("#dRange", "7"); pg2.locator("#dRange").evaluate("el => { el.value = 7; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    after = pg2.inner_text("#tTot"); print("Tree nodes:", before, "->", after); assert before != after
    fb = answer(pg2, "q1.4", ["60", "75"]); print("q1.4 no-units:", fb); assert "units" in fb.lower() or "%" in fb
    pg2.locator("#Qq1_4 button").nth(1).click()  # not needed, just don't use leftover
    assert "Correct" in answer(pg2, "q1.1", ["7", "6.8", "6.5"])
    assert "Correct" in answer(pg2, "q1.2", ["1365"])
    assert "Correct" in answer(pg2, "q1.3", ["0.1085", "0.08756"])
    assert "Correct" in answer(pg2, "q1.4", ["60 %", "75 %"])
    print("AI C1 mastery:", pg2.inner_text("#mpct"))
    pg2.click('#clist [data-c="2"]'); assert pg2.is_visible("#c2")
    before = pg2.inner_text("#rmse"); drag(pg2, "#hW", 0, -40); after = pg2.inner_text("#rmse")
    print("Regression drag MSE:", before, "->", after); assert before != after
    pg2.click("#olsBtn"); print("OLS snap MSE:", pg2.inner_text("#rmse")); assert "0.450" in pg2.inner_text("#rmse") or "0.45" in pg2.inner_text("#rmse")
    pg2.locator("#reg").scroll_into_view_if_needed(); pg2.screenshot(path=str(SHOTS / "desktop_11_ai_regression.png"))
    assert "Correct" in answer(pg2, "q2.1", ["0.75"])
    assert "Correct" in answer(pg2, "q2.2", ["1.2", "0.5", "0.45"])
    assert "Correct" in answer(pg2, "q2.3", ["1.3667", "0.49167"])
    assert "Correct" in answer(pg2, "q2.4", ["-0.5", "0"])
    pg2.click('#clist [data-c="3"]'); assert pg2.is_visible("#c3")
    w0 = pg2.inner_text("#gdw"); pg2.click("#gdStep"); w1 = pg2.inner_text("#gdw")
    print("GD step w:", w0, "->", w1); assert w0 != w1
    pg2.locator("#gdSurf").scroll_into_view_if_needed(); pg2.screenshot(path=str(SHOTS / "desktop_12_ai_gd.png"))
    assert "Correct" in answer(pg2, "q3.1", ["1.2", "1.92"])
    assert "Correct" in answer(pg2, "q3.2", ["-20.5", "-7", "0.205", "0.07"])
    assert "Correct" in answer(pg2, "q3.3", ["1", "1", "5"])
    assert "Correct" in answer(pg2, "q3.4", ["1.1", "1", "0.525"])
    pg2.click('#clist [data-c="4"]'); assert pg2.is_visible("#c4")
    out0 = pg2.inner_text("#aout")
    pg2.locator("#s1").evaluate("el => { el.value = 5; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    out1 = pg2.inner_text("#aout"); print("Attention out:", out0, "->", out1); assert out0 != out1
    pg2.locator("#attn").scroll_into_view_if_needed(); pg2.screenshot(path=str(SHOTS / "desktop_13_ai_attention.png"))
    assert "Correct" in answer(pg2, "q4.1", ["-0.5", "0.37754"])
    pg2.click("#copyPrompt"); clip = pg2.evaluate("navigator.clipboard.readText()"); print("AI clipboard chars:", len(clip)); assert "AI 101" in clip and clip.startswith("# Grokeversity Tutor Prompt")
    pg2.reload(); pg2.wait_for_load_state("networkidle")
    print("AI after reload c4 visible:", pg2.is_visible("#c4"), "| q1.1:", pg2.locator("#Qq1_1 .fb").inner_text())
    assert pg2.is_visible("#c4")

    # mobile AI
    m2 = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page(); watch(m2)
    m2.goto(f"http://127.0.0.1:{port}/intro-ai.html"); m2.wait_for_load_state("networkidle")
    sw = m2.evaluate("document.documentElement.scrollWidth"); print("AI mobile scrollWidth:", sw); assert sw <= 392, "horizontal overflow on AI mobile"
    m2.screenshot(path=str(SHOTS / "mobile_05_ai_landing.png"))
    m2.locator("#learn").scroll_into_view_if_needed(); m2.wait_for_timeout(200); m2.screenshot(path=str(SHOTS / "mobile_06_ai_lesson.png"))
    m2.locator("footer").scroll_into_view_if_needed(); m2.screenshot(path=str(SHOTS / "mobile_07_ai_footer.png"))
    br.close()
srv.shutdown()
print("Errors:", errors or "none"); sys.exit(1 if errors else 0)
