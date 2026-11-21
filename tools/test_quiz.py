#!/usr/bin/env python3
"""Regression: Statics + Intro AI quizzes accept iOS-typed answers and never lock the learner in."""
import functools, http.server, json, pathlib, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
SHOTS = SITE / "screenshots"
SHOTS.mkdir(exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE)))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
LESSON = f"http://127.0.0.1:{PORT}/statics/unit-1.html"
AI = f"http://127.0.0.1:{PORT}/intro-ai.html"

UNLOCK = {
    "score": {
        "1": {"q1.1": 1, "q1.4": 1, "q1.3": 1},
        "2": {"q2.1": 1, "q2.3": 1, "q2.5": 1, "q2.4": 1},
        "3": {"q3.1": 1, "q3.2": 1, "q3.3": 1},
        "4": {"q4.1": 1, "q4.2": 1, "q4.5": 1, "q4.3": 1, "q4.4": 1},
        "5": {"q5.1": 1, "q5.2": 1, "q5.3": 1, "q5.4": 1, "q5.5": 1},
    },
    "current": 1,
    "slide": {},
}
UNLOCK_JS = json.dumps(UNLOCK)
AI_UNLOCK = {
    "score": {
        "1": {"q1.1": 1, "q1.2": 1, "q1.3": 1, "q1.4": 1},
        "2": {"q2.1": 1, "q2.2": 1, "q2.3": 1, "q2.4": 1},
        "3": {"q3.1": 1, "q3.2": 1, "q3.3": 1, "q3.4": 1},
        "4": {"q4.1": 1, "q4.2": 1, "q4.3": 1},
    },
    "current": 1,
}
AI_UNLOCK_JS = json.dumps(AI_UNLOCK)

IPHONE = dict(
    viewport={"width": 390, "height": 844},
    is_mobile=True,
    has_touch=True,
    device_scale_factor=3,
    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
)

PARSE_JS = r"""() => {
  const api = window.GrokeversityQuiz;
  if (!api || !api.gradeAns || !api.Q) return {error: 'GrokeversityQuiz not exported'};
  const {gradeAns, Q, formatAns} = api;
  const qs = [];
  Object.keys(Q).forEach(k => (Q[k] || []).forEach(q => qs.push(q)));
  function num(v){
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (Number.isInteger(v)) return String(v);
    const s = String(v);
    if (s.length <= 8) return s;
    return String(+v.toPrecision(6));
  }
  function variants(a){
    const v = a.v, u = a.u, n = num(v), absn = num(Math.abs(v));
    const signed = (s) => (v < 0 ? '-' + s.replace(/^[+-]/,'') : s);
    const uminus = (s) => (v < 0 ? '\u2212' + s.replace(/^[+-]/,'') : s);
    const endash = (s) => (v < 0 ? '\u2013' + s.replace(/^[+-]/,'') : s);
    const out = [];
    const add = (s, ok=true, kind='form') => out.push({s, ok, kind});
    if (u === 'count' || u === '1'){
      add(n); add(signed(n)); add(n + '.');
      if (String(v).includes('.')) add(n.replace('.', ','));
      if (v > 0) add('+' + n);
      add(n, true, 'canonical');
      return out;
    }
    if (u === '%'){
      add(n + ' %'); add(n + '%'); add(n + ' percent'); add(n + ' %.'); add(n + '\u00a0%'); add(n + ' Pct');
      add(n, false, 'missing-unit');
      return out;
    }
    if (u === 'deg'){
      add(n + ' deg'); add(n + 'deg'); add(n + '°'); add(n + ' degrees'); add(n + ' Deg');
      add(n + '\u00a0deg'); add(n + ' deg.'); add(uminus(absn) + ' deg'); add(endash(absn) + ' deg');
      add(n, false, 'missing-unit');
      return out;
    }
    const isMom = /N·m|N\.m|Nm|kN·m|kNm/i.test(u);
    const isKN = u === 'kN' || u === 'kN·m' || u === 'kN.m' || u === 'kNm';
    const isN = u === 'N' || u === 'N·m' || u === 'N.m' || u === 'Nm';
    add(formatAns(a), true, 'canonical');
    add(n + ' ' + u);
    add(n + u);
    add(n + ' ' + u.toLowerCase());
    add(n + ' ' + u.replace('kN','Kn').replace('N','n'));
    if (u === 'kN'){ add(n + ' Kn'); add(n + ' kn'); }
    add(n + '\u00a0' + u);
    add(n + '\u202f' + u);
    add(n + ' ' + u + '.');
    if (v > 0) add('+' + n + ' ' + u);
    add(uminus(absn) + ' ' + u);
    add(endash(absn) + ' ' + u);
    if (String(v).includes('.')) add(n.replace('.', ',') + ' ' + u);
    if (u === 'N'){ add(n + ' newtons'); add(n + ' Newton'); add(num(v/1000) + ' kN'); add(num(v/1000) + ' Kn'); }
    if (u === 'kN'){ add(n + ' kilonewtons'); add(num(v*1000) + ' N'); add(n + ' Kn'); }
    if (isMom){
      const base = u.startsWith('k') ? 'kN' : 'N';
      add(n + ' ' + base + '·m'); add(n + ' ' + base + '.m'); add(n + ' ' + base + 'm');
      add(n + ' ' + base + '-m'); add(n + ' ' + base + ' m');
      if (base === 'N'){ add(n + ' newton meters'); add(n + ' newton-meters'); add(num(v/1000) + ' kN·m'); }
      if (base === 'kN'){ add(num(v*1000) + ' N·m'); add(n + ' kilonewton meters'); }
    }
    add(n, false, 'missing-unit');
    return out;
  }
  const fails = [];
  let n = 0;
  qs.forEach(q => {
    q.ans.forEach(a => {
      variants(a).forEach(({s, ok, kind}) => {
        n++;
        const g = gradeAns(a, s);
        if (!!g.ok !== ok){
          fails.push({id:q.id, field:a.q, s, kind, expect:ok, got:!!g.ok, err:g.err||null});
          return;
        }
        if (kind === 'missing-unit'){
          const msg = (g.err||'').toLowerCase();
          if (!/unit/.test(msg)) fails.push({id:q.id, field:a.q, s, kind, expect:'unit hint', got:g.err});
          else if (gradeAns(a, formatAns(a)).ok && !/right|correct|add /.test(msg) && !/unit/.test(msg)) {
            fails.push({id:q.id, field:a.q, s, kind, expect:'number-right hint', got:g.err});
          }
        }
      });
    });
  });
  return {n, nq: qs.length, ids: qs.map(q=>q.id), fails};
}"""

def watch(pg, errors):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))

def goto_concept(pg, c):
    pg.click("#conceptsBtn")
    pg.wait_for_timeout(150)
    pg.click(f'#clist [data-c="{c}"]')
    pg.wait_for_timeout(250)
    assert pg.is_visible(f"#c{c}"), f"concept {c} not visible"

def goto_slide(pg, data_id):
    i = pg.evaluate("""(id) => {
      const c = [...document.querySelectorAll(".concept")].find(x => !x.hidden);
      return [...c.querySelectorAll(".slide")].findIndex(s => s.dataset.id === id);
    }""", data_id)
    assert i >= 0, f"slide {data_id} not in current concept"
    pg.locator("#dots .dot").nth(i).click()
    pg.wait_for_timeout(180)
    on = pg.locator(f'.slide[data-id="{data_id}"]').evaluate("el => el.classList.contains('on')")
    assert on, f"slide {data_id} did not become active"

def qbox(pg, qid):
    return pg.locator("#Q" + qid.replace(".", "_"))

def check_click(box):
    box.locator('[data-act="check"]').click()

def fill_forms(box, vals):
    for i, v in enumerate(vals):
        box.locator("input").nth(i).fill(v)

def typography_pass(pg, label):
    res = pg.evaluate(PARSE_JS)
    if res.get("error"):
        raise AssertionError(f"{label}: {res['error']}")
    print(f"{label} parse forms: {res['n']} checks on {res['nq']} problems")
    if res["fails"]:
        print("FAILS:", json.dumps(res["fails"][:12], ensure_ascii=False, indent=2))
    assert not res["fails"], f"{label}: {len(res['fails'])} typography/parse failures (of {res['n']})"
    assert res["nq"] in (15, 20), f"{label}: unexpected quiz count {res['nq']}"
    return res

def statics_dom_pass(pg, label, shots=False):
    typography_pass(pg, label)
    # Controls always present
    goto_concept(pg, 1)
    goto_slide(pg, "quiz-q1-1")
    box = qbox(pg, "q1.1")
    for act in ("check", "hint", "skip", "sol"):
        assert box.locator(f'[data-act="{act}"]').count() == 1, f"{label}: missing {act} on q1.1"
    # Tapping the input must focus it (not swallowed by touch guards)
    inp = box.locator("input").first
    inp.scroll_into_view_if_needed()
    pg.wait_for_timeout(80)
    try:
        inp.tap()
    except Exception:
        inp.click()
    focused = pg.evaluate("() => document.activeElement && document.activeElement.tagName")
    assert focused == "INPUT", f"{label}: input did not receive focus (active={focused})"
    # Missing units: number right, clear hint, not accepted
    fill_forms(box, ["512.2", "100.5"])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" not in fb, f"{label}: unitless accepted: {fb}"
    assert "unit" in fb.lower() and ("right" in fb.lower() or "add" in fb.lower()), f"{label}: missing-unit hint unclear: {fb}"
    # Next / Back must work while unanswered (not locked)
    assert not pg.is_disabled("#nextSlide"), f"{label}: Next disabled on mid-concept quiz"
    pg.click("#nextSlide")
    pg.wait_for_timeout(200)
    sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
    assert sid == "quiz-q1-4", f"{label}: Next did not leave quiz-q1-1, now {sid}"
    assert not pg.is_disabled("#prevSlide")
    pg.click("#prevSlide")
    pg.wait_for_timeout(200)
    sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
    assert sid == "quiz-q1-1", f"{label}: Back did not return to quiz-q1-1, now {sid}"
    # Show solution + still movable
    box.locator('[data-act="sol"]').click()
    fb = box.locator(".fb").inner_text()
    assert "Solution" in fb and "512.2" in fb, f"{label}: Show solution failed: {fb}"
    assert not pg.is_disabled("#nextSlide")
    # Enter / Go submits an iOS-flavored correct answer
    fill_forms(box, ["512,2 Kn", "100.5°"])  # 512.2 kN would be wrong; 512,2 Kn = 512.2 kN = 512200 N? WAIT
    # 512,2 Kn means 512.2 kN = 512200 N which is NOT 512.2 N. Use 0,5122 kN or 512,2 N
    fill_forms(box, ["512,2 N.", "100.5°"])
    box.locator("input").nth(1).press("Enter")
    pg.wait_for_timeout(150)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: Enter did not accept 512,2 N. / 100.5° : {fb}"
    if shots:
        pg.screenshot(path=str(SHOTS / "quiz_iphone_q1_1_accepted.png"), full_page=False)
        print("wrote", SHOTS / "quiz_iphone_q1_1_accepted.png")

    # Swipe left on a later unanswered quiz should advance
    goto_slide(pg, "quiz-q1-4")
    box = qbox(pg, "q1.4")
    box.locator("input").first.fill("")  # leave unanswered
    # swipe on the heading, not the input
    heading = pg.locator('.slide.on h2').first
    boxh = heading.bounding_box()
    assert boxh, "no heading box for swipe"
    x, y = boxh["x"] + boxh["width"]/2, boxh["y"] + boxh["height"]/2
    pg.mouse.move(x, y)
    pg.mouse.down()
    pg.mouse.move(x - 160, y, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(250)
    sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
    if sid != "quiz-q1-3":
        assert not pg.is_disabled("#nextSlide"), f"{label}: Next disabled on unanswered quiz (swipe landed on {sid})"
        pg.click("#nextSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid == "quiz-q1-3", f"{label}: could not move on from unanswered quiz, now {sid}"
        print(f"{label}: swipe did not fire, Next still moved on")
    else:
        print(f"{label}: swipe advanced unanswered quiz to {sid}")

    # Every scored problem: two typography forms accepted in the DOM
    # Pick one iOS-ish form per field
    form_js = r"""(qid) => {
      const api = window.GrokeversityQuiz;
      const q = Object.values(api.Q).flat().find(x => x.id === qid);
      const forms = q.ans.map(a => {
        const n = String(a.v);
        if (a.u === 'count' || a.u === '1') return n;
        if (a.u === 'deg') return n + '°';
        if (a.u === '%') return n + '%';
        if (a.u === 'N') return n.replace('.', ',') + '\u00a0N.';
        if (a.u === 'kN') return n + ' Kn';
        if (a.u === 'N·m' || a.u === 'N.m' || a.u === 'Nm') return (a.v<0?'\u2212':'') + String(Math.abs(a.v)) + ' N-m';
        if (a.u === 'kN·m' || a.u === 'kNm') return n + ' kN-m';
        if (a.u === 'm') return (Math.abs(a.v)>=1 ? n+' m' : String(+(a.v*1000).toPrecision(6)) + ' mm');
        return api.formatAns(a);
      });
      return forms;
    }"""
    seen = 0
    for c in range(1, 6):
        goto_concept(pg, c)
        mounts = pg.evaluate("""() => [...document.querySelectorAll('#c%d .q-mount')].map(el => el.dataset.q)""" % c)
        for qid in mounts:
            goto_slide(pg, "quiz-" + qid.replace(".", "-"))
            box = qbox(pg, qid)
            # ensure Skip/Sol exist
            assert box.locator('[data-act="skip"]').count() == 1, f"{label} {qid} missing Skip"
            assert box.locator('[data-act="sol"]').count() == 1, f"{label} {qid} missing Show solution"
            assert not pg.is_disabled("#nextSlide") or not pg.is_disabled("#prevSlide"), f"{label} {qid}: both Back and Next disabled"
            forms = pg.evaluate(form_js, qid)
            fill_forms(box, forms)
            check_click(box)
            fb = box.locator(".fb").inner_text()
            assert "Correct" in fb, f"{label} {qid} rejected iOS forms {forms}: {fb}"
            seen += 1
    assert seen == 20, f"{label}: expected 20 scored quizzes, got {seen}"
    print(f"{label}: all 20 Statics quizzes accepted an iOS-typed form; Skip/Show solution/Next present")
    return seen

def ai_dom_pass(pg, label, shots=False):
    typography_pass(pg, label)
    # q1.4 % missing units
    box = qbox(pg, "q1.4")
    box.scroll_into_view_if_needed()
    fill_forms(box, ["60", "75"])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" not in fb and "unit" in fb.lower(), f"{label} AI unitless: {fb}"
    fill_forms(box, ["60%", "75 percent"])
    box.locator("input").nth(1).press("Enter")
    pg.wait_for_timeout(150)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label} AI q1.4 60%/75 percent: {fb}"
    if shots:
        box.screenshot(path=str(SHOTS / "quiz_iphone_ai_q1_4_accepted.png"))
        print("wrote", SHOTS / "quiz_iphone_ai_q1_4_accepted.png")
    seen = 0
    form_js = r"""(qid) => {
      const api = window.GrokeversityQuiz;
      const q = Object.values(api.Q).flat().find(x => x.id === qid);
      return q.ans.map(a => {
        const n = String(a.v);
        if (a.u === '1' || a.u === 'count') return (a.v>0?'+':'') + n + (String(a.v).includes('.')?'':'.');
        if (a.u === '%') return n + '\u00a0%.';
        return api.formatAns(a);
      });
    }"""
    for c in range(1, 5):
        pg.click(f'#clist [data-c="{c}"]')
        pg.wait_for_timeout(200)
        ids = pg.evaluate("() => [...document.querySelectorAll('#quiz%d .q')].map(el => el.id)" % c)
        for elid in ids:
            qid = elid.replace("Qq", "q").replace("_", ".")
            box = pg.locator("#" + elid)
            box.scroll_into_view_if_needed()
            assert box.locator('[data-act="skip"]').count() == 1, f"{label} {qid} missing Skip"
            assert box.locator('[data-act="sol"]').count() == 1, f"{label} {qid} missing Show solution"
            forms = pg.evaluate(form_js, qid)
            fill_forms(box, forms)
            check_click(box)
            fb = box.locator(".fb").inner_text()
            assert "Correct" in fb, f"{label} {qid} rejected {forms}: {fb}"
            seen += 1
    assert seen == 15, f"{label}: expected 15 AI quizzes, got {seen}"
    # Skip does not trap
    box = qbox(pg, "q4.3")
    box.locator('[data-act="skip"]').click()
    fb = box.locator(".fb").inner_text()
    assert "Skipped" in fb, f"{label} skip: {fb}"
    print(f"{label}: all 15 AI quizzes accepted typography forms; Skip/Show solution present")
    return seen

def make_ctx(p, engine, iphone):
    if engine == "chromium":
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    elif engine == "webkit":
        br = p.webkit.launch()
    else:
        raise RuntimeError(engine)
    kw = dict(IPHONE) if iphone else dict(viewport={"width": 1280, "height": 720})
    if iphone and engine == "chromium":
        pass
    ctx = br.new_context(**kw)
    return br, ctx

def main():
    errors = []
    failed = []
    with sync_playwright() as p:
        runs = [
            ("chromium", False, False),
            ("webkit", True, True),
        ]
        for engine, iphone, shots in runs:
            label = f"{engine}-{'iphone-390x844' if iphone else '1280x720'}"
            try:
                br, ctx = make_ctx(p, engine, iphone)
            except Exception as e:
                print(f"{label} skipped: {e}")
                failed.append(f"{label} skipped: {e}")
                continue
            try:
                ctx.add_init_script("localStorage.setItem('grokeversity.v1', " + json.dumps(UNLOCK_JS) + ")")
                pg = ctx.new_page(); watch(pg, errors)
                pg.goto(LESSON, wait_until="domcontentloaded")
                pg.wait_for_timeout(500)
                statics_dom_pass(pg, "statics " + label, shots=shots)

                ctx2 = br.new_context(**(IPHONE if iphone else dict(viewport={"width": 1280, "height": 720})))
                ctx2.add_init_script("localStorage.setItem('grokeversity.ai101.v1', " + json.dumps(AI_UNLOCK_JS) + ")")
                pa = ctx2.new_page(); watch(pa, errors)
                pa.goto(AI, wait_until="domcontentloaded")
                pa.wait_for_timeout(500)
                ai_dom_pass(pa, "ai " + label, shots=shots)
                ctx2.close()
            except Exception as e:
                print(f"FAIL {label}: {e}")
                failed.append(f"{label}: {e}")
            finally:
                ctx.close()
                br.close()
    if errors:
        print("PAGE ERRORS:", errors)
    if failed or errors:
        print("FAILED")
        sys.exit(1)
    print("ALL QUIZ TESTS PASSED")

if __name__ == "__main__":
    main()
