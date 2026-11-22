#!/usr/bin/env python3
"""Headless test of the static site (served over local HTTP). Desktop 1280x800 + mobile 390x844.
Landing stays a marketing page. The Statics lesson lives on its own single-screen page
(statics/unit-1.html): document height must fit the viewport on every slide and scrollY stays 0.
Also checks beam arrow directions, human tutor messages, quiz grading, mastery, copy-prompt,
OG tags, #learn redirect, the Intro to AI lesson (unchanged), and a 46-slide graphic tour:
every interactive must have a non-empty, non-zero SVG and respond to a drag or slider."""
import http.server, json, pathlib, socketserver, sys, threading, functools
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]; SITE = ROOT / "prototype"; SHOTS = SITE / "screenshots"; SHOTS.mkdir(exist_ok=True)
for old in SHOTS.glob("*.png"): old.unlink()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/index.html"
LESSON = f"http://127.0.0.1:{port}/statics/unit-1.html"
errors = []
IGNORE_404 = ("assets/audio/intro.mp3", "assets/favicon.svg")
def skip_net(url):
    return any(s in url for s in IGNORE_404)
def req_failed(r):
    url = r.url
    if skip_net(url): return
    if "fonts/KaTeX_" in url: return
    err = ""
    try:
        err = (r.failure.error_text if r.failure else "") or ""
    except Exception:
        err = ""
    if "ERR_ABORTED" in err or "NS_BINDING_ABORTED" in err: return
    # In-flight document requests are cancelled when the test navigates again.
    path = url.split("?")[0]
    if path.endswith(("index.html", "unit-1.html", "intro-ai.html", "/")): return
    errors.append(f"requestfailed: {url} {err}")
def watch(pg):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
    pg.on("requestfailed", req_failed)
    pg.on("response", lambda r: r.status >= 400 and not skip_net(r.url) and "fonts/KaTeX_" not in r.url and errors.append(f"HTTP {r.status}: {r.url}"))
def answer(pg, qid, vals):
    loc = pg.locator("#Q" + qid.replace(".", "_"))
    for i, v in enumerate(vals): loc.locator("input").nth(i).fill(v)
    loc.locator('[data-act="check"], button.btn').first.click(); return loc.locator(".fb").inner_text()
def drag(pg, sel, dx, dy):
    pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'instant'}})"); pg.wait_for_timeout(150)
    b = pg.locator(sel).bounding_box(); assert b, f"no box for {sel}"
    x, y = b["x"] + b["width"]/2, b["y"] + b["height"]/2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx, y + dy, steps=10); pg.mouse.up()
def goto_concept(pg, c):
    pg.click("#conceptsBtn"); pg.wait_for_timeout(200)
    pg.click(f'#clist [data-c="{c}"]'); pg.wait_for_timeout(280)
    assert pg.is_visible(f"#c{c}"), f"concept {c} not visible"
def goto_slide(pg, data_id):
    i = pg.evaluate("""(id) => {
      const c = [...document.querySelectorAll(".concept")].find(x => !x.hidden);
      return [...c.querySelectorAll(".slide")].findIndex(s => s.dataset.id === id);
    }""", data_id)
    assert i >= 0, f"slide {data_id} not in current concept"
    pg.locator("#dots .dot").nth(i).click(); pg.wait_for_timeout(200)
    on = pg.locator(f'.slide[data-id="{data_id}"]').evaluate("el => el.classList.contains('on')")
    assert on, f"slide {data_id} did not become active"
def assert_fits(pg, label, check_width=None):
    info = pg.evaluate("""() => ({
      sh: document.documentElement.scrollHeight,
      bh: document.body.scrollHeight,
      ih: window.innerHeight,
      iw: window.innerWidth,
      sw: document.documentElement.scrollWidth,
      y: window.scrollY,
      x: window.scrollX
    })""")
    if info["sh"] > info["ih"] + 1 or info["y"] != 0:
        print("FIT FAIL", label, info)
    assert info["y"] == 0, f"{label}: scrollY={info['y']}"
    assert info["sh"] <= info["ih"] + 1, f"{label}: document height {info['sh']} > viewport {info['ih']}"
    if check_width is not None:
        assert info["sw"] <= check_width, f"{label}: scrollWidth {info['sw']} > {check_width}"

def assert_header_pinned(pg, label):
    info = pg.evaluate("""() => {
      const h = document.querySelector('.lesson-top') || document.querySelector('header.top') || document.querySelector('header');
      const r = h && h.getBoundingClientRect();
      const app = document.getElementById('lessonApp');
      const cs = app && getComputedStyle(app);
      return {
        y: window.scrollY,
        x: window.scrollX,
        top: r ? r.top : null,
        transform: cs ? cs.transform : '',
        appInline: app ? (app.style.transform || '') : ''
      };
    }""")
    assert info["y"] == 0, f"{label}: scrollY={info['y']} ({info})"
    assert info["x"] == 0, f"{label}: scrollX={info['x']}"
    assert info["top"] is not None and -1 <= info["top"] <= 2, f"{label}: header top={info['top']} ({info})"
    t = info["transform"] or "none"
    assert t in ("none", "matrix(1, 0, 0, 1, 0, 0)"), f"{label}: lessonApp transform {t}"
    return info

def recover_from_simulated_shift(pg, label):
    pg.evaluate("window.scrollTo(0, 140)")
    pg.wait_for_timeout(30)
    pg.evaluate("""() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      if (window.visualViewport) {
        visualViewport.dispatchEvent(new Event('resize'));
        visualViewport.dispatchEvent(new Event('scroll'));
      }
    }""")
    pg.wait_for_timeout(80)
    assert_header_pinned(pg, label)

UNLOCK = {
    "score": {
        "1": {"q1.1": 1, "q1.4": 1, "q1.3": 1},
        "2": {"q2.1": 1, "q2.3": 1, "q2.5": 1, "q2.4": 1},
        "3": {"q3.1": 1, "q3.2": 1, "q3.3": 1},
        "4": {"q4.1": 1, "q4.2": 1, "q4.5": 1, "q4.3": 1, "q4.4": 1},
        "5": {},
    },
    "current": 1,
    "slide": {},
}
UNLOCK_JS = json.dumps(UNLOCK)

def height_tour(pg, label, width_limit=None):
    n = 0
    for c in range(1, 6):
        goto_concept(pg, c)
        dots = pg.locator("#dots .dot")
        count = dots.count()
        for i in range(count):
            dots.nth(i).click(); pg.wait_for_timeout(120)
            sid = pg.evaluate("() => document.querySelector('.slide.on')?.dataset.id || '?'")
            assert_fits(pg, f"{label} c{c}#{i+1} {sid}", check_width=width_limit)
            n += 1
    print(f"{label}: {n} slides fit the viewport, scrollY=0")
    return n

# Every concept slide that has an svg.diagram must render it (non-zero size,
# non-empty markup, a valid getScreenCTM) and respond to a drag, slider, or tap.
INTERACT = {
    "hook": ("#ropeH", "drag"),
    "force": ("#oneH", "drag"),
    "split": ("#splitH", "drag"),
    "triangle": ("#triH", "drag"),
    "two": ("#d2", "drag"),
    "sign": ("#signSvg [data-tap='wall']", "click"),
    "isolate": ("#isoPal button", "click"),
    "fbd": ("#palette [data-k='Ay']", "click"),
    "hang": ("#hangH", "drag"),
    "ring": ("#ringH", "drag"),
    "seesaw": ("#seeH", "drag"),
    "wrench": ("#wrFsl", "slider"),
    "angled": ("#angSl", "slider"),
    "plank": ("#plBox", "drag"),
    "beam": ("#bmH", "drag"),
}

def slide_graphics(pg):
    return pg.evaluate("""() => {
      const c=document.querySelector('.concept:not([hidden])');
      const s=(c && c.querySelector('.slide.on')) || document.querySelector('.slide.on');
      if(!s) return {id:null, diags:[], snapshot:''};
      const diags=[...s.querySelectorAll('svg.diagram')].map(el=>{
        const r=el.getBoundingClientRect();
        const ctm=el.getScreenCTM && el.getScreenCTM();
        let painted=0;
        el.querySelectorAll('line,rect,circle,polygon,path,text').forEach(k=>{
          const kr=k.getBoundingClientRect();
          const w=Math.max(0, Math.min(r.right,kr.right)-Math.max(r.left,kr.left));
          const h=Math.max(0, Math.min(r.bottom,kr.bottom)-Math.max(r.top,kr.top));
          painted += w*h;
        });
        return {id:el.id, w:r.width, h:r.height, kids:el.childElementCount,
                html:(el.innerHTML||'').trim().length, ctm:!!ctm, painted};
      });
      const svg=s.querySelector('svg.diagram');
      return {id:s.dataset.id, snapshot:(svg?svg.innerHTML:'') + '\\n' + s.innerText, diags};
    }""")

def assert_graphics(info, label):
    for d in info["diags"]:
        assert d["w"] >= 80 and d["h"] >= 80, f"{label} {info['id']} #{d['id']} size {d['w']:.1f}x{d['h']:.1f}"
        assert d["kids"] > 0 and d["html"] > 0, f"{label} {info['id']} #{d['id']} empty"
        assert d["ctm"], f"{label} {info['id']} #{d['id']} getScreenCTM() is null"
        assert d.get("painted", 0) >= 400, f"{label} {info['id']} #{d['id']} graphic is clipped or blank (painted={d.get('painted')})"

def interact_slide(pg, info, label):
    sid = info["id"]
    spec = INTERACT.get(sid)
    if not spec:
        return "skip"
    sel, kind = spec
    before = info["snapshot"]
    if kind == "drag":
        drag(pg, sel, 50, -40)
    elif kind == "slider":
        pg.locator(sel).evaluate("""el => {
          const min=+el.min, max=+el.max, step=+el.step||1;
          let v=+el.value + Math.max(step, (max-min)/5);
          if(v>max) v=min+Math.max(step,(max-min)/5);
          el.value=String(v);
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }""")
        pg.wait_for_timeout(80)
    elif kind == "click":
        pg.locator(sel).first.click()
        pg.wait_for_timeout(80)
    after = slide_graphics(pg)["snapshot"]
    assert after != before, f"{label} {sid}: {kind} on {sel} did not change the graphic or readout"
    return kind

def graphic_tour(pg, label, click_next=True):
    """Click through all 46 slides and assert every interactive graphic."""
    n = 0
    n_diag = 0
    n_act = 0
    for c in range(1, 6):
        goto_concept(pg, c)
        dots = pg.locator("#dots .dot")
        dots.nth(0).click(); pg.wait_for_timeout(450)
        count = dots.count()
        for i in range(count):
            if i > 0:
                if click_next:
                    assert not pg.is_disabled("#nextSlide"), f"{label} c{c} Next disabled early at slide {i}"
                    pg.click("#nextSlide")
                else:
                    pg.locator("#dots .dot").nth(i).click()
                pg.wait_for_timeout(450)
            info = slide_graphics(pg)
            assert_graphics(info, f"{label} c{c}#{i+1}")
            if info["diags"]:
                n_diag += 1
            kind = interact_slide(pg, info, f"{label} c{c}#{i+1}")
            if kind and kind != "skip":
                n_act += 1
            n += 1
    print(f"{label}: {n} slides, {n_diag} diagrams rendered, {n_act} interactions responded")
    assert n == 46, f"{label}: expected 46 slides, got {n}"
    assert n_diag >= 15, f"{label}: expected >=15 diagrams, got {n_diag}"
    assert n_act >= 15, f"{label}: expected >=15 interactions, got {n_act}"
    return n

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 1280, "height": 800})
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=f"http://127.0.0.1:{port}")
    pg = ctx.new_page(); watch(pg)
    pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.scrollBehavior='auto')")
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    og = pg.evaluate("[...document.querySelectorAll('meta[property^=og],meta[name^=twitter]')].map(m=>(m.getAttribute('property')||m.name)+'='+m.content)")
    print("OG/Twitter tags:", len(og)); assert any("og:image=" in t for t in og) and any("summary_large_image" in t for t in og)
    assert pg.locator("#lessonApp").count() == 0 and pg.locator("#c1").count() == 0
    href = pg.get_attribute("a[href*='statics/unit-1.html']", "href")
    print("Start Statics href:", href); assert href and "statics/unit-1.html" in href
    assert "Start Statics" in pg.inner_text("body")
    assert pg.locator("#introAudio").count() == 0
    requested = pg.evaluate("performance.getEntriesByType('resource').map(e=>e.name).join('\\n')")
    assert "intro.mp3" not in requested, "intro.mp3 must not autoplay or preload"
    ai = pg.locator("#card-ai")
    assert ai.count() == 1
    tag, href_ai, aria, pe, cur, text = ai.evaluate("""el => [
      el.tagName, el.getAttribute('href'), el.getAttribute('aria-disabled'),
      getComputedStyle(el).pointerEvents, getComputedStyle(el).cursor, el.innerText
    ]""")
    print("AI card:", tag, href_ai, aria, pe, cur)
    assert tag != "A" and not href_ai, f"AI card should not be a link: {tag} {href_ai}"
    assert aria == "true"
    assert pe == "none"
    assert cur in ("default", "auto")
    assert "Coming soon" in text and "Introduction to AI" in text
    home_hrefs = pg.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '')")
    joined = " ".join(home_hrefs)
    assert all("intro-ai.html" not in (h or "") for h in home_hrefs), f"home still links to intro-ai.html: {home_hrefs}"
    assert "github.com/ANKELA/grokeversity" in joined
    assert "about.html" in joined
    body = pg.inner_text("body")
    assert "Not an accredited degree" in body and "not affiliated with xAI" in body
    assert "completion certificate" in body.lower() or "completion certificates" in body.lower()
    hdesk = pg.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
    print("home desktop scrollHeight:", hdesk)
    assert hdesk <= 850, f"home should fit ~1 desktop screen (800px), got {hdesk}"
    assert_header_pinned(pg, "home desktop")
    pg.screenshot(path=str(SHOTS / "desktop_01_landing.png"))
    pg.goto(f"http://127.0.0.1:{port}/about.html"); pg.wait_for_load_state("networkidle")
    assert "Play now" in pg.inner_text("#trackGrid")
    assert "Coming soon" in pg.inner_text("#aiGrid")
    about_hrefs = pg.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '')")
    assert all("intro-ai.html" not in (h or "") for h in about_hrefs), f"about still links to intro-ai.html: {about_hrefs}"
    pg.locator("#tracks").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_09_track_cards.png"))
    pg.locator("#track").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_02_track_map.png"))
    pg.goto(URL); pg.wait_for_load_state("networkidle")

    pg.goto(URL + "#learn"); pg.wait_for_url("**/statics/unit-1.html**", timeout=8000); pg.wait_for_load_state("networkidle")
    print("Redirect #learn ->", pg.url); assert "statics/unit-1.html" in pg.url

    pg.goto(LESSON); pg.wait_for_load_state("networkidle")
    assert pg.locator("#lessonApp").count() == 1
    assert "ME 201 Statics › Unit 1 › Concept 1" in pg.inner_text("#crumb")
    assert_fits(pg, "desktop lesson hook")
    assert pg.locator('.slide[data-id="hook"]').evaluate("el => el.classList.contains('on')")
    drag(pg, "#ropeH", -20, -80)
    pg.screenshot(path=str(SHOTS / "desktop_03b_hook_rope.png"))
    assert_header_pinned(pg, "desktop after rope drag")
    recover_from_simulated_shift(pg, "desktop after rope drag shift")
    pg.click("#trigBtn"); pg.wait_for_timeout(200)
    assert pg.locator("#trigPanel").evaluate("el => el.classList.contains('on')")
    s0 = pg.inner_text("#trigS"); pg.locator("#trigSl").evaluate("el => { el.value = 60; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    s1 = pg.inner_text("#trigS"); print("Trig sin:", s0, "->", s1); assert s0 != s1
    pg.screenshot(path=str(SHOTS / "desktop_03c_trig_panel.png"))
    pg.click("#trigClose"); pg.wait_for_timeout(200)

    goto_slide(pg, "check-fx")
    pg.locator('[data-check="c1fx"] input').fill("86.6 N")
    pg.locator('[data-check="c1fx"] [data-act="check"], [data-check="c1fx"] button.btn').first.click()
    print("micro Fx:", pg.locator('[data-check="c1fx"] .fb').inner_text())
    assert "Right" in pg.locator('[data-check="c1fx"] .fb').inner_text()

    goto_slide(pg, "two")
    before = pg.inner_text("#rr"); drag(pg, "#d2", -60, -40); after = pg.inner_text("#rr")
    print("Drag F2: R", before, "->", after); assert before != after
    pg.screenshot(path=str(SHOTS / "desktop_03_concept1_vectors.png"))

    goto_slide(pg, "quiz-q1-1")
    fb = answer(pg, "q1.1", ["512", "100.5 deg"]); print("default-unit menu:", fb); assert "Correct" in fb
    pg.locator("#Qq1_1 button").nth(1).click()
    fb = answer(pg, "q1.1", ["0.5122 kN", "100.5 deg"]); print("kN accepted:", fb); assert "Correct" in fb
    fb = answer(pg, "q1.1", ["512 N", "101 deg"]); print("integer round:", fb); assert "Correct" in fb
    fb = answer(pg, "q1.1", ["512 N", "100 deg"]); print("half-even other side:", fb); assert "Correct" in fb
    pg.locator("#Qq1_1").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / "desktop_04_quiz_feedback.png"))
    goto_slide(pg, "quiz-q1-4"); assert "Correct" in answer(pg, "q1.4", ["245 N", "65.9 deg"])
    goto_slide(pg, "quiz-q1-3"); assert "Correct" in answer(pg, "q1.3", ["371.8 N", "-27.4 deg"])
    print("C1 mastery:", pg.inner_text("#mpct"))
    assert_header_pinned(pg, "desktop after C1 quizzes")
    recover_from_simulated_shift(pg, "desktop after C1 quizzes shift")

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
    wr = pg.evaluate("""() => { const a=document.querySelector('#wrFarr'); return a && (+a.getAttribute('y2') > +a.getAttribute('y1')); }""")
    print("Wrench force points down:", wr); assert wr
    pg.screenshot(path=str(SHOTS / "desktop_14_concept4_wrench.png"))
    goto_slide(pg, "check-m")
    pg.locator('[data-check="c4m"] input').fill("6 N.m")
    pg.locator('[data-check="c4m"] [data-act="check"], [data-check="c4m"] button.btn').first.click()
    print("micro moment N.m:", pg.locator('[data-check="c4m"] .fb').inner_text())
    assert "Right" in pg.locator('[data-check="c4m"] .fb').inner_text()
    goto_slide(pg, "quiz-q4-1"); assert "Correct" in answer(pg, "q4.1", ["69.28 N·m"])
    goto_slide(pg, "quiz-q4-2"); assert "Correct" in answer(pg, "q4.2", ["-149.5 Nm"])
    goto_slide(pg, "quiz-q4-5"); assert "Correct" in answer(pg, "q4.5", ["-400 N", "-1200 N·m"])
    goto_slide(pg, "quiz-q4-3"); assert "Correct" in answer(pg, "q4.3", ["0 N·m", "-979.8 N·m", "489.9 N·m", "1095.4 N·m"])
    goto_slide(pg, "quiz-q4-4"); assert "Correct" in answer(pg, "q4.4", ["391.9 N·m"])
    chat = pg.inner_text("#chat")
    print("Tutor chat (should be human, no q4.1):", chat.replace("\\n"," | ")[:300])
    assert "q4.1" not in chat and "q4.2" not in chat

    goto_concept(pg, 5)
    goto_slide(pg, "beam")
    arrows = pg.evaluate("""() => {
      const load=document.querySelector('#bmLoad'), ay=document.querySelector('#bmAyArr'), by=document.querySelector('#bmByArr');
      return {
        loadDown: load && +load.getAttribute('y2') > +load.getAttribute('y1'),
        ayUp: ay && +ay.getAttribute('y2') < +ay.getAttribute('y1'),
        byUp: by && +by.getAttribute('y2') < +by.getAttribute('y1'),
        text: (document.querySelector('#bmSum')||{}).innerText||''
      };
    }""")
    print("Beam arrows:", arrows)
    assert arrows["loadDown"] and arrows["ayUp"] and arrows["byUp"]
    assert "ΣF_y" in arrows["text"] and "ΣM_A" in arrows["text"] and "B_y" in arrows["text"]
    a0 = pg.inner_text("#bmAy"); drag(pg, "#bmH", 120, 0); a1 = pg.inner_text("#bmAy")
    print("Beam Ay:", a0, "->", a1); assert a0 != a1
    pg.wait_for_timeout(500); pg.screenshot(path=str(SHOTS / "desktop_15_concept5_beam.png"))
    goto_slide(pg, "check-beam")
    box = pg.locator('[data-check="c5ab"]')
    box.locator("input").nth(0).fill("9 kN"); box.locator("input").nth(1).fill("3 kN"); box.locator('[data-act="check"], button.btn').first.click()
    print("micro beam:", box.locator(".fb").inner_text()); assert "Right" in box.locator(".fb").inner_text()
    goto_slide(pg, "quiz-q5-1"); assert "Correct" in answer(pg, "q5.1", ["6.667 kN", "3.333 kN"])
    goto_slide(pg, "quiz-q5-2"); assert "Correct" in answer(pg, "q5.2", ["6.0 kN", "12.0 kN"])
    goto_slide(pg, "quiz-q5-3"); assert "Correct" in answer(pg, "q5.3", ["5.543 kN", "2.771 kN", "3.2 kN"])
    goto_slide(pg, "quiz-q5-4"); assert "Correct" in answer(pg, "q5.4", ["3.111 kN", "1.736 kN", "4 kN", "0 kN", "0 kN"])
    goto_slide(pg, "quiz-q5-5"); assert "Correct" in answer(pg, "q5.5", ["22.22 kN", "-17.78 kN", "-3.333 kN", "18.09 kN", "11.25 kN"])
    print("C5 mastery:", pg.inner_text("#mpct"))

    pg.click("#tutorBtn"); pg.wait_for_timeout(200)
    pg.click("#copyPrompt"); clip = pg.evaluate("navigator.clipboard.readText()"); print("Clipboard chars:", len(clip)); assert clip.startswith("# Grokeversity Tutor Prompt")
    pg.wait_for_timeout(300); pg.locator("#tutorDrawer").screenshot(path=str(SHOTS / "desktop_07_tutor_copy.png"))
    pg.reload(); pg.wait_for_load_state("networkidle")
    print("After reload: c5 visible =", pg.is_visible("#c5"), "| url:", pg.url, "| q1.1:", pg.locator("#Qq1_1 .fb").inner_text())
    assert pg.is_visible("#c5")

    ctxH = br.new_context(viewport={"width": 1280, "height": 800})

    ctxH.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
    ph = ctxH.new_page(); watch(ph)
    ph.goto(LESSON); ph.wait_for_load_state("networkidle"); ph.wait_for_timeout(300)
    n_desk = height_tour(ph, "desktop")
    ctxH.close()

    # Regression: click Next through all 46 slides at the viewports a real PC uses.
    # 1280x720 is short enough that a 0-height SVG (height:auto while hidden) would fail.
    for w, h, name in ((1280, 720, "chrome1280x720"), (1366, 768, "chrome1366x768"), (1920, 1080, "chrome1920x1080")):
        ctxG = br.new_context(viewport={"width": w, "height": h})
        ctxG.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
        g = ctxG.new_page(); watch(g)
        g.goto(LESSON); g.wait_for_load_state("networkidle"); g.wait_for_timeout(400)
        graphic_tour(g, name)
        ctxG.close()

    for engine, name in (("firefox", "firefox1280x720"), ("webkit", "webkit1280x720")):
        try:
            fx = getattr(p, engine).launch()
        except Exception as e:
            print(f"{name} skipped (browser not launchable): {e}")
            continue
        try:
            ctxF = fx.new_context(viewport={"width": 1280, "height": 720})
            ctxF.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
            gf = ctxF.new_page(); watch(gf)
            gf.goto(LESSON); gf.wait_for_load_state("networkidle"); gf.wait_for_timeout(400)
            graphic_tour(gf, name)
            ctxF.close()
        finally:
            fx.close()

    IPHONE = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=3,
                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1")
    ctxI = br.new_context(**IPHONE)
    ctxI.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
    gi = ctxI.new_page(); watch(gi)
    gi.goto(LESSON); gi.wait_for_load_state("networkidle"); gi.wait_for_timeout(400)
    graphic_tour(gi, "chrome-iphone-390x844")
    ctxI.close()
    try:
        wk = p.webkit.launch()
        ctxW = wk.new_context(**IPHONE)
        ctxW.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
        gw = ctxW.new_page(); watch(gw)
        gw.goto(LESSON); gw.wait_for_load_state("networkidle"); gw.wait_for_timeout(400)
        graphic_tour(gw, "webkit-iphone-390x844")
        ctxW.close()
        wk.close()
    except Exception as e:
        print("webkit-iphone-390x844 skipped (browser not launchable):", e)

    ctxM = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctxM.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
    m = ctxM.new_page(); watch(m)
    m.goto(LESSON); m.wait_for_load_state("networkidle"); m.wait_for_timeout(300)
    sw = m.evaluate("document.documentElement.scrollWidth"); print("Mobile lesson scrollWidth:", sw); assert sw <= 392, "horizontal overflow on mobile lesson"
    assert_fits(m, "mobile hook", check_width=392)
    assert_header_pinned(m, "mobile hook")
    recover_from_simulated_shift(m, "mobile hook shift")
    try:
        drag(m, "#ropeH", -20, -80)
    except Exception:
        pass
    assert_header_pinned(m, "mobile after rope drag")
    m.screenshot(path=str(SHOTS / "mobile_02_lesson.png"))
    goto_concept(m, 5); goto_slide(m, "beam"); m.wait_for_timeout(500)
    assert_fits(m, "mobile beam", check_width=392)
    m.screenshot(path=str(SHOTS / "mobile_08_beam.png"))
    n_mob = height_tour(m, "mobile", width_limit=392)
    goto_concept(m, 1); goto_slide(m, "quiz-q1-1")
    m.screenshot(path=str(SHOTS / "mobile_03_quiz.png"))
    ctxM.close()

    mL = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page(); watch(mL)
    mL.goto(URL); mL.wait_for_load_state("networkidle")
    sw = mL.evaluate("document.documentElement.scrollWidth"); print("Mobile landing scrollWidth:", sw); assert sw <= 392, "horizontal overflow on mobile landing"
    hmob = mL.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
    print("home iPhone scrollHeight:", hmob)
    assert hmob <= 1266, f"home should fit ~1.5 iPhone screens (1266px), got {hmob}"
    assert_header_pinned(mL, "home iPhone")
    mL.screenshot(path=str(SHOTS / "mobile_01_landing.png"))
    mL.locator("footer").scroll_into_view_if_needed(); mL.screenshot(path=str(SHOTS / "mobile_04_footer.png"))

    pg2 = ctx.new_page(); watch(pg2)
    pg2.goto(f"http://127.0.0.1:{port}/intro-ai.html"); pg2.wait_for_load_state("networkidle")
    print("AI KaTeX nodes:", pg2.locator(".katex").count()); assert pg2.locator(".katex").count() > 15
    pg2.screenshot(path=str(SHOTS / "desktop_10_ai_c1.png"))
    before = pg2.inner_text("#tTot"); pg2.fill("#dRange", "7"); pg2.locator("#dRange").evaluate("el => { el.value = 7; el.dispatchEvent(new Event('input',{bubbles:true})); }")
    after = pg2.inner_text("#tTot"); print("Tree nodes:", before, "->", after); assert before != after
    fb = answer(pg2, "q1.4", ["60", "75"]); print("q1.4 default % menu:", fb); assert "Correct" in fb
    pg2.locator("#Qq1_4 button").nth(1).click()
    assert "Correct" in answer(pg2, "q1.1", ["7", "6.8", "6.5"])
    assert "Correct" in answer(pg2, "q1.2", ["1365"])
    assert "Correct" in answer(pg2, "q1.3", ["11 %", "9 %"])
    assert "Correct" in answer(pg2, "q1.3", ["10.85 %", "8.756 %"])
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

    m2 = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page(); watch(m2)
    m2.goto(f"http://127.0.0.1:{port}/intro-ai.html"); m2.wait_for_load_state("networkidle")
    sw = m2.evaluate("document.documentElement.scrollWidth"); print("AI mobile scrollWidth:", sw); assert sw <= 392, "horizontal overflow on AI mobile"
    m2.screenshot(path=str(SHOTS / "mobile_05_ai_landing.png"))
    m2.locator("#learn").scroll_into_view_if_needed(); m2.wait_for_timeout(200); m2.screenshot(path=str(SHOTS / "mobile_06_ai_lesson.png"))
    m2.locator("footer").scroll_into_view_if_needed(); m2.screenshot(path=str(SHOTS / "mobile_07_ai_footer.png"))
    br.close()
srv.shutdown()
print("Errors:", errors or "none"); sys.exit(1 if errors else 0)
