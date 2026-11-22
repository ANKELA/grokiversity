#!/usr/bin/env python3
"""XP, streaks, confetti, reduced-motion, and the effects toggle — Chromium + WebKit iPhone."""
import functools, http.server, json, pathlib, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
SHOTS = SITE / "screenshots"
SHOTS.mkdir(exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=str(SITE)))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
LESSON = f"http://127.0.0.1:{PORT}/statics/unit-1.html"
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
    ctx.add_init_script("localStorage.setItem('grokeversity.v1', %s)" % json.dumps(PROG))
    ctx.add_init_script("localStorage.setItem('grokeversity.ai101.v1', %s)" % json.dumps(AI_PROG))
    ctx.add_init_script("localStorage.setItem('grokeversity.fun.v1', %s)" % json.dumps(fun))

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
      const api=window.GrokeversityQuiz;
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
    pg.goto(LESSON, wait_until="domcontentloaded")
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
        pg.locator("#funGear").click()
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / "fun_iphone_reward.png"))
        print("wrote", SHOTS / "fun_iphone_reward.png")
        pg.locator("#funGear").click()

    # toggle effects off — no new canvas after a burst call
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
    p2.goto(LESSON, wait_until="domcontentloaded")
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
    p3.goto(AI, wait_until="domcontentloaded")
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

def main():
    failed=[]
    with sync_playwright() as p:
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
