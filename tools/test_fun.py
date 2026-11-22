#!/usr/bin/env python3
"""XP, streaks, confetti, reduced-motion, and the effects toggle — Chromium + WebKit iPhone."""
import functools, http.server, json, pathlib, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
SHOTS = SITE / "screenshots"
SHOTS.mkdir(exist_ok=True)
ENGAGE_SHOTS = pathlib.Path("/workspace/grokiversity_shots")
ENGAGE_SHOTS.mkdir(parents=True, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE)))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
HOME = f"http://127.0.0.1:{PORT}/"
LESSON = f"http://127.0.0.1:{PORT}/statics/unit-1.html"
LESSON_C1 = LESSON + "?c=1#s1"
AI = f"http://127.0.0.1:{PORT}/intro-ai.html"

IPHONE = dict(
    viewport={"width": 390, "height": 844},
    is_mobile=True, has_touch=True, device_scale_factor=3,
    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
)
FUN_ON = json.dumps({"xp":0,"streak":0,"bestStreak":0,"daily":{"date":"","days":0},"badges":[],"cards":[],"fx":True,"sound":False,"correct":0})
# concept 1 unlocked by default; leave scores empty so the first check is a first-time reward
PROG = json.dumps({"score":{"1":{},"2":{},"3":{},"4":{},"5":{}},"current":1,"slide":{}})
AI_PROG = json.dumps({"score":{"1":{},"2":{},"3":{},"4":{}},"current":1})

def init_scripts(ctx, fun=FUN_ON):
    ctx.add_init_script("localStorage.setItem('grokiversity.v1', %s)" % json.dumps(PROG))
    ctx.add_init_script("localStorage.setItem('grokiversity.ai101.v1', %s)" % json.dumps(AI_PROG))
    ctx.add_init_script("localStorage.setItem('grokiversity.fun.v1', %s)" % json.dumps(fun))

def goto_q11(pg):
    pg.wait_for_timeout(400)
    i = pg.evaluate("""() => {
      const c=document.querySelector('#c1');
      return [...c.querySelectorAll('.slide')].findIndex(s=>s.dataset.id==='quiz-q1-1');
    }""")
    pg.locator("#dots .dot").nth(i).click()
    pg.wait_for_timeout(200)

def live_exact(pg, qid):
    return pg.evaluate("""(qid) => {
      const api=window.GrokiversityQuiz;
      const q=window.GrokeQuizRand.get(qid);
      return q.ans.map(a => api.formatExact(a));
    }""", qid)

def answer_q11(pg, a=None, b=None):
    if a is None or b is None:
        vals = live_exact(pg, "q1.1")
        if a is None: a = vals[0]
        if b is None: b = vals[1]
    box = pg.locator("#Qq1_1")
    box.locator("input").nth(0).fill(a)
    box.locator("input").nth(1).fill(b)
    box.locator('[data-act="check"]').click()
    return box

def run_browser(p, engine, iphone, shots=False):
    label = f"{engine}-{'iphone' if iphone else 'desktop'}"
    if engine == "chromium":
        br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    else:
        br = p.webkit.launch()
    kw = dict(IPHONE) if iphone else dict(viewport={"width": 1280, "height": 720})
    ctx = br.new_context(**kw)
    init_scripts(ctx)
    pg = ctx.new_page()
    pg.goto(LESSON_C1, wait_until="domcontentloaded")
    pg.wait_for_timeout(500)
    assert pg.evaluate("() => !!(window.GrokeFun && document.getElementById('funBar'))"), f"{label}: fun bar missing"
    sound = pg.evaluate("() => window.GrokeFun.state().sound")
    assert sound is False, f"{label}: sound should default off, got {sound}"
    goto_q11(pg)
    answer_q11(pg)
    pg.wait_for_timeout(120)
    pe = pg.evaluate("""() => {
      const cv=document.querySelector('.fun-confetti');
      if(!cv) return {has:false};
      const cs=getComputedStyle(cv);
      return {has:true, pe:cs.pointerEvents, z:+cs.zIndex || 0};
    }""")
    print(label, "confetti", pe)
    assert pe.get("has"), f"{label}: expected confetti canvas after a correct answer (fx on)"
    assert pe["pe"] == "none", f"{label}: confetti must be pointer-events:none, got {pe['pe']}"
    st = pg.evaluate("() => window.GrokeFun.state()")
    print(label, "state after first correct", {k: st[k] for k in ("xp","streak","sound","fx","correct")})
    assert st["xp"] >= 10, f"{label}: expected XP, got {st['xp']}"
    assert st["streak"] >= 1
    assert st["sound"] is False
    toast = pg.evaluate("() => (document.getElementById('funToast')||{}).innerText || ''")
    print(label, "toast:", toast)
    assert "XP" in toast or "streak" in toast.lower() or "card" in toast.lower() or "Badge" in toast
    if shots:
        pg.screenshot(path=str(SHOTS / "fun_iphone_confetti.png"))
        print("wrote", SHOTS / "fun_iphone_confetti.png")
        # force a reward card + big burst for a second shot
        pg.evaluate("""() => {
          const s=window.GrokeFun.state();
          // drop a known card into state and show toast+pop
          if(!s.cards.length){ s.cards.push({id:'newton3', at:Date.now()}); window.GrokeFun.save(); }
          window.GrokeFun.report('correct', {first:true, tries:1, mastered:true, qid:'q1.1', concept:1});
        }""")
        pg.wait_for_timeout(150)
        pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))" )
        pg.locator("#funGear").click()
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / "fun_iphone_reward.png"))
        print("wrote", SHOTS / "fun_iphone_reward.png")
        pg.locator("#funGear").click()

    # toggle effects off — no new canvas after a burst call
    pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))" )
    pg.locator("#funGear").click()
    pg.wait_for_timeout(150)
    fx = pg.locator("#funFx")
    if fx.is_checked():
        fx.click()
    pg.wait_for_timeout(80)
    # close pop
    pg.evaluate("() => { const p=document.getElementById('funPop'); if(p) p.setAttribute('hidden',''); }")
    pg.evaluate("() => { document.querySelectorAll('.fun-confetti').forEach(el=>el.remove()); window.GrokeFun.burst(true); }")
    pg.wait_for_timeout(80)
    assert pg.evaluate("() => !document.querySelector('.fun-confetti')"), f"{label}: burst ran after effects off"
    print(label, "toggle off OK")
    ctx.close()

    # reduced motion: default fx off, XP still awarded, no confetti
    ctx2 = br.new_context(**kw)
    # fx:null means follow prefers-reduced-motion
    init_scripts(ctx2, fun=json.dumps({"xp":0,"streak":0,"bestStreak":0,"daily":{"date":"","days":0},"badges":[],"cards":[],"fx":None,"sound":False,"correct":0}))
    p2 = ctx2.new_page()
    p2.emulate_media(reduced_motion="reduce")
    p2.goto(LESSON_C1, wait_until="domcontentloaded")
    p2.wait_for_timeout(400)
    goto_q11(p2)
    answer_q11(p2)
    p2.wait_for_timeout(150)
    has_cv = p2.evaluate("() => !!document.querySelector('.fun-confetti')")
    xp = p2.evaluate("() => window.GrokeFun.state().xp")
    print(label, "reduced-motion confetti", has_cv, "xp", xp)
    assert not has_cv, f"{label}: reduced motion should skip confetti"
    assert xp >= 10, f"{label}: reduced motion still awards XP"
    ctx2.close()

    # AI lesson also has a bar and awards XP
    ctx3 = br.new_context(**kw)
    init_scripts(ctx3)
    p3 = ctx3.new_page()
    p3.goto(AI + "#learn", wait_until="domcontentloaded")
    p3.wait_for_timeout(500)
    assert p3.evaluate("() => !!(window.GrokeFun && document.getElementById('funBar'))"), f"{label}: AI fun bar missing"
    p3.locator("#Qq1_4").scroll_into_view_if_needed()
    box = p3.locator("#Qq1_4")
    vals = live_exact(p3, "q1.4")
    box.locator("input").nth(0).fill(vals[0])
    box.locator("input").nth(1).fill(vals[1])
    box.locator('[data-act="check"]').click()
    p3.wait_for_timeout(200)
    xp = p3.evaluate("() => window.GrokeFun.state().xp")
    assert xp >= 10, f"{label}: AI correct should award XP, got {xp}"
    print(label, "AI XP", xp)
    ctx3.close()
    br.close()
    print(label, "PASS")



def fill_current(pg):
    return pg.evaluate("""() => {
      const api=window.GrokiversityQuiz;
      const inst=window.GrokeFun && window.GrokeFun._currentInst;
      if(!api || !inst || !inst.ans) return 0;
      const box=document.querySelector('.fun-overlay:not([hidden])');
      if(!box) return 0;
      inst.ans.forEach((a,i) => {
        const inp=box.querySelector('input[data-i="'+i+'"]');
        if(inp) inp.value = api.formatExact(a);
      });
      return inst.ans.length;
    }""")

def test_engagement(p):
    """Daily streak, rings, collection, one-more, daily challenge, speed round — Chromium + WebKit iPhone."""
    from datetime import date, timedelta
    failed=[]
    for engine, iphone, shots in (("chromium", False, False), ("webkit", True, True)):
        label = f"engage-{engine}-{'iphone' if iphone else 'desktop'}"
        if engine == "chromium":
            br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        else:
            br = p.webkit.launch()
        kw = dict(IPHONE) if iphone else dict(viewport={"width": 1280, "height": 800})
        try:
            # Home strip + height
            ctx = br.new_context(**kw)
            pg = ctx.new_page()
            pg.goto(HOME, wait_until="networkidle")
            pg.wait_for_timeout(400)
            assert pg.locator("#funHome").count() == 1, f"{label}: missing home strip"
            assert "Today" in pg.inner_text("#funHome") and "challenge" in pg.inner_text("#funHome").lower()
            assert pg.locator("#funHome .fun-ring").count() >= 2
            h = pg.evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)")
            limit = 980 if iphone else 850
            print(label, "home scrollHeight", h)
            assert h <= limit, f"{label}: home height {h} > {limit}"
            assert pg.evaluate("() => ({y:scrollY, x:scrollX})").get("y") == 0
            if shots:
                pg.screenshot(path=str(ENGAGE_SHOTS / "engage_home.png"))
            # Today's challenge goes to a lesson
            href_ok = pg.evaluate("""() => {
              const b=document.getElementById('funHomeChal');
              b.click();
              return true;
            }""")
            pg.wait_for_url("**/unit-1.html**", timeout=8000)
            pg.wait_for_timeout(500)
            print(label, "home challenge ->", pg.url)
            assert "daily=1" in pg.url or pg.locator("#funDaily").count()
            if pg.locator("#funDaily").count():
                assert pg.locator("#funDaily").is_visible() or pg.evaluate("() => !document.getElementById('funDaily').hidden")
            ctx.close()

            # Freeze: last qualifying day was two days ago, one freeze covers the gap
            today = date.today().isoformat()
            last = (date.today() - timedelta(days=2)).isoformat()
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            fun = {
                "xp": 320, "streak": 0, "bestStreak": 0, "dailyGoal": 5,
                "dayStreak": {"last": last, "days": 7, "freezes": 1, "best": 7, "earnedAt": 1},
                "dailyCorrect": {"date": "", "count": 0},
                "badges": ["first"], "cards": [{"id": "newton3", "at": 1}, {"id": "oc", "at": 1}, {"id": "legend-gd", "at": 1}],
                "fx": False, "sound": False, "correct": 4
            }
            ctx = br.new_context(**kw)
            ctx.add_init_script("localStorage.setItem('grokiversity.v1', %s);" % json.dumps(json.dumps({"score":{"1":{"q1.1":1,"q1.2":1,"q1.3":1,"q1.4":1},"2":{},"3":{},"4":{},"5":{}},"current":1,"slide":{}})))
            ctx.add_init_script("localStorage.setItem('grokiversity.fun.v1', %s);" % json.dumps(json.dumps(fun)))
            pg = ctx.new_page()
            pg.goto(LESSON_C1, wait_until="networkidle")
            pg.wait_for_timeout(500)
            ds = pg.evaluate("() => window.GrokeFun.state().dayStreak")
            print(label, "freeze", ds)
            assert ds["days"] == 7, ds
            assert ds["freezes"] == 0, ds
            assert ds["last"] == yesterday, ds
            rank = pg.evaluate("() => window.GrokeFun.rankOf(window.GrokeFun.state().xp, 's')")
            print(label, "rank", rank)
            assert rank["name"] == "Technician" and rank["level"] == 5, rank
            assert pg.locator("#funBar .fun-ring").count() >= 2
            assert "🔥 7" in pg.inner_text("#funBar") or "7" in pg.inner_text("#funBar")

            # Collection
            pg.evaluate("() => window.GrokeFun.openCollection()")
            pg.wait_for_timeout(200)
            col = pg.inner_text("#funCollection")
            assert "3/40" in col or "Cards 3/40" in col, col[:200]
            assert "newton3" not in col.lower() or "Action and reaction" in col
            assert "Action and reaction" in col
            assert "???" in col  # uncollected still packed
            assert "legendary" in col.lower() or "Legendary" in col
            if shots:
                pg.screenshot(path=str(ENGAGE_SHOTS / "engage_collection.png"))
            pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")

            # Concept-complete card
            pg.evaluate("() => window.GrokeFun.openMore({concept:1})")
            pg.wait_for_timeout(300)
            more = pg.inner_text("#funMore")
            assert "Nice work" in more or "Concept complete" in more
            assert "Free-body" in more or "Up next" in more
            assert "0:60" in more or "0:59" in more or "60-second" in more
            assert pg.locator("#funMore [data-fun-cont]").count() == 1
            assert pg.evaluate("() => getComputedStyle(document.getElementById('lessonApp')).transform") in ("none", "matrix(1, 0, 0, 1, 0, 0)")
            assert pg.evaluate("() => scrollY") == 0
            if shots:
                pg.screenshot(path=str(ENGAGE_SHOTS / "engage_concept_complete.png"))
            pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")

            # Daily challenge: deterministic + share URL without spoilers
            a = pg.evaluate("() => { const p=window.GrokeFun.pickDaily('2026-11-21'); return p && {key:p.item.key, seed:p.seed, n:(p.inst.ans||[]).length}; }")
            b = pg.evaluate("() => { const p=window.GrokeFun.pickDaily('2026-11-21'); return p && {key:p.item.key, seed:p.seed}; }")
            print(label, "daily pick", a, b)
            assert a and b and a["key"] == b["key"] and a["seed"] == b["seed"]
            pg.goto(LESSON + "?daily=1", wait_until="networkidle")
            pg.wait_for_timeout(800)
            assert pg.locator("#funDaily").is_visible() or pg.evaluate("() => document.getElementById('funDaily') && !document.getElementById('funDaily').hidden")
            n = fill_current(pg)
            assert n >= 1, f"{label}: daily problem fields missing"
            pg.locator("#funDaily [data-fun-check]").click()
            pg.wait_for_timeout(300)
            daily_txt = pg.inner_text("#funDaily")
            assert "Share on X" in daily_txt
            href = pg.get_attribute("#funShare", "href") or ""
            assert href.startswith("https://twitter.com/intent/tweet?text=")
            from urllib.parse import unquote, urlparse, parse_qs
            text = unquote(href.split("text=",1)[-1])
            print(label, "share\n", text)
            assert "Grokiversity" in text and "ankela.github.io/grokiversity" in text
            assert "🟩" in text or "🟨" in text
            # no worked answer spoiler (exact numeric payloads)
            inst = pg.evaluate("() => (window.GrokeFun._currentInst && window.GrokeFun._currentInst.ans || []).map(a=>String(a.v))")
            for v in inst:
                if v and len(v) >= 3:
                    assert v not in text, f"share leaked answer {v}: {text}"
            if shots:
                pg.screenshot(path=str(ENGAGE_SHOTS / "engage_daily_challenge.png"))
            pg.evaluate("() => document.querySelectorAll('.fun-overlay').forEach(el=>el.setAttribute('hidden',''))")

            # Speed round from a mastered concept
            pg.evaluate("() => window.GrokeFun.openSpeed()")
            pg.wait_for_timeout(300)
            spd = pg.inner_text("#funSpeed")
            assert "SPEED ROUND" in spd.upper() or "Score" in spd
            assert "0:60" in spd or "0:59" in spd or "0:58" in spd
            n = fill_current(pg)
            assert n >= 1, f"{label}: speed fields missing"
            pg.locator("#funSpeed [data-fun-check]").click()
            pg.wait_for_timeout(200)
            # score should tick, then still be running — close by ending via leftover time is slow; take a mid-round shot
            if shots:
                pg.screenshot(path=str(ENGAGE_SHOTS / "engage_speed_round.png"))
            # mark a personal best through state after at least one correct
            pb = pg.evaluate("""() => {
              const s=window.GrokeFun.state();
              return {xp:s.xp, best:s.speedBest, score:(document.querySelector('#funSpeed')||{}).innerText};
            }""")
            print(label, "speed after one", pb)
            assert "Score 1" in (pb.get("score") or "") or "Score 2" in (pb.get("score") or "")
            ctx.close()
            print(label, "PASS")
        except Exception as e:
            import traceback; traceback.print_exc()
            failed.append(f"{label}: {e}")
            try: ctx.close()
            except Exception: pass
        finally:
            br.close()
    if failed:
        raise AssertionError("; ".join(failed))
    print("ENGAGEMENT TESTS PASSED")

def test_key_migration(p):
    """Progress stored under the old grokeversity.* keys is copied to grokiversity.*."""
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    ctx.add_init_script("""
      localStorage.removeItem('grokiversity.v1');
      localStorage.removeItem('grokiversity.fun.v1');
      localStorage.setItem('grokeversity.v1', JSON.stringify({score:{1:{},2:{},3:{},4:{},5:{}},current:1,slide:{}}));
      localStorage.setItem('grokeversity.fun.v1', JSON.stringify({xp:40,streak:2,bestStreak:2,daily:{date:'',days:0},badges:[],cards:[],fx:true,sound:false,correct:2}));
    """)
    pg = ctx.new_page()
    pg.goto(LESSON_C1, wait_until="domcontentloaded")
    pg.wait_for_timeout(500)
    info = pg.evaluate("""() => ({
      neu: localStorage.getItem('grokiversity.v1') !== null,
      fun: JSON.parse(localStorage.getItem('grokiversity.fun.v1')||'{}').xp
    })""")
    print("statics/fun key migration:", info)
    assert info["neu"], info
    assert info["fun"] == 40, info
    ctx.close(); br.close()

def main():
    failed=[]
    with sync_playwright() as p:
        test_key_migration(p)
        test_engagement(p)
        for engine, iphone, shots in (("chromium", False, False), ("webkit", True, True)):
            label=f"{engine}-{'iphone' if iphone else 'desktop'}"
            try:
                run_browser(p, engine, iphone, shots=shots)
            except Exception as e:
                print(f"FAIL {label}: {e}")
                failed.append(f"{label}: {e}")
    if failed:
        print("FAILED")
        sys.exit(1)
    print("ALL FUN TESTS PASSED")

if __name__ == "__main__":
    main()
