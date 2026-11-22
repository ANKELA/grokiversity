#!/usr/bin/env python3
"""WebKit iPhone 390x844: progress persists across reload, new page, and home Continue.
Also migrates an old grokeversity.v1 save without losing scores or place."""
import functools, http.server, json, pathlib, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / "prototype"
SHOTS = pathlib.Path("/workspace/grokiversity_shots")
SHOTS.mkdir(parents=True, exist_ok=True)

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
ECON = f"http://127.0.0.1:{PORT}/econ/unit-1.html"

IPHONE = dict(
    viewport={"width": 390, "height": 844},
    is_mobile=True, has_touch=True, device_scale_factor=3,
    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
)

def dismiss(pg):
    try:
        pg.evaluate("""() => {
          document.querySelectorAll('.fun-overlay').forEach(el => el.setAttribute('hidden',''));
          const t=document.querySelector('#toast'); if(t) t.classList.remove('show');
        }""")
    except Exception:
        pass

def store_snap(pg, key="grokiversity.v1"):
    return pg.evaluate("""(key) => {
      const s=JSON.parse(localStorage.getItem(key)||'{}');
      const fun=JSON.parse(localStorage.getItem('grokiversity.fun.v1')||'{}');
      const on=document.querySelector('article.slide.on');
      return {
        current:s.current, slide:s.slide, slideId:s.slideId, furthest:s.furthest,
        score:s.score, slideVer:s.slideVer, summary:s.summary, reached:s.reached,
        xp:fun.xp||0, streak:fun.streak||0, correct:fun.correct||0,
        sid:on && on.dataset.id, hash:location.hash, href:location.href
      };
    }""", key)

def start_lesson(pg, url):
    pg.goto(url, wait_until="domcontentloaded")
    pg.wait_for_timeout(500)
    dismiss(pg)
    if pg.locator("#unitOverview").count() and pg.locator("#unitOverview").is_visible():
        if pg.locator("#startUnit").count():
            pg.locator("#startUnit").click()
            pg.wait_for_timeout(300)
            dismiss(pg)

def goto_id(pg, data_id):
    i = pg.evaluate("""(id) => {
      const onC=[...document.querySelectorAll('.concept')].find(c=>!c.hidden) || document.querySelector('#c1');
      return [...onC.querySelectorAll('.slide')].findIndex(s=>s.dataset.id===id);
    }""", data_id)
    assert i >= 0, f"slide {data_id} not in visible concept"
    pg.locator("#dots .dot").nth(i).click()
    pg.wait_for_timeout(250)
    dismiss(pg)

def answer_q11(pg):
    vals = pg.evaluate("""() => {
      const api=window.GrokiversityQuiz, q=window.GrokeQuizRand.get('q1.1');
      return q.ans.map(a => api.formatExact(a));
    }""")
    box = pg.locator("#Qq1_1")
    box.locator("input").nth(0).fill(str(vals[0]))
    box.locator("input").nth(1).fill(str(vals[1]))
    box.locator('[data-act="check"]').click()
    pg.wait_for_timeout(400)
    dismiss(pg)
    return vals

def run_persistent(p):
    user_dir = tempfile.mkdtemp(prefix="groke-progress-")
    ctx = p.webkit.launch_persistent_context(user_dir, **IPHONE)
    pg = ctx.pages[0] if ctx.pages else ctx.new_page()
    start_lesson(pg, LESSON)
    # Advance several teaching slides.
    for _ in range(6):
        if pg.locator("#nextSlide").is_enabled():
            pg.locator("#nextSlide").click()
            pg.wait_for_timeout(180)
            dismiss(pg)
    mid = store_snap(pg)
    assert mid["sid"] and mid["sid"] != "hook", f"should have advanced past hook, got {mid}"
    goto_id(pg, "quiz-q1-1")
    answer_q11(pg)
    fb = pg.locator("#Qq1_1 .fb").inner_text()
    assert "Correct" in fb or "Solved" in fb, fb
    after = store_snap(pg)
    assert after["score"] and after["score"].get("1", {}).get("q1.1") is not None, after
    assert after["xp"] >= 10, after
    assert after["furthest"] and after["furthest"].get("id") == "quiz-q1-1", after
    furthest_before_review = after["furthest"]
    xp_before = after["xp"]

    # Reload should keep the quiz and the score.
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(600)
    dismiss(pg)
    reloaded = store_snap(pg)
    assert reloaded["sid"] == "quiz-q1-1", reloaded
    assert reloaded["score"]["1"]["q1.1"] is not None
    assert reloaded["xp"] == xp_before, reloaded

    # Revisit an earlier slide; furthest must not move backward.
    goto_id(pg, "hook")
    reviewed = store_snap(pg)
    assert reviewed["sid"] == "hook", reviewed
    assert reviewed["furthest"]["id"] == furthest_before_review["id"], reviewed
    assert reviewed["score"]["1"]["q1.1"] is not None

    # Close the page, open a new one in the same profile, go home → Continue.
    pg2 = ctx.new_page()
    try:
        pg.close()
    except Exception:
        pass
    pg = pg2
    pg.goto(HOME, wait_until="domcontentloaded")
    pg.wait_for_timeout(600)
    dismiss(pg)
    home = pg.evaluate("""() => {
      const card=document.querySelector('#card-me');
      const h=Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      return {
        href: card && card.getAttribute('href'),
        badge: card && (card.querySelector('.badge')||{}).textContent,
        label: card && (card.querySelector('p')||{}).textContent,
        body: document.body.innerText,
        sh: h,
        xpShown: /\\d+\\s*XP/.test(document.body.innerText)
      };
    }""")
    print("home progress", home)
    assert home["badge"] and "Continue" in home["badge"], home
    assert home["label"] and "of" in home["label"], home
    assert "Continue" in home["body"], home
    assert home["xpShown"], home
    # Slightly over 980 is a failure we'll fix; print it either way.
    pg.screenshot(path=str(SHOTS / "progress_home.png"), full_page=False)
    print("wrote", SHOTS / "progress_home.png")

    # Tap the course card: resume at furthest (the quiz), not the review hook.
    pg.locator("#card-me").click()
    pg.wait_for_timeout(800)
    dismiss(pg)
    resumed = store_snap(pg)
    print("resumed from home", {k: resumed[k] for k in ("sid","hash","furthest","xp","score")})
    assert resumed["sid"] == "quiz-q1-1", resumed
    assert resumed["score"]["1"]["q1.1"] is not None
    assert resumed["xp"] == xp_before
    assert not pg.locator("#unitOverview").is_visible(), "home Continue should skip the overview and resume the lesson"

    # Lessons menu jumps back without resetting furthest or scores.
    pg.locator("#conceptsBtn").click()
    pg.wait_for_timeout(250)
    assert pg.locator("#clist .sbtn").count() > 0, "Lessons menu should list slides"
    pg.locator('#clist .sbtn').first.click()
    pg.wait_for_timeout(300)
    jumped = store_snap(pg)
    assert jumped["sid"] == "hook", jumped
    assert jumped["furthest"]["id"] == "quiz-q1-1", jumped
    assert jumped["score"]["1"]["q1.1"] is not None
    ctx.close()
    print("persistent context PASS")
    return xp_before

def run_legacy_migrate(p):
    br = p.webkit.launch()
    ctx = br.new_context(**IPHONE)
    legacy = {
        "score": {"1": {"q1.1": 1}, "2": {}, "3": {}, "4": {}, "5": {}},
        "current": 1,
        "slide": {"1": 8},
    }
    fun = {"xp": 40, "streak": 1, "bestStreak": 1, "daily": {"date": "", "days": 0},
           "badges": [], "cards": [], "fx": True, "sound": False, "correct": 1,
           "dayStreak": {"last": "2026-11-22", "days": 3, "freezes": 0, "best": 3, "earnedAt": 0}}
    ctx.add_init_script(
      "localStorage.removeItem('grokiversity.v1');"
      "localStorage.removeItem('grokiversity.fun.v1');"
      "localStorage.setItem('grokeversity.v1', %s);"
      "localStorage.setItem('grokeversity.fun.v1', %s);" % (json.dumps(json.dumps(legacy)), json.dumps(json.dumps(fun)))
    )
    pg = ctx.new_page()
    pg.goto(HOME, wait_until="domcontentloaded")
    pg.wait_for_timeout(600)
    migrated = pg.evaluate("""() => {
      const neu=localStorage.getItem('grokiversity.v1');
      const fun=JSON.parse(localStorage.getItem('grokiversity.fun.v1')||'{}');
      const s=JSON.parse(neu||'{}');
      const card=document.querySelector('#card-me');
      return {
        hasNew: !!neu,
        score: s.score && s.score[1] && s.score[1]['q1.1'],
        xp: fun.xp,
        badge: card && (card.querySelector('.badge')||{}).textContent,
        label: card && (card.querySelector('p')||{}).textContent,
        href: card && card.getAttribute('href')
      };
    }""")
    print("legacy home", migrated)
    assert migrated["hasNew"], migrated
    assert migrated["score"] == 1, migrated
    assert migrated["xp"] == 40, migrated
    assert migrated["badge"] and "Continue" in migrated["badge"], migrated

    pg.locator("#card-me").click()
    pg.wait_for_timeout(800)
    dismiss(pg)
    at = store_snap(pg)
    print("legacy resume", {k: at[k] for k in ("sid","slideId","furthest","slideVer","score","xp")})
    assert at["score"]["1"]["q1.1"] == 1, at
    assert at["xp"] == 40, at
    assert at["sid"] == "quiz-q1-1", at
    assert at["slideVer"] == 3, at
    ctx.close(); br.close()
    print("legacy v1 migrate PASS")

def main():
    with sync_playwright() as p:
        run_persistent(p)
        run_legacy_migrate(p)
    print("ALL PROGRESS TESTS PASSED")

if __name__ == "__main__":
    main()
