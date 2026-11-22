#!/usr/bin/env python3
"""Regression: Statics + Intro AI quizzes accept iOS-typed answers and never lock the learner in."""
import functools, http.server, json, pathlib, socketserver, sys, threading, traceback
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_home_links import home_links_pass, assert_home_header
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
LESSON_C1 = LESSON + "?c=1#s1"
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
  const api = window.GrokiversityQuiz;
  if (!api || !api.gradeAns || !api.Q) return {error: 'GrokiversityQuiz not exported'};
  const {gradeAns, Q, formatAns, formatExact, usesIntRound, intTargets} = api;
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
    const emdash = (s) => (v < 0 ? '\u2014' + s.replace(/^[+-]/,'') : s);
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
      add(n, true, 'bare');
      return out;
    }
    if (u === 'deg'){
      add(n + ' deg'); add(n + 'deg'); add(n + '°'); add(n + ' degrees'); add(n + ' Deg');
      add(n + '\u00a0deg'); add(n + ' deg.'); add(uminus(absn) + ' deg'); add(endash(absn) + ' deg'); add(emdash(absn) + ' deg');
      add(n, true, 'bare');
      return out;
    }
    const isMom = /N·m|N\.m|Nm|kN·m|kNm/i.test(u);
    const isKN = u === 'kN' || u === 'kN·m' || u === 'kN.m' || u === 'kNm';
    const isN = u === 'N' || u === 'N·m' || u === 'N.m' || u === 'Nm';
    add(formatExact ? formatExact(a) : formatAns(a, true), true, 'canonical');
    if(usesIntRound && usesIntRound(a) && intTargets){
      const unit=(a.u==='deg')?' deg':(a.u==='1'||a.u==='count'?'':(a.u==='%'?' %':(' '+a.u)));
      intTargets(a.v).forEach(t => add(String(t)+unit, true, 'rounded'));
    }
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
    add(emdash(absn) + ' ' + u);
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
    add(n, true, 'bare');
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
    def _hide_fun():
        try:
            pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")
        except Exception:
            pass
    try:
        pg.add_locator_handler(pg.locator(".fun-overlay:not([hidden])"), _hide_fun)
    except Exception:
        pass


def dismiss_fun(pg):
    try:
        pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")
    except Exception:
        pass

def goto_concept(pg, c):
    dismiss_fun(pg)
    pg.click("#conceptsBtn")
    pg.wait_for_timeout(150)
    pg.click(f'#clist [data-c="{c}"]')
    pg.wait_for_timeout(250)
    assert pg.is_visible(f"#c{c}"), f"concept {c} not visible"

def goto_slide(pg, data_id):
    dismiss_fun(pg)
    pg.evaluate("""() => {
      document.querySelectorAll('.drawer.on, .drawer-back.on').forEach(el => el.classList.remove('on'));
    }""")
    i = pg.evaluate("""(id) => {
      const c = [...document.querySelectorAll(".concept")].find(x => !x.hidden);
      return [...c.querySelectorAll(".slide")].findIndex(s => s.dataset.id === id);
    }""", data_id)
    assert i >= 0, f"slide {data_id} not in current concept"
    pg.locator("#dots .dot").nth(i).click()
    slide = pg.locator(f'.slide[data-id="{data_id}"]')
    pg.wait_for_function(
        """(id) => { const s=document.querySelector('.slide[data-id="'+id+'"]'); return !!(s && s.classList.contains('on') && getComputedStyle(s).visibility!=='hidden' && getComputedStyle(s).opacity!=='0'); }""",
        arg=data_id,
        timeout=8000,
    )
    pg.wait_for_timeout(80)
    on = slide.evaluate("el => el.classList.contains('on')")
    assert on, f"slide {data_id} did not become active"

def qbox(pg, qid):
    return pg.locator("#Q" + qid.replace(".", "_"))

def reveal_el(pg, locator):
    """Scroll a quiz field into view inside the overflow:auto lesson slide (needed on WebKit)."""
    handle = locator.element_handle()
    if handle:
        pg.evaluate("(el) => { el.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'}); }", handle)
    locator.scroll_into_view_if_needed()
    locator.wait_for(state="visible", timeout=8000)

def check_click(box):
    box.locator('[data-act="check"]').click()

def fill_forms(box, vals):
    pg = box.page
    for i, v in enumerate(vals):
        inp = box.locator("input").nth(i)
        reveal_el(pg, inp)
        inp.fill(v)



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
        appInline: app ? (app.style.transform || '') : '',
        kb: document.documentElement.classList.contains('kb-open')
      };
    }""")
    assert info["y"] == 0, f"{label}: scrollY={info['y']} ({info})"
    assert info["x"] == 0, f"{label}: scrollX={info['x']}"
    assert info["top"] is not None and -1 <= info["top"] <= 2, f"{label}: header top={info['top']} ({info})"
    t = info["transform"] or "none"
    assert t in ("none", "matrix(1, 0, 0, 1, 0, 0)"), f"{label}: lessonApp transform {t}"
    assert not info["appInline"] or info["appInline"] == "none", f"{label}: inline transform {info['appInline']}"
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

def assert_field_font(pg, label):
    sizes = pg.evaluate("""() => [...document.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')].map(el => parseFloat(getComputedStyle(el).fontSize))""")
    bad = [s for s in sizes if s < 16]
    assert not bad, f"{label}: input/select font-size < 16px: {sizes[:12]}"


def rounding_pass(pg, label, course):
    res = pg.evaluate("""(course) => {
      const api = window.GrokiversityQuiz;
      const {gradeAns, Q, usesIntRound, intTargets, formatAns} = api;
      const qs = Object.values(Q).flat();
      const fails = [];
      let n = 0;
      qs.forEach(q => q.ans.forEach(a => {
        const unitPart = (a.u==='count'||a.u==='1') ? '' : (a.u==='%'?' %':(a.u==='deg'?' deg':(' '+a.u)));
        // precise still works
        n++;
        const exact = gradeAns(a, String(a.v)+unitPart);
        if(!exact.ok) fails.push({id:q.id, field:a.q, kind:'precise', s:String(a.v)+unitPart, err:exact.err});
        if(usesIntRound(a)){
          const ts = intTargets(a.v);
          ts.forEach(t => {
            n++;
            const s = String(t)+unitPart;
            const g = gradeAns(a, s);
            if(!g.ok) fails.push({id:q.id, field:a.q, kind:'rounded', s, err:g.err, format:formatAns(a)});
          });
        } else if(a.u!=='count' && Math.abs(a.v-Math.round(a.v))>1e-9){
          // exempt small non-integers: rounded value must NOT be accepted unless within 1%
          const t = Math.round(a.v)===0 && a.v<0 ? -1 : Math.round(a.v);
          // JS Math.round for +ve is fine; skip if that integer is within existing tol
          const s = String(t)+unitPart;
          n++;
          const g = gradeAns(a, s);
          const within = (a.ta!==undefined) ? Math.abs(t-a.v)<=a.ta+1e-9
            : Math.abs(t-a.v)<=((a.tp||1)/100)*Math.abs(a.v||1);
          if(g.ok && !within) fails.push({id:q.id, field:a.q, kind:'exempt-should-reject', s, err:g.err});
        }
      }));
      return {n, fails, course, nq: qs.length};
    }""", course)
    print(f"{label} rounding: {res['n']} checks on {res['nq']} problems")
    if res["fails"]:
        print("ROUND FAILS:", __import__('json').dumps(res["fails"][:15], ensure_ascii=False, indent=2))
    assert not res["fails"], f"{label}: {len(res['fails'])} rounding failures"
    return res


def random_quiz_pass(pg, label, course="statics"):
    """Seed persistence, Try a new one, shuffle is a stored permutation, diagrams follow values."""
    api = "window.GrokeQuizRand"
    assert pg.evaluate(f"() => !!({api} && {api}.get)"), f"{label}: GrokeQuizRand missing"
    if course == "statics":
        qid = "q1.1"
        goto_concept(pg, 1)
        goto_slide(pg, "quiz-q1-1")
        box = qbox(pg, qid)
        first = pg.evaluate(f"() => {api}.get('{qid}')").get("givens") if False else pg.evaluate("""() => {
          const inst=window.GrokeQuizRand.get('q1.1');
          return {givens: inst.givens, seed: inst.seed, text: inst.text};
        }""")
        # Refresh mid-problem keeps the same numbers
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(400)
        goto_concept(pg, 1)
        goto_slide(pg, "quiz-q1-1")
        box = qbox(pg, qid)
        again = pg.evaluate("""() => {
          const inst=window.GrokeQuizRand.get('q1.1');
          return {givens: inst.givens, seed: inst.seed, text: inst.text, body: document.querySelector('#Qq1_1 p') && document.querySelector('#Qq1_1 p').innerText};
        }""")
        assert again["seed"] == first["seed"], f"{label}: seed changed on refresh {first['seed']} -> {again['seed']}"
        assert again["givens"] == first["givens"], f"{label}: givens changed on refresh {first['givens']} vs {again['givens']}"
        assert str(int(first["givens"]["F1"])) in (again["body"] or ""), f"{label}: page text missing drawn F1 after refresh: {again['body']}"
        # UNLOCK scripts pre-mark quizzes solved; clear q1.1 so Try a new one can appear
        pg.evaluate("""() => {
          const raw=JSON.parse(localStorage.getItem('grokiversity.v1')||'{}');
          if(raw.score && raw.score['1']) delete raw.score['1']['q1.1'];
          localStorage.setItem('grokiversity.v1', JSON.stringify(raw));
        }""")
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(400)
        goto_concept(pg, 1)
        goto_slide(pg, "quiz-q1-1")
        box = qbox(pg, qid)
        kept = pg.evaluate("""() => window.GrokeQuizRand.get('q1.1').givens""")
        assert kept == first["givens"], f"{label}: clearing score changed the seed/givens {kept} vs {first['givens']}"
        # Wrong answer reveals Try a new one, which draws a fresh variant
        fill_forms(box, ["0", "0"])
        check_click(box)
        again_btn = box.locator('[data-act="again"]')
        assert again_btn.count() == 1 and again_btn.is_visible(), f"{label}: Try a new one should appear after a wrong answer"
        again_btn.click()
        pg.wait_for_timeout(200)
        box = qbox(pg, qid)
        fresh = pg.evaluate("""() => {
          const inst=window.GrokeQuizRand.get('q1.1');
          return {givens: inst.givens, seed: inst.seed, body: document.querySelector('#Qq1_1 p') && document.querySelector('#Qq1_1 p').innerText};
        }""")
        assert fresh["seed"] != first["seed"] or fresh["givens"] != first["givens"], f"{label}: Try a new one did not change the variant"
        assert str(int(fresh["givens"]["F1"])) in (fresh["body"] or ""), f"{label}: new variant text missing F1 {fresh}"
        # diagram present for q1.1
        assert box.locator("svg.q-diagram").count() == 1, f"{label}: q1.1 should show a value-driven diagram"
        # Shuffle is a stored permutation of the concept's quiz ids
        perm = pg.evaluate("""() => {
          const ids=[...document.querySelectorAll('#c1 .q-mount')].map(el => el.dataset.q);
          const stored=(JSON.parse(localStorage.getItem('grokiversity.v1')||'{}').quiz||{}).order||{};
          return {ids, stored: stored.s1};
        }""")
        assert perm["stored"] and sorted(perm["stored"])==sorted(perm["ids"]), f"{label}: stored quiz order is not a permutation {perm}"
        assert perm["ids"] == perm["stored"], f"{label}: DOM order != stored order {perm}"
        print(f"{label}: random quiz ok (seed persist, try-a-new-one, shuffle {perm['stored']})")
    else:
        # AI: self-contained text + try a new one on q2.2 (mentions its own points)
        pg.evaluate("""() => {
          const raw=JSON.parse(localStorage.getItem('grokiversity.ai101.v1')||'{}');
          if(raw.score && raw.score['2']) delete raw.score['2']['q2.2'];
          localStorage.setItem('grokiversity.ai101.v1', JSON.stringify(raw));
        }""")
        pg.reload(wait_until="domcontentloaded")
        pg.wait_for_timeout(400)
        pg.click('#clist [data-c="2"]')
        pg.wait_for_timeout(200)
        box = qbox(pg, "q2.2")
        box.scroll_into_view_if_needed()
        text = box.locator("p").first.inner_text()
        assert "(" in text and "y" in text.lower(), f"{label}: AI q2.2 should state its own data: {text}"
        fill_forms(box, ["0", "0", "0"])
        check_click(box)
        again_btn = box.locator('[data-act="again"]')
        assert again_btn.count()==1 and again_btn.is_visible(), f"{label}: AI Try a new one missing after a wrong answer"
        print(f"{label}: AI random quiz ok ({text[:90]!r})")


def negative_input_pass(pg, label, shots=False):
    """± toggle on every decimal input; tap ± then type 12 on a negative answer."""
    dismiss_fun(pg)
    # parseQty / nearly / rounding for signed and typographic minus
    parsed = pg.evaluate("""() => {
      const api=window.GrokiversityQuiz;
      const R=window.GrokeQuizRand;
      const out={ok:[], fail:[], negs:0, seeds:[]};
      const signs=['-','\\u2212','\\u2013','\\u2014','+'];
      const a={q:'M',v:-12,u:'N·m',tp:1};
      signs.forEach(s => {
        const raw=(s==='+'?'+12':s+'12')+' N·m';
        const g=api.gradeAns(a, raw);
        const p=api.parseQty(s+'12', a.u);
        const rec={s:raw, ok:!!(g&&g.ok), pv:p&&p.v, err:(g&&g.err)||(p&&p.err)};
        if(s==='+') rec.expect=false; else rec.expect=true;
        if(!!g.ok!==rec.expect || (s!=='+' && p.v!==-12)) out.fail.push(rec); else out.ok.push(rec);
      });
      // 1% tolerance and integer rounding on negatives
      if(!api.nearly({v:-100,u:'N',tp:1}, -101) || !api.nearly({v:-100,u:'N',tp:1}, -99)) out.fail.push('tol');
      if(api.nearly({v:-100,u:'N',tp:1}, -103)) out.fail.push('tol-wide');
      const ts=api.intTargets(-12.4);
      if(ts[0]!==-12) out.fail.push('round '+JSON.stringify(ts));
      if(!api.nearly({v:-12.4,u:'N',tp:1}, -12)) out.fail.push('round-grade');
      const half=api.intTargets(-12.5);
      if(half.indexOf(-12)<0 || half.indexOf(-13)<0) out.fail.push('half '+JSON.stringify(half));
      // randomized problems already produce negative answers
      ['q1.3','q4.2','q4.5'].forEach(id => {
        for(let seed=1; seed<=400; seed++){
          const inst=R.instantiate(id, seed, 's');
          if(!inst || !inst.ans) continue;
          inst.ans.forEach(ans => { if(ans.v<0){ out.negs++; if(out.seeds.length<6) out.seeds.push({id,seed,q:ans.q,v:ans.v}); } });
        }
      });
      // a seed whose rounded integer answer is -12
      let hit=null;
      for(let seed=1; seed<=8000 && !hit; seed++){
        const inst=R.instantiate('q4.2', seed, 's');
        if(!inst || !inst.ans) continue;
        inst.ans.forEach((ans,i) => {
          if(hit) return;
          const targets=api.intTargets(ans.v);
          if(ans.v<0 && targets.indexOf(-12)>=0) hit={id:'q4.2', seed, i, v:ans.v, targets};
        });
      }
      out.hit=hit;
      return out;
    }""")
    assert not parsed.get("fail"), f"{label} parse/tolerance: {parsed}"
    assert parsed["negs"] > 0, f"{label}: no randomized negative answers found: {parsed}"
    assert parsed.get("hit"), f"{label}: could not find a q4.2 seed that rounds to -12: {parsed}"
    print(f"{label} signed parse ok; {parsed['negs']} negative generator hits; seed {parsed['hit']}")

    # Every decimal input in the current lesson has a thumb-sized ± button
    coverage = pg.evaluate("""() => {
      const ins=[...document.querySelectorAll('input[inputmode="decimal"]')];
      return ins.map(inp => {
        const btn=inp.parentElement && inp.parentElement.querySelector('.sign-toggle');
        const br=btn && btn.getBoundingClientRect();
        return {has:!!btn, aria:btn && btn.getAttribute('aria-label'), h:br && br.height, w:br && br.width, mode:inp.getAttribute('inputmode')};
      });
    }""")
    # May be 0 if we have not visited quiz slides that built mounts... buildQuiz runs at boot for all Q.
    # On statics, all quizzes should already be mounted.
    assert coverage, f"{label}: no decimal inputs found"
    missing=[c for c in coverage if not c["has"] or c.get("aria")!="Toggle negative sign"]
    assert not missing, f"{label}: missing ± on some inputs: {missing[:4]} of {len(coverage)}"
    short=[c for c in coverage if (c.get("h") or 0)<43.5]
    # hidden slides may report 0 height — only check visible ones later on the active quiz

    hit=parsed["hit"]
    goto_concept(pg, 4)
    pg.evaluate("""(hit) => {
      const R=window.GrokeQuizRand;
      const api=window.GrokiversityQuiz;
      const q=Object.values(api.Q).flat().find(x=>x.id==='q4.2');
      const inst=R.instantiate('q4.2', hit.seed, 's');
      const apply=R.apply;
      R.apply=function(qq){
        if(qq && qq.id==='q4.2'){
          qq.text=inst.text; qq.ans=inst.ans; qq.sol=inst.sol; qq.hints=inst.hints; qq.diagram=inst.diagram;
          return inst;
        }
        return apply.apply(this, arguments);
      };
      api.buildQuiz(q);
      R.apply=apply;
    }""", hit)
    goto_slide(pg, "quiz-q4-2")
    box = qbox(pg, "q4.2")
    reveal_el(pg, box)
    idx = hit["i"]
    inp = box.locator("input").nth(idx)
    reveal_el(pg, inp)
    # confirm ± button is thumb-sized and visible
    geo = pg.evaluate("""(i) => {
      const root=document.getElementById('Qq4_2');
      const inp=root.querySelectorAll('input')[i];
      const btn=inp.parentElement.querySelector('.sign-toggle');
      const br=btn.getBoundingClientRect();
      const ir=inp.getBoundingClientRect();
      return {aria:btn.getAttribute('aria-label'), h:br.height, w:br.width, visible:br.height>0, mode:inp.getAttribute('inputmode'), text:btn.textContent, inpH:ir.height};
    }""", idx)
    assert geo["aria"]=="Toggle negative sign", geo
    assert geo["mode"]=="decimal", geo
    assert geo["h"]>=44, f"{label}: ± height {geo}"
    assert geo["w"]>=44, f"{label}: ± width {geo}"
    # tap ± (empty field -> '-'), then type 12, then fill any other fields correctly, submit
    inp.fill("")
    btn = box.locator(".sign-toggle").nth(idx)
    try:
        btn.tap()
    except Exception:
        btn.dispatch_event("pointerdown")
    pg.wait_for_timeout(80)
    val = inp.input_value()
    assert val.strip() in ("-", "\u2212", "\u2013", "\u2014"), f"{label}: ± on empty should insert minus, got {val!r}"
    pg.evaluate("""(i) => {
      const inp=document.querySelectorAll('#Qq4_2 input')[i];
      inp.focus();
      const n=(inp.value||'').length;
      try{ inp.setSelectionRange(n,n); }catch(e){}
    }""", idx)
    inp.type("12")
    pg.wait_for_timeout(50)
    typed = inp.input_value().strip()
    assert typed in ("-12", "\u221212", "\u201312", "\u201412"), f"{label}: expected -12, got {typed!r}"
    # fill other answer fields with exact values (not the one we typed)
    ans_vals = pg.evaluate("""(i) => {
      const api=window.GrokiversityQuiz;
      const q=Object.values(api.Q).flat().find(x=>x.id==='q4.2');
      return q.ans.map((a,j) => j===i ? null : api.formatExact(a));
    }""", idx)
    for i,v in enumerate(ans_vals):
        if v is None: continue
        box.locator("input").nth(i).fill(v)
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: ± then 12 should be accepted on seed {hit}: {fb} typed={typed!r}"
    # Show solution still present and works
    box.locator('[data-act="sol"]').click()
    pg.wait_for_timeout(80)
    sol = box.locator(".fb").inner_text()
    assert "solution" in sol.lower() or "N·m" in sol or "N" in sol, f"{label} show solution: {sol}"
    if shots:
        Path = __import__("pathlib").Path
        dest = Path("/workspace/grokiversity_shots")
        dest.mkdir(parents=True, exist_ok=True)
        # reset input to show '-' + button clearly? already has -12. Fine.
        reveal_el(pg, inp)
        pg.wait_for_timeout(100)
        pg.screenshot(path=str(dest / "negative_input.png"))
        print("wrote /workspace/grokiversity_shots/negative_input.png")
    print(f"{label} ± toggle accepted -12 ({typed!r}) on q4.2 seed {hit['seed']}")


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
    hook = pg.evaluate("""() => {
      const art = document.querySelector('[data-id="hook"]');
      const h2 = art && art.querySelector('h2');
      const p = art && art.querySelector('p');
      const svg = document.getElementById('ropeSvg');
      const line = svg && svg.querySelector('line[data-tap="rope"]');
      return {
        title: h2 ? h2.textContent : '',
        lead: p ? p.textContent : '',
        marker: line ? (line.getAttribute('marker-end') || '') : '',
        x1: line && +line.getAttribute('x1'),
        x2: line && +line.getAttribute('x2'),
        aria: svg && svg.getAttribute('aria-label')
      };
    }""")
    assert "pull a box with a rope" in hook["title"].lower(), f"{label} hook title: {hook}"
    assert "push" not in hook["title"].lower(), f"{label} hook still says push: {hook['title']}"
    assert "your pull" in hook["lead"].lower(), f"{label} hook lead: {hook['lead']}"
    assert hook["marker"] and "url(" in hook["marker"], f"{label} rope missing outward arrow: {hook}"
    assert hook["x2"] is not None and hook["x2"] > hook["x1"], f"{label} rope tip should be away from the box: {hook}"
    hook_copy = pg.evaluate("""() => {
      const art = document.querySelector('[data-id="hook"]');
      const svg = document.getElementById('ropeSvg');
      const nudge = svg && svg.querySelector('.rope-nudge');
      return {
        text: art ? art.innerText : '',
        hasNudge: !!(nudge),
        hintClass: svg ? svg.className.baseVal || svg.getAttribute('class') || '' : '',
        nudgeOp: nudge ? getComputedStyle(nudge).opacity : null
      };
    }""")
    low = hook_copy["text"].lower()
    assert "tap the box" not in low, f"{label} hook still shows tap-the-box hint: {hook_copy['text']!r}"
    assert "drag the end" not in low, f"{label} hook still shows drag-the-end hint: {hook_copy['text']!r}"
    assert "to name them" not in low, f"{label} hook still shows name-them hint: {hook_copy['text']!r}"
    assert "drag the box" in low, f"{label} hook should say Drag the box: {hook_copy['text']!r}"
    assert hook_copy["hasNudge"], f"{label} hook should have a hand cue on the box: {hook_copy}"
    assert pg.locator("#ropeSvg .rope-drag-hint").count() == 1, f"{label} missing Drag the box hint"
    assert "hint-seen" not in hook_copy["hintClass"], f"{label} box cue should be visible before first drag: {hook_copy}"
    floor0, lift0 = pg.inner_text("#ropeFloor"), pg.inner_text("#ropeLift")
    # local drag helper (same as test_prototype)
    box = pg.locator("#ropeBox").bounding_box(); assert box, f"{label}: no #ropeBox"
    x, y = box["x"] + box["width"]/2, box["y"] + box["height"]/2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x - 80, y, steps=10); pg.mouse.up()
    pg.wait_for_timeout(650)
    floor1, lift1 = pg.inner_text("#ropeFloor"), pg.inner_text("#ropeLift")
    assert (floor0, lift0) != (floor1, lift1), f"{label} dragging the box should change readouts: {floor0},{lift0} -> {floor1},{lift1}"
    after = pg.evaluate("""() => {
      const svg = document.getElementById('ropeSvg');
      const nudge = svg && svg.querySelector('.rope-nudge');
      const hint = svg && svg.querySelector('.rope-drag-hint');
      return {
        hintClass: svg ? svg.className.baseVal || svg.getAttribute('class') || '' : '',
        nudgeOp: nudge ? getComputedStyle(nudge).opacity : null,
        hintOp: hint ? getComputedStyle(hint).opacity : null
      };
    }""")
    assert "hint-seen" in after["hintClass"], f"{label} first box drag should dismiss the cue: {after}"
    assert after["nudgeOp"] is not None and float(after["nudgeOp"]) <= 0.05, f"{label} hand cue should fade after first drag: {after}"
    assert after["hintOp"] is not None and float(after["hintOp"]) <= 0.05, f"{label} Drag the box hint should fade after first drag: {after}"
    assert_header_pinned(pg, label + " hook")
    recover_from_simulated_shift(pg, label + " hook shift")
    rounding_pass(pg, label, "statics")
    # Controls always present
    goto_concept(pg, 1)
    goto_slide(pg, "quiz-q1-1")
    box = qbox(pg, "q1.1")
    for act in ("check", "hint", "skip", "sol"):
        assert box.locator(f'[data-act="{act}"]').count() == 1, f"{label}: missing {act} on q1.1"
    # Tapping the input must focus it (not swallowed by touch guards)
    inp = box.locator("input").first
    reveal_el(pg, inp)
    pg.wait_for_timeout(80)
    try:
        inp.tap()
    except Exception:
        inp.click()
    focused = pg.evaluate("() => document.activeElement && document.activeElement.tagName")
    assert focused == "INPUT", f"{label}: input did not receive focus (active={focused})"
    # Bare numbers use the default unit in the dropdown (asked unit)
    sels = box.locator("select.unit-select, .unit-field select")
    assert sels.count() == 2, f"{label}: expected 2 unit menus on q1.1, got {sels.count()}"
    assert box.locator("select").nth(0).input_value() == "N", f"{label}: default force unit should be N, got {box.locator('select').nth(0).input_value()}"
    assert box.locator("select").nth(1).input_value() == "°", f"{label}: default angle unit should be °, got {box.locator('select').nth(1).input_value()}"
    # tappable on iPhone
    for i in range(sels.count()):
        bb = sels.nth(i).bounding_box()
        assert bb and bb["height"] >= 44, f"{label}: unit menu {i} height {bb}"
        im = box.locator("input").nth(i).get_attribute("inputmode")
        assert im == "decimal", f"{label}: inputmode should be decimal, got {im}"
    conv = pg.evaluate("""() => {
      const api=window.GrokiversityQuiz;
      const q=window.GrokeQuizRand.get('q1.1');
      const kn=api.convertToWanted(q.ans[0].v, q.ans[0].u, 'kN').v;
      const rad=api.convertToWanted(q.ans[1].v, q.ans[1].u, 'rad').v;
      const lbf=api.convertToWanted(q.ans[0].v, q.ans[0].u, 'lbf').v;
      const i1=api.intTargets(q.ans[1].v);
      return {bare:[String(q.ans[0].v), String(q.ans[1].v)], kn, rad, lbf, th:q.ans[1].v, i1, exact:q.ans.map(a=>api.formatExact(a))};
    }""")
    fill_forms(box, conv["bare"])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: bare number with default units should be accepted: {fb}"
    # Pick kN and type the converted value
    box.locator("select").nth(0).select_option("kN")
    fill_forms(box, [str(conv["kn"]), str(conv["th"])])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: kN via dropdown rejected: {fb}"
    # Typed unit in the number box syncs the menu
    fill_forms(box, [str(conv["bare"][0])+" N", str(conv["rad"])+" rad"])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: typed unit / radians rejected: {fb}"
    synced = box.locator("select").nth(0).input_value()
    assert synced == "N", f"{label}: typing a value in N should sync menu to N, got {synced}"
    # lbf conversion + integer angle
    box.locator("select").nth(0).select_option("lbf")
    box.locator("select").nth(1).select_option("°")
    fill_forms(box, [str(conv["lbf"]), str(conv["i1"][0])])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: lbf / integer deg rejected: {fb}"
    # Next / Back must work while unanswered (not locked). Quiz order is shuffled,
    # so start from a non-final quiz slide rather than assuming q1.1 has a Next.
    nav = pg.evaluate("""() => {
      const ss=[...document.querySelectorAll('#c1 .slide')];
      const quizzes=ss.filter(s => (s.dataset.id||'').startsWith('quiz-')).map(s => s.dataset.id);
      const start = quizzes.find((id,i) => i < quizzes.length-1 || ss.findIndex(s=>s.dataset.id===id) < ss.length-1) || quizzes[0];
      const idx=ss.findIndex(s=>s.dataset.id===start);
      return {start, next: idx>=0 && ss[idx+1] && ss[idx+1].dataset.id, last: idx===ss.length-1, n:ss.length};
    }""")
    assert nav["start"], f"{label}: no quiz slides in concept 1"
    goto_slide(pg, nav["start"])
    if nav["last"] or not nav["next"]:
        assert not pg.is_disabled("#prevSlide"), f"{label}: last quiz should still allow Back: {nav}"
        pg.click("#prevSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid and sid != nav["start"], f"{label}: Back did not leave {nav['start']}, now {sid}"
        assert not pg.is_disabled("#nextSlide")
        pg.click("#nextSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid == nav["start"], f"{label}: Next did not return to {nav['start']}, now {sid}"
    else:
        assert not pg.is_disabled("#nextSlide"), f"{label}: Next disabled on mid-concept quiz {nav}"
        pg.click("#nextSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid == nav["next"], f"{label}: Next from {nav['start']} did not go to {nav['next']}, now {sid}"
        assert not pg.is_disabled("#prevSlide")
        pg.click("#prevSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid == nav["start"], f"{label}: Back did not return to {nav['start']}, now {sid}"
    # Return to q1.1 — shuffle may have left us on a different problem, which hides #Qq1_1.
    goto_slide(pg, "quiz-q1-1")
    box = qbox(pg, "q1.1")
    assert_field_font(pg, label + " q1.1 fonts")
    inp = box.locator("input").first
    reveal_el(pg, inp)
    try:
        inp.tap()
    except Exception:
        inp.click()
    pg.wait_for_timeout(80)
    pg.evaluate("window.scrollTo(0, 140)")
    pg.evaluate("window.dispatchEvent(new Event('scroll'))")
    pg.wait_for_timeout(60)
    assert_header_pinned(pg, label + " focused input")
    sel = box.locator("select").first
    try:
        sel.tap()
    except Exception:
        sel.click()
    pg.evaluate("window.scrollTo(0, 140)")
    pg.evaluate("window.dispatchEvent(new Event('scroll'))")
    pg.wait_for_timeout(60)
    assert_header_pinned(pg, label + " focused unit menu")
    pg.evaluate("document.activeElement && document.activeElement.blur()")
    pg.wait_for_timeout(100)
    assert_header_pinned(pg, label + " after blur")
    recover_from_simulated_shift(pg, label + " quiz shift")
    # Show solution + still movable
    box.locator('[data-act="sol"]').click()
    fb = box.locator(".fb").inner_text()
    assert "Solution" in fb or "Answers:" in fb, f"{label}: Show solution failed: {fb}"
    shown = pg.evaluate("""() => window.GrokeQuizRand.get('q1.1').ans.map(a => window.GrokiversityQuiz.formatExact(a))""")
    for piece in shown:
        num = "".join(ch for ch in piece if ch.isdigit() or ch=='.' or ch=='-')
        # at least the leading digits of the exact value should appear
        head = num.split('.')[0] if num else ""
        assert head and head in fb.replace(",",""), f"{label}: Show solution missing {piece}: {fb}"
    # If shuffle put q1.1 last, Next is correctly disabled; Back should still work.
    assert (not pg.is_disabled("#nextSlide")) or (not pg.is_disabled("#prevSlide")), f"{label}: both Next and Back disabled after Show solution"
    # Enter / Go submits an iOS-flavored correct answer
    ios = pg.evaluate("""() => {
      const api=window.GrokiversityQuiz;
      const q=window.GrokeQuizRand.get('q1.1');
      const n0=String(q.ans[0].v).replace('.', ',');
      const n1=String(q.ans[1].v);
      const ints0=api.intTargets(q.ans[0].v);
      const ints1=api.intTargets(q.ans[1].v);
      return {comma: [n0+' N.', n1+'°'], i0:ints0, i1:ints1};
    }""")
    fill_forms(box, ios["comma"])
    box.locator("input").nth(1).press("Enter")
    pg.wait_for_timeout(150)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: Enter did not accept comma-decimal form {ios['comma']}: {fb}"
    fill_forms(box, [str(ios["i0"][0])+" N", str(ios["i1"][0])+" deg"])
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label}: integer-round form rejected: {fb}"
    if len(ios["i1"])==2:
        fill_forms(box, [str(ios["i0"][0])+" N", str(ios["i1"][1])+" deg"])
        check_click(box)
        fb = box.locator(".fb").inner_text()
        assert "Correct" in fb, f"{label}: half-integer other side rejected: {fb}"
    if shots:
        pg.screenshot(path=str(SHOTS / "quiz_iphone_q1_1_accepted.png"), full_page=False)
        print("wrote", SHOTS / "quiz_iphone_q1_1_accepted.png")

    # Swipe left on a mid unanswered quiz should advance (order is shuffled)
    order = pg.evaluate("""() => [...document.querySelectorAll('#c1 .slide')].filter(s => (s.dataset.id||'').startsWith('quiz-')).map(s => s.dataset.id)""")
    assert len(order) >= 2, f"{label}: expected multiple concept-1 quizzes, got {order}"
    mid, nxt = order[0], order[1]
    goto_slide(pg, mid)
    mid_qid = "q" + mid.split("quiz-q", 1)[-1].replace("-", ".")
    box = qbox(pg, mid_qid)
    box.locator("input").first.fill("")  # leave unanswered
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
    if sid != nxt:
        assert not pg.is_disabled("#nextSlide"), f"{label}: Next disabled on unanswered quiz (swipe landed on {sid})"
        pg.click("#nextSlide")
        pg.wait_for_timeout(200)
        sid = pg.evaluate("() => document.querySelector('.concept:not([hidden]) .slide.on')?.dataset.id")
        assert sid == nxt, f"{label}: could not move on from unanswered quiz, now {sid} (wanted {nxt})"
        print(f"{label}: swipe did not fire, Next still moved on")
    else:
        print(f"{label}: swipe advanced unanswered quiz to {sid}")

    # Every scored problem: two typography forms accepted in the DOM
    # Pick one iOS-ish form per field
    form_js = r"""(qid) => {
      const api = window.GrokiversityQuiz;
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
        if (a.u === 'mm') return n.replace('.', ',') + '\u00a0mm.';
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
            info = pg.evaluate("""(qid) => {
              const api=window.GrokiversityQuiz;
              const q=Object.values(api.Q).flat().find(x=>x.id===qid);
              const root=document.getElementById('Q'+qid.replace('.','_'));
              const expect=(q.ans||[]).map(a => api.unitMenu(a.u) ? api.selectDefault(a.u) : null);
              const sels=[...root.querySelectorAll('select')].map(s=>s.value);
              const modes=[...root.querySelectorAll('input')].map(i=>i.getAttribute('inputmode'));
              return {expect, sels, modes, nSel: sels.length, nExpect: expect.filter(Boolean).length};
            }""", qid)
            assert info["nSel"] == info["nExpect"], f"{label} {qid}: unit menus {info['sels']} vs {info['expect']}"
            got = list(info["sels"])
            want = [u for u in info["expect"] if u]
            assert got == want, f"{label} {qid}: default units {got} != {want}"
            assert all(m=="decimal" for m in info["modes"]), f"{label} {qid}: inputmode {info['modes']}"
            forms = pg.evaluate(form_js, qid)
            fill_forms(box, forms)
            check_click(box)
            fb = box.locator(".fb").inner_text()
            assert "Correct" in fb, f"{label} {qid} rejected iOS forms {forms}: {fb}"
            seen += 1
    assert seen == 20, f"{label}: expected 20 scored quizzes, got {seen}"
    print(f"{label}: all 20 Statics quizzes accepted an iOS-typed form; Skip/Show solution/Next present")
    random_quiz_pass(pg, label, "statics")
    negative_input_pass(pg, label, shots=shots)
    return seen

def ai_dom_pass(pg, label, shots=False):
    typography_pass(pg, label)
    rounding_pass(pg, label, "ai")
    # q1.4 % missing units
    box = qbox(pg, "q1.4")
    box.scroll_into_view_if_needed()
    assert box.locator("select").count() == 2, f"{label} AI q1.4 should have % menus"
    assert box.locator("select").nth(0).input_value() == "%"
    q14 = pg.evaluate("""() => {
      const q=window.GrokeQuizRand.get('q1.4');
      return q.ans.map(a => String(a.v));
    }""")
    fill_forms(box, q14)
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label} AI bare percents with default %: {fb}"
    fill_forms(box, [q14[0]+"%", q14[1]+" percent"])
    box.locator("input").nth(1).press("Enter")
    pg.wait_for_timeout(150)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label} AI q1.4 percent typography: {fb}"
    # unitless EU / counts have no unit menu
    box11 = qbox(pg, "q1.1")
    assert box11.locator("select").count() == 0, f"{label}: unitless EU fields should have no dropdown"
    box12 = qbox(pg, "q1.2")
    assert box12.locator("select").count() == 0, f"{label}: count field should have no dropdown"
    if shots:
        box.screenshot(path=str(SHOTS / "quiz_iphone_ai_q1_4_accepted.png"))
        print("wrote", SHOTS / "quiz_iphone_ai_q1_4_accepted.png")
    seen = 0
    form_js = r"""(qid) => {
      const api = window.GrokiversityQuiz;
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
    # q1.3 now asks for percents; 11% / 9% are the rounded values
    pg.click('#clist [data-c="1"]')
    pg.wait_for_timeout(200)
    box = qbox(pg, "q1.3")
    box.scroll_into_view_if_needed()
    q13 = pg.evaluate("""() => {
      const api=window.GrokiversityQuiz;
      const q=window.GrokeQuizRand.get('q1.3');
      return q.ans.map(a => String(api.intTargets(a.v)[0])+' %');
    }""")
    fill_forms(box, q13)
    check_click(box)
    fb = box.locator(".fb").inner_text()
    assert "Correct" in fb, f"{label} AI q1.3 rounded percents {q13}: {fb}"
    # Skip does not trap
    pg.click('#clist [data-c="4"]')
    pg.wait_for_timeout(200)
    box = qbox(pg, "q4.3")
    box.scroll_into_view_if_needed()
    box.locator('[data-act="skip"]').click()
    fb = box.locator(".fb").inner_text()
    assert "Skipped" in fb, f"{label} skip: {fb}"
    print(f"{label}: all 15 AI quizzes accepted typography forms; Skip/Show solution present")
    random_quiz_pass(pg, label, "ai")
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
    home_links_pass()
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
                ctx.add_init_script("(function(){var K='grokiversity.v1';try{var c=JSON.parse(localStorage.getItem(K)||'null');if(c&&typeof c==='object')return;}catch(e){}localStorage.setItem(K, %s);}());" % json.dumps(UNLOCK_JS))
                pg = ctx.new_page(); watch(pg, errors)
                pg.goto(LESSON_C1, wait_until="domcontentloaded")
                pg.wait_for_timeout(500)
                if iphone:
                    assert_home_header(pg, "statics " + label)
                statics_dom_pass(pg, "statics " + label, shots=shots)

                ctx2 = br.new_context(**(IPHONE if iphone else dict(viewport={"width": 1280, "height": 720})))
                ctx2.add_init_script("(function(){var K='grokiversity.ai101.v1';try{var c=JSON.parse(localStorage.getItem(K)||'null');if(c&&typeof c==='object')return;}catch(e){}localStorage.setItem(K, %s);}());" % json.dumps(AI_UNLOCK_JS))
                pa = ctx2.new_page(); watch(pa, errors)
                pa.goto(AI, wait_until="domcontentloaded")
                pa.wait_for_timeout(500)
                ai_dom_pass(pa, "ai " + label, shots=shots)
                ctx2.close()
            except Exception as e:
                print(f"FAIL {label}: {type(e).__name__}: {e}")
                traceback.print_exc()
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
