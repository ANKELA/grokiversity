/* Grokeversity parameterized quiz bank.
   Seeded variants, shuffle helpers, and worked solutions for Statics Unit 1
   Intro AI Unit 1, and ECON 101 Unit 1. Loaded before app.js / ai.js / econ.js. */
(function (root) {
  "use strict";

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffleInPlace(rng, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function fmt(v, d) {
    if (v == null || !isFinite(+v)) return String(v);
    v = +v;
    if (d == null) {
      if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
      var ad = Math.abs(v);
      d = ad >= 100 ? 1 : ad >= 10 ? 2 : 4;
    }
    var s = v.toFixed(d);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }
  function vecTex(a, d) { return "(" + a.map(function (x) { return fmt(x, d); }).join(",\\,") + ")"; }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function cosd(d) { return Math.cos(rad(d)); }
  function sind(d) { return Math.sin(rad(d)); }
  function hypot3(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
  function finite(v) { return typeof v === "number" && isFinite(v); }
  function okNum(v, minAbs) {
    return finite(v) && Math.abs(v) >= (minAbs == null ? 1e-8 : minAbs);
  }
  function solve3(A, b) {
    var M = [];
    var i, r, c, p, t, f, piv;
    for (i = 0; i < 3; i++) M[i] = A[i].concat([b[i]]).map(Number);
    for (i = 0; i < 3; i++) {
      p = i;
      for (r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      if (Math.abs(M[p][i]) < 1e-12) return null;
      if (p !== i) { t = M[i]; M[i] = M[p]; M[p] = t; }
      piv = M[i][i];
      for (c = i; c < 4; c++) M[i][c] /= piv;
      for (r = 0; r < 3; r++) if (r !== i) {
        f = M[r][i];
        for (c = i; c < 4; c++) M[r][c] -= f * M[i][c];
      }
    }
    return [M[0][3], M[1][3], M[2][3]];
  }
  function unit(v) {
    var n = hypot3(v[0], v[1], v[2]);
    if (n < 1e-12) return null;
    return [v[0] / n, v[1] / n, v[2] / n];
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function mean(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s / a.length; }

  var G = 9.81;
  var FIXED = {
    "s:q2.1": "Conceptual support-reaction counts — not a numeric problem.",
    "s:q2.3": "Conceptual pin-pin beam unknown/equation/indeterminacy counts.",
    "s:q2.5": "Conceptual 3D support component counts.",
    "s:q2.4": "Conceptual two-force member and beam-FBD unknown count."
  };

  var _store = null, _save = null, _course = "s", _cache = {};

  function attachStore(store, save, course) {
    _store = store || {};
    _save = save;
    _course = course || _course || "s";
    if (!_store.quiz) _store.quiz = { order: {}, orderSeed: {}, attempt: {} };
    if (!_store.quiz.order) _store.quiz.order = {};
    if (!_store.quiz.orderSeed) _store.quiz.orderSeed = {};
    if (!_store.quiz.attempt) _store.quiz.attempt = {};
    _cache = {};
  }
  function persist() { if (_save) _save(); }

  function orderOf(conceptId, ids) {
    ids = ids.slice();
    if (!_store) {
      var tmp = ids.slice();
      shuffleInPlace(mulberry32((Date.now() ^ hash(conceptId)) >>> 0), tmp);
      return tmp;
    }
    var qz = _store.quiz;
    var prev = qz.order[conceptId];
    var same = prev && prev.length === ids.length && ids.every(function (id) { return prev.indexOf(id) >= 0; });
    if (!same) {
      var seed = (Math.floor(Math.random() * 0xffffffff) ^ hash(conceptId) ^ (Date.now() & 0xffffffff)) >>> 0;
      var ord = ids.slice();
      shuffleInPlace(mulberry32(seed), ord);
      qz.order[conceptId] = ord;
      qz.orderSeed[conceptId] = seed;
      persist();
    }
    return qz.order[conceptId].slice();
  }

  function currentSeed(qid) {
    if (!_store) return (hash(qid + ":loose") ^ 0x9e3779b9) >>> 0;
    var att = _store.quiz.attempt[qid];
    if (!att || att.seed == null) {
      var s = (Math.floor(Math.random() * 0xffffffff) ^ hash(_course + ":" + qid) ^ (Date.now() & 0xffffffff)) >>> 0;
      _store.quiz.attempt[qid] = { seed: s, n: 0, tries: (att && att.tries) || 0 };
      persist();
    }
    return _store.quiz.attempt[qid].seed >>> 0;
  }
  function getTries(qid) {
    return (_store && _store.quiz && _store.quiz.attempt[qid] && _store.quiz.attempt[qid].tries) || 0;
  }
  function bumpTries(qid) {
    if (!_store) return getTries(qid) + 1;
    var a = _store.quiz.attempt[qid] || { seed: currentSeed(qid), n: 0, tries: 0 };
    a.tries = (a.tries || 0) + 1;
    _store.quiz.attempt[qid] = a;
    persist();
    return a.tries;
  }
  function fresh(qid) {
    var prev = (_store && _store.quiz.attempt[qid]) || { tries: 0 };
    var s = (Math.floor(Math.random() * 0xffffffff) ^ hash(qid + ":" + Date.now()) ^ (getTries(qid) * 9973)) >>> 0;
    if (_store) {
      _store.quiz.attempt[qid] = { seed: s, n: (prev.n || 0) + 1, tries: prev.tries || 0 };
      persist();
    }
    delete _cache[qid];
    return instantiate(qid, s, _course);
  }

  /* ---------- diagrams (class q-diagram only — not svg.diagram) ---------- */
  function marker(id) {
    return '<marker id="' + id + '" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#d7deea"/></marker>';
  }
  function svgWrap(id, inner, w, h) {
    w = w || 360; h = h || 140;
    return '<svg class="q-diagram" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="140" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>' + marker(id) + '</defs>' + inner + "</svg>";
  }
  function diagTwoForces(qid, F1, th1, F2, th2) {
    var mid = "qa-" + qid.replace(".", "-");
    var cx = 110, cy = 72, s = 0.14;
    function arm(F, th, col, label) {
      var x = cx + F * s * Math.cos(rad(th));
      var y = cy - F * s * Math.sin(rad(th));
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + col + '" stroke-width="2.6" marker-end="url(#' + mid + ')"/>' +
        '<text x="' + (x + (x >= cx ? 6 : -6)).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" fill="' + col + '" font-size="11" text-anchor="' + (x >= cx ? "start" : "end") + '">' + label + "</text>";
    }
    var inner = '<line x1="20" y1="' + cy + '" x2="250" y2="' + cy + '" stroke="#3a4560" stroke-width="1"/>' +
      '<line x1="' + cx + '" y1="128" x2="' + cx + '" y2="12" stroke="#3a4560" stroke-width="1"/>' +
      '<text x="254" y="' + (cy + 4) + '" fill="#9aa3c7" font-size="10">+x</text>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#e8eaf6"/>' +
      arm(F1, th1, "#ff8a65", fmt(F1, 0) + " N, " + th1 + "°") +
      arm(F2, th2, "#4dd0e1", fmt(F2, 0) + " N, " + th2 + "°");
    return svgWrap(mid, inner, 360, 140);
  }
  function diagCables(qid, m, a, b) {
    var mid = "qb-" + qid.replace(".", "-");
    var ax = 180, ay = 88, L = 70;
    var bx = ax - L * Math.cos(rad(a)), by = ay - L * Math.sin(rad(a));
    var cx = ax + L * Math.cos(rad(b)), cy = ay - L * Math.sin(rad(b));
    var inner = '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + ax + '" y2="' + ay + '" stroke="#ff8a65" stroke-width="2.4" marker-end="url(#' + mid + ')"/>' +
      '<line x1="' + cx.toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + ax + '" y2="' + ay + '" stroke="#4dd0e1" stroke-width="2.4" marker-end="url(#' + mid + ')"/>' +
      '<line x1="' + ax + '" y1="' + ay + '" x2="' + ax + '" y2="128" stroke="#ffd54f" stroke-width="2"/>' +
      '<rect x="164" y="128" width="32" height="20" rx="3" fill="#2a3058" stroke="#ffd54f"/>' +
      '<text x="' + (bx - 4).toFixed(1) + '" y="' + (by - 4).toFixed(1) + '" fill="#ff8a65" font-size="11" text-anchor="end">AB ' + a + "°</text>" +
      '<text x="' + (cx + 4).toFixed(1) + '" y="' + (cy - 4).toFixed(1) + '" fill="#4dd0e1" font-size="11">AC ' + b + "°</text>" +
      '<text x="180" y="118" fill="#ffd54f" font-size="11" text-anchor="middle">W=' + fmt(m * G, 1) + " N</text>" +
      '<circle cx="' + ax + '" cy="' + ay + '" r="4" fill="#e8eaf6"/>';
    return svgWrap(mid, inner, 360, 156);
  }
  function diagWrench(qid, F, d, th) {
    var mid = "qc-" + qid.replace(".", "-");
    var x0 = 40, y = 80, x1 = 40 + 220;
    var fx = x1 + 50 * Math.cos(rad(th));
    var fy = y - 50 * Math.sin(rad(th));
    var inner = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#c5cae9" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="' + x0 + '" cy="' + y + '" r="8" fill="#7c9cff"/>' +
      '<line x1="' + x1 + '" y1="' + y + '" x2="' + fx.toFixed(1) + '" y2="' + fy.toFixed(1) + '" stroke="#ff8a65" stroke-width="2.5" marker-end="url(#' + mid + ')"/>' +
      '<text x="' + x0 + '" y="58" fill="#7c9cff" font-size="11" text-anchor="middle">bolt</text>' +
      '<text x="150" y="68" fill="#9aa3c7" font-size="11">d=' + fmt(d, 2) + " m</text>" +
      '<text x="' + fx.toFixed(1) + '" y="' + (fy - 6).toFixed(1) + '" fill="#ff8a65" font-size="11">' + fmt(F, 0) + " N, " + th + "°</text>";
    return svgWrap(mid, inner, 360, 140);
  }
  function diagBeam(qid, L, P, x) {
    var mid = "qd-" + qid.replace(".", "-");
    var x0 = 40, x1 = 320, y = 80, s = (x1 - x0) / L;
    var px = x0 + x * s;
    var inner = '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="#c5cae9" stroke-width="6" stroke-linecap="round"/>' +
      '<polygon points="' + x0 + "," + (y + 6) + " " + (x0 - 8) + "," + (y + 22) + " " + (x0 + 8) + "," + (y + 22) + '" fill="#7c9cff"/>' +
      '<circle cx="' + x1 + '" cy="' + (y + 10) + '" r="8" fill="none" stroke="#4dd0e1" stroke-width="2"/>' +
      '<line x1="' + px + '" y1="' + (y - 48) + '" x2="' + px + '" y2="' + (y - 6) + '" stroke="#ff8a65" stroke-width="2.5" marker-end="url(#' + mid + ')"/>' +
      '<text x="' + x0 + '" y="128" fill="#7c9cff" font-size="11" text-anchor="middle">A</text>' +
      '<text x="' + x1 + '" y="128" fill="#4dd0e1" font-size="11" text-anchor="middle">B</text>' +
      '<text x="' + px + '" y="26" fill="#ff8a65" font-size="11" text-anchor="middle">' + fmt(P, 1) + " kN @ x=" + fmt(x, 2) + " m</text>" +
      '<text x="180" y="128" fill="#9aa3c7" font-size="11" text-anchor="middle">L=' + fmt(L, 1) + " m</text>";
    return svgWrap(mid, inner, 360, 140);
  }

  /* ---------- generators (key = course:id) ---------- */
  var GENS = {};

  GENS["s:q1.1"] = function (rng) {
    var Fs = [200, 250, 300, 350, 400, 450, 500, 600, 750];
    var angs = [20, 25, 30, 35, 40, 45, 50, 60, 70, 120, 135, 140, 150, 160];
    var F1 = pick(rng, Fs), F2 = pick(rng, Fs);
    var th1 = pick(rng, angs), th2 = pick(rng, angs);
    if (th1 === th2) return { ok: false };
    var Rx = F1 * cosd(th1) + F2 * cosd(th2);
    var Ry = F1 * sind(th1) + F2 * sind(th2);
    var R = Math.hypot(Rx, Ry);
    var th = deg(Math.atan2(Ry, Rx));
    if (R < 60 || Math.abs(Rx) < 5 && Math.abs(Ry) < 5) return { ok: false };
    return {
      ok: true, givens: { F1: F1, th1: th1, F2: F2, th2: th2 },
      text: "Two forces act on a bolt: \\(F_1=" + fmt(F1, 0) + "\\) N at " + th1 + "° and \\(F_2=" + fmt(F2, 0) + "\\) N at " + th2 + "° (CCW from \\(+x\\)). Find the magnitude and direction of the resultant.",
      ans: [{ q: "|R|", v: R, u: "N", tp: 1 }, { q: "θ_R", v: th, u: "deg", ta: 0.5 }],
      hints: [
        "Resolve each force into x and y components first, then add like components.",
        "\\(\\cos " + th2 + "^\\circ\\) is " + (cosd(th2) < 0 ? "negative" : "positive") + ". Check the sign of \\(F_{2x}\\).",
        "Once you have \\(R_x\\) and \\(R_y\\), use atan2. Which quadrant is R in?"
      ],
      sol: "<div class=\"q-sol\">\\(R_x=F_1\\cos" + th1 + "^\\circ+F_2\\cos" + th2 + "^\\circ=" + fmt(Rx, 2) + "\\) N, \\(R_y=F_1\\sin" + th1 + "^\\circ+F_2\\sin" + th2 + "^\\circ=" + fmt(Ry, 2) + "\\) N. Then \\(|R|=\\sqrt{R_x^2+R_y^2}=" + fmt(R, 2) + "\\) N and \\(\\theta_R=\\mathrm{atan2}(R_y,R_x)=" + fmt(th, 1) + "^\\circ\\).</div>",
      diagram: diagTwoForces("q1.1", F1, th1, F2, th2)
    };
  };

  GENS["s:q1.4"] = function (rng) {
    var triples = [[3, 0, 4], [4, 0, 3], [5, 0, 12], [6, 0, 8], [8, 0, 6], [5, 12, 0], [9, 12, 8], [2, 3, 6]];
    var C = pick(rng, triples).slice();
    if (rng() < 0.4) C[1] = pick(rng, [-2, -1, 0, 1, 2]);
    var u = unit(C); if (!u) return { ok: false };
    var k = pick(rng, [200, 250, 300, 400, 500]);
    var s1 = pick(rng, [-1, 1]) * pick(rng, [200, 250, 300, 400, 500]);
    var s2 = pick(rng, [-1, 1]) * pick(rng, [150, 200, 250, 300]);
    // An orthogonal-ish pair
    var p = [-u[1], u[0], 0];
    if (hypot3(p[0], p[1], p[2]) < 0.2) p = [0, -u[2], u[1]];
    p = unit(p); if (!p) return { ok: false };
    var q = cross(u, p);
    var F = [k * u[0] + s1 * p[0] + s2 * q[0], k * u[1] + s1 * p[1] + s2 * q[1], k * u[2] + s1 * p[2] + s2 * q[2]];
    var Foc = dot(F, u);
    var mag = hypot3(F[0], F[1], F[2]);
    if (mag < 40 || Math.abs(Foc) < 20) return { ok: false };
    var cang = Foc / mag;
    if (cang > 1) cang = 1; if (cang < -1) cang = -1;
    var th = deg(Math.acos(cang));
    return {
      ok: true, givens: { F: F, C: C },
      text: "\\(\\vec F=" + vecTex(F, 1) + "\\) N. Find its component along the line from O to C" + vecTex(C, 0) + " m, and the angle between \\(\\vec F\\) and OC.",
      ans: [{ q: "F_OC", v: Foc, u: "N", tp: 1 }, { q: "θ", v: th, u: "deg", ta: 0.5 }],
      hints: [
        "First find the unit vector \\(\\hat u_{OC}\\). How long is OC?",
        "\\(F_{OC}=\\vec F\\cdot\\hat u_{OC}\\) and \\(\\cos\\theta=F_{OC}/|\\vec F|\\)."
      ],
      sol: "<div class=\"q-sol\">\\(|OC|=" + fmt(hypot3(C[0], C[1], C[2]), 3) + "\\) m, so \\(\\hat u_{OC}=" + vecTex(u, 3) + "\\). Then \\(F_{OC}=\\vec F\\cdot\\hat u_{OC}=" + fmt(Foc, 1) + "\\) N and \\(\\theta=\\cos^{-1}(F_{OC}/|F|)=" + fmt(th, 1) + "^\\circ\\).</div>"
    };
  };

  GENS["s:q1.3"] = function (rng) {
    var F1 = pick(rng, [200, 250, 300, 400, 500, 600, 750]);
    var th1 = pick(rng, [15, 20, 25, 30, 35, 40, 45, -15, -20, -25, -30]);
    var R = pick(rng, [400, 500, 600, 700, 800, 900, 1000]);
    var F2x = R - F1 * cosd(th1);
    var F2y = 0 - F1 * sind(th1);
    var F2 = Math.hypot(F2x, F2y);
    var th2 = deg(Math.atan2(F2y, F2x));
    if (F2 < 40 || Math.abs(th2) < 2) return { ok: false };
    return {
      ok: true, givens: { F1: F1, th1: th1, R: R },
      text: "Tug 1 pulls a barge with \\(F_1=" + fmt(F1, 0) + "\\) N at " + (th1 > 0 ? "+" : "") + th1 + "°. What force \\(F_2\\) (magnitude and angle) makes the resultant exactly " + fmt(R, 0) + " N along \\(+x\\)?",
      ans: [{ q: "|F₂|", v: F2, u: "N", tp: 1 }, { q: "θ₂", v: th2, u: "deg", ta: 0.5 }],
      hints: [
        "Vector subtraction: \\(\\vec F_2=\\vec R-\\vec F_1\\).",
        "What must \\(F_{2y}\\) be so that \\(R_y=0\\)?"
      ],
      sol: "<div class=\"q-sol\">\\(\\vec R=(" + fmt(R, 0) + ",\\,0)\\) N and \\(\\vec F_1=(" + fmt(F1 * cosd(th1), 2) + ",\\," + fmt(F1 * sind(th1), 2) + ")\\) N, so \\(\\vec F_2=(" + fmt(F2x, 2) + ",\\," + fmt(F2y, 2) + ")\\) N. Then \\(|F_2|=" + fmt(F2, 1) + "\\) N and \\(\\theta_2=\\mathrm{atan2}(F_{2y},F_{2x})=" + fmt(th2, 1) + "^\\circ\\).</div>"
    };
  };

  GENS["s:q3.1"] = function (rng) {
    var m = pick(rng, [20, 25, 30, 40, 50, 60, 80]);
    var a = pick(rng, [20, 25, 30, 35, 40, 45, 50, 60]);
    var b = pick(rng, [20, 25, 30, 35, 40, 45, 50, 60]);
    if (a + b >= 170 || a + b <= 20) return { ok: false };
    var W = m * G;
    var den = sind(a + b);
    if (Math.abs(den) < 0.2) return { ok: false };
    var TAB = W * cosd(b) / den;
    var TAC = W * cosd(a) / den;
    if (TAB < 20 || TAC < 20) return { ok: false };
    return {
      ok: true, givens: { m: m, alpha: a, beta: b },
      text: "A " + m + " kg crate hangs from ring A. Cable AB runs up-left at " + a + "° above horizontal; cable AC runs up-right at " + b + "°. Find \\(T_{AB}\\) and \\(T_{AC}\\).",
      ans: [{ q: "T_AB", v: TAB, u: "N", tp: 1 }, { q: "T_AC", v: TAC, u: "N", tp: 1 }],
      hints: [
        "W = mg = " + m + "\\times 9.81. Draw the FBD of the ring: three forces.",
        "Write \\(\\sum F_x=0\\) and \\(\\sum F_y=0\\), giving two equations in two unknowns."
      ],
      sol: "<div class=\"q-sol\">\\(W=mg=" + fmt(W, 2) + "\\) N. Equilibrium gives \\(T_{AB}=" + "W\\cos\\beta/\\sin(\\alpha+\\beta)=" + fmt(TAB, 1) + "\\) N and \\(T_{AC}=W\\cos\\alpha/\\sin(\\alpha+\\beta)=" + fmt(TAC, 1) + "\\) N, with \\(\\alpha=" + a + "^\\circ\\) and \\(\\beta=" + b + "^\\circ\\).</div>",
      diagram: diagCables("q3.1", m, a, b)
    };
  };

  GENS["s:q3.2"] = function (rng) {
    var m = pick(rng, [4, 5, 6, 8, 10, 12]);
    var k = pick(rng, [400, 500, 600, 800, 1000, 1200]);
    var th = pick(rng, [20, 25, 30, 35, 40, 45, 50, 60]);
    var W = m * G;
    var sT = sind(th);
    if (sT < 0.2) return { ok: false };
    var TAC = W / sT;
    var Fs = TAC * cosd(th);
    var sm = Fs / k; // m
    var smm = sm * 1000;
    if (TAC < 15 || Fs < 5 || smm < 5) return { ok: false };
    return {
      ok: true, givens: { m: m, k: k, theta: th },
      text: "An " + m + " kg lamp hangs at A. A horizontal spring AB (\\(k=" + fmt(k, 0) + "\\) N/m) pulls left; cable AC pulls up-right at " + th + "° above horizontal. Find \\(T_{AC}\\), the spring force, and the spring stretch.",
      ans: [{ q: "T_AC", v: TAC, u: "N", tp: 1 }, { q: "F_spring", v: Fs, u: "N", tp: 1 }, { q: "stretch", v: smm, u: "mm", tp: 1 }],
      hints: [
        "Only the cable has a vertical component. Start with \\(\\sum F_y\\).",
        "Spring: \\(F=ks\\), so \\(s=F/k\\). Report the stretch in mm."
      ],
      sol: "<div class=\"q-sol\">\\(W=" + fmt(W, 2) + "\\) N. \\(\\sum F_y=0\\) gives \\(T_{AC}\\sin" + th + "^\\circ=W\\), so \\(T_{AC}=" + fmt(TAC, 2) + "\\) N. Then \\(F_\\mathrm{spring}=T_{AC}\\cos" + th + "^\\circ=" + fmt(Fs, 1) + "\\) N and \\(s=F/k=" + fmt(smm, 1) + "\\) mm.</div>"
    };
  };

  GENS["s:q3.3"] = function (rng) {
    var P = pick(rng, [800, 1000, 1200, 1500, 1600, 2000]);
    var zs = pick(rng, [5, 6, 8]);
    var B = [pick(rng, [-4, -3, -2, -1]), pick(rng, [-4, -3, -2, -1]), zs];
    var C = [pick(rng, [1, 2, 3, 4]), pick(rng, [-4, -3, -2, -1, 1]), zs];
    var D = [pick(rng, [-1, 0, 1, 2]), pick(rng, [2, 3, 4, 5]), zs];
    var uB = unit(B), uC = unit(C), uD = unit(D);
    if (!uB || !uC || !uD) return { ok: false };
    var T = solve3(
      [[uB[0], uC[0], uD[0]], [uB[1], uC[1], uD[1]], [uB[2], uC[2], uD[2]]],
      [0, 0, P]
    );
    if (!T || T[0] < 50 || T[1] < 50 || T[2] < 50) return { ok: false };
    return {
      ok: true, givens: { P: P, B: B, C: C, D: D },
      text: "A " + fmt(P, 0) + " N load hangs from point A at the origin, held by cables to B" + vecTex(B, 0) + " m, C" + vecTex(C, 0) + " m and D" + vecTex(D, 0) + " m. Find the tension in each cable.",
      ans: [{ q: "T_AB", v: T[0], u: "N", tp: 1 }, { q: "T_AC", v: T[1], u: "N", tp: 1 }, { q: "T_AD", v: T[2], u: "N", tp: 1 }],
      hints: [
        "Write each cable force as \\(T\\hat u\\). Find the lengths |AB|, |AC|, |AD| first.",
        "Three equations: \\(\\sum F_x=\\sum F_y=\\sum F_z=0\\), with the load \\((0,0,-" + fmt(P, 0) + ")\\) N.",
        "Solve the 3×3 system. All tensions must come out positive."
      ],
      sol: "<div class=\"q-sol\">Unit vectors from A: \\(\\hat u_{AB}=" + vecTex(uB, 3) + "\\), \\(\\hat u_{AC}=" + vecTex(uC, 3) + "\\), \\(\\hat u_{AD}=" + vecTex(uD, 3) + "\\). Solving \\([\\hat u_{AB}\\,\\hat u_{AC}\\,\\hat u_{AD}]\\mathbf{T}=(0,0," + fmt(P, 0) + ")\\) gives \\(T_{AB}=" + fmt(T[0], 1) + "\\) N, \\(T_{AC}=" + fmt(T[1], 1) + "\\) N, \\(T_{AD}=" + fmt(T[2], 1) + "\\) N.</div>"
    };
  };

  GENS["s:q4.1"] = function (rng) {
    var F = pick(rng, [100, 120, 150, 200, 250, 300, 400]);
    var d = pick(rng, [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75]);
    var th = pick(rng, [30, 40, 45, 50, 60, 75, 90]);
    var M = F * d * sind(th);
    if (M < 5) return { ok: false };
    return {
      ok: true, givens: { F: F, d: d, theta: th },
      text: "A " + fmt(F, 0) + " N force is applied at the end of a " + fmt(d, 2) + " m wrench, at " + th + "° to the handle. What moment does it produce about the bolt?",
      ans: [{ q: "M", v: M, u: "N·m", tp: 1 }],
      hints: [
        "Only the component perpendicular to the handle creates moment.",
        "\\(M=Fd\\sin\\theta\\)."
      ],
      sol: "<div class=\"q-sol\">\\(M=Fd\\sin\\theta=" + fmt(F, 0) + "\\times" + fmt(d, 2) + "\\times\\sin" + th + "^\\circ=" + fmt(M, 2) + "\\) N·m.</div>",
      diagram: diagWrench("q4.1", F, d, th)
    };
  };

  GENS["s:q4.2"] = function (rng) {
    var F = pick(rng, [200, 250, 300, 400, 500, 600, 800]);
    var th = pick(rng, [20, 25, 30, 40, 45, 60, -20, -30, -45, 120, 150]);
    var x = pick(rng, [1, 1.5, 2, 2.5, 3, 4]);
    var y = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3]);
    var Fx = F * cosd(th), Fy = F * sind(th);
    var Mo = x * Fy - y * Fx;
    if (Math.abs(Mo) < 8) return { ok: false };
    return {
      ok: true, givens: { F: F, theta: th, x: x, y: y },
      text: "A " + fmt(F, 0) + " N force at " + th + "° above +x acts at point (" + fmt(x, 1) + ", " + fmt(y, 1) + ") m. Find the moment about the origin (CCW positive) and state its sense.",
      ans: [{ q: "M_O", v: Mo, u: "N·m", tp: 1 }],
      hints: [
        "Fx = " + fmt(Fx, 1) + " N, Fy = " + fmt(Fy, 1) + " N.",
        "\\(M_O = x F_y − y F_x\\)."
      ],
      sol: "<div class=\"q-sol\">\\(F_x=" + fmt(Fx, 2) + "\\) N, \\(F_y=" + fmt(Fy, 2) + "\\) N. Then \\(M_O=x F_y-y F_x=" + fmt(Mo, 1) + "\\) N·m (" + (Mo >= 0 ? "CCW" : "CW") + ").</div>"
    };
  };

  GENS["s:q4.5"] = function (rng) {
    var F = pick(rng, [200, 250, 300, 400, 500, 600, 800]);
    var x = pick(rng, [1.5, 2, 2.5, 3, 3.5, 4, 5]);
    var Fy = -F, Mo = -F * x;
    return {
      ok: true, givens: { F: F, x: x },
      text: "A " + fmt(F, 0) + " N downward force acts at x = " + fmt(x, 1) + " m on a horizontal beam. Replace it with an equivalent force-couple system at the origin O.",
      ans: [{ q: "F_y at O", v: Fy, u: "N", tp: 0.5 }, { q: "M_O", v: Mo, u: "N·m", tp: 0.5 }],
      hints: [
        "The force is unchanged; the couple equals the moment of the original force about O."
      ],
      sol: "<div class=\"q-sol\">The force at O is still \\(F_y=-" + fmt(F, 0) + "\\) N. The couple is \\(M_O=-F x=-" + fmt(F * x, 0) + "\\) N·m (CW).</div>"
    };
  };

  GENS["s:q4.3"] = function (rng) {
    var F = [pick(rng, [-400, -300, -250, -200, 200, 250, 300]), pick(rng, [-300, -200, 200, 250, 300, 400]), pick(rng, [200, 300, 400, 500, 600])];
    var r = [pick(rng, [1, 1.5, 2, 2.5, 3]), pick(rng, [0, 0, 0.5, 1]), pick(rng, [0, 0, 0, 1])];
    var M = cross(r, F);
    var mag = hypot3(M[0], M[1], M[2]);
    if (mag < 20) return { ok: false };
    return {
      ok: true, givens: { F: F, r: r },
      text: "The force \\(\\vec F=" + vecTex(F, 1) + "\\) N acts at A" + vecTex(r, 1) + " m. Find \\(\\vec M_O=\\vec r\\times\\vec F\\) and its magnitude.",
      ans: [{ q: "M_x", v: M[0], u: "N·m", ta: 1 }, { q: "M_y", v: M[1], u: "N·m", tp: 1 }, { q: "M_z", v: M[2], u: "N·m", tp: 1 }, { q: "|M_O|", v: mag, u: "N·m", tp: 1 }],
      hints: [
        "\\(\\vec r = " + vecTex(r, 1) + "\\). Expand the 3×3 determinant |i j k; rx ry rz; Fx Fy Fz|."
      ],
      sol: "<div class=\"q-sol\">\\(\\vec M_O=\\vec r\\times\\vec F=" + vecTex(M, 1) + "\\) N·m, so \\(|M_O|=" + fmt(mag, 1) + "\\) N·m.</div>"
    };
  };

  GENS["s:q4.4"] = function (rng) {
    var F = [pick(rng, [-400, -300, -250, 200, 250, 300]), pick(rng, [-300, -200, 200, 250, 400]), pick(rng, [200, 300, 400, 500, 600])];
    var r = [pick(rng, [1.5, 2, 2.5, 3]), pick(rng, [0, 0, 0.5]), pick(rng, [0, 0, 1])];
    var C = pick(rng, [[3, 0, 4], [4, 0, 3], [6, 0, 8], [5, 0, 12], [8, 0, 6], [3, 4, 0]]);
    var u = unit(C); if (!u) return { ok: false };
    var M = cross(r, F);
    var Moc = dot(u, M);
    if (Math.abs(Moc) < 15) return { ok: false };
    return {
      ok: true, givens: { F: F, r: r, C: C },
      text: "The force \\(\\vec F=" + vecTex(F, 1) + "\\) N acts at A" + vecTex(r, 1) + " m. Find the moment of this force about the axis through O and C" + vecTex(C, 0) + " m.",
      ans: [{ q: "M_OC", v: Moc, u: "N·m", tp: 1 }],
      hints: [
        "First form \\(\\vec M_O=\\vec r\\times\\vec F\\), then \\(M_{OC}=\\hat u_{OC}\\cdot\\vec M_O\\)."
      ],
      sol: "<div class=\"q-sol\">\\(\\vec M_O=" + vecTex(M, 1) + "\\) N·m and \\(\\hat u_{OC}=" + vecTex(u, 3) + "\\), so \\(M_{OC}=\\hat u_{OC}\\cdot\\vec M_O=" + fmt(Moc, 1) + "\\) N·m.</div>"
    };
  };

  GENS["s:q5.1"] = function (rng) {
    var L = pick(rng, [4, 5, 6, 8, 10]);
    var P = pick(rng, [6, 8, 10, 12, 15, 16, 20]); // kN
    var fr = pick(rng, [0.25, 1 / 3, 0.4, 0.5, 0.6, 2 / 3, 0.75]);
    var x = L * fr;
    if (x < 0.4 || L - x < 0.4) return { ok: false };
    var Ay = P * 1000 * (L - x) / L;
    var By = P * 1000 * x / L;
    if (Ay < 200 || By < 200) return { ok: false };
    return {
      ok: true, givens: { L: L, P: P, x: x },
      text: "A " + fmt(L, 1) + " m simply supported beam has a pin at A (x = 0) and a roller at B (x = " + fmt(L, 1) + " m). A " + fmt(P, 1) + " kN downward load acts at x = " + fmt(x, 2) + " m. Find \\(A_y\\) and \\(B_y\\).",
      ans: [{ q: "A_y", v: Ay, u: "N", tp: 1 }, { q: "B_y", v: By, u: "N", tp: 1 }],
      hints: [
        "\\(\\sum M_A=0\\) gives \\(B_y\\) directly."
      ],
      sol: "<div class=\"q-sol\">\\(\\sum M_A=0\\): \\(B_y L = P x\\), so \\(B_y=" + fmt(By, 1) + "\\) N. Then \\(A_y=P-B_y=" + fmt(Ay, 1) + "\\) N (with \\(P\\) in newtons).</div>",
      diagram: diagBeam("q5.1", L, P, x)
    };
  };

  GENS["s:q5.2"] = function (rng) {
    var Lb = pick(rng, [4, 5, 6, 8]);
    var Lu = pick(rng, [2, 3, 4, 5]);
    var Lp = pick(rng, [Lb, Lb + 1, Lb + 2, Lu + 1]);
    var w = pick(rng, [2, 3, 4, 5, 6]); // kN/m
    var P = pick(rng, [4, 5, 6, 8, 10]);
    if (Lu > Lp || Lu < 0.5) return { ok: false };
    var Wd = w * Lu;
    var xd = Lu / 2;
    var By = (Wd * xd + P * Lp) / Lb;
    var Ay = Wd + P - By;
    if (By < 0.4 || Ay < 0.15) return { ok: false };
    return {
      ok: true, givens: { Lb: Lb, w: w, Lu: Lu, P: P, Lp: Lp },
      text: "A beam has a pin at A (x = 0) and a roller at B (x = " + fmt(Lb, 0) + " m). It carries a uniform load of " + fmt(w, 0) + " kN/m from x = 0 to x = " + fmt(Lu, 0) + " m and a " + fmt(P, 0) + " kN point load at " + (Lp > Lb ? "the free end " : "") + "x = " + fmt(Lp, 0) + " m. Find \\(A_y\\) and \\(B_y\\).",
      ans: [{ q: "A_y", v: Ay, u: "kN", tp: 1 }, { q: "B_y", v: By, u: "kN", tp: 1 }],
      hints: [
        "Distributed load resultant: " + fmt(Wd, 1) + " kN at x = " + fmt(xd, 2) + " m."
      ],
      sol: "<div class=\"q-sol\">The uniform load is equivalent to " + fmt(Wd, 1) + " kN at x=" + fmt(xd, 2) + " m. \\(\\sum M_A=0\\) gives \\(B_y=" + fmt(By, 2) + "\\) kN, then \\(A_y=" + fmt(Ay, 2) + "\\) kN.</div>"
    };
  };

  GENS["s:q5.3"] = function (rng) {
    var L = pick(rng, [4, 5, 6, 8]);
    var th = pick(rng, [15, 20, 30, 40, 45]);
    var P = pick(rng, [6, 8, 10, 12, 15]); // kN
    var d = pick(rng, [2, 2.5, 3, 3.5, 4]);
    if (d >= L - 0.2 || d < 0.8) return { ok: false };
    var Pn = P * 1000;
    var NB = (Pn * d) / (L * cosd(th));
    var Ax = NB * sind(th);
    var Ay = Pn - NB * cosd(th);
    if (NB < 200 || Ay < 50) return { ok: false };
    return {
      ok: true, givens: { L: L, theta: th, P: P, d: d },
      text: "Beam AB (" + fmt(L, 0) + " m) has a pin at A and a roller at B resting on a surface inclined " + th + "° (so the roller reaction is " + th + "° from vertical, leaning toward A). A " + fmt(P, 0) + " kN downward load acts " + fmt(d, 1) + " m from A. Find \\(N_B\\), \\(A_x\\) and \\(A_y\\).",
      ans: [{ q: "N_B", v: NB, u: "N", tp: 1 }, { q: "A_x", v: Ax, u: "N", tp: 1 }, { q: "A_y", v: Ay, u: "N", tp: 1 }],
      hints: [
        "\\(N_B=N_B(-\\sin " + th + "^\\circ,\\,\\cos " + th + "^\\circ)\\).",
        "Only \\(N_B\\cos " + th + "^\\circ\\) creates moment about A."
      ],
      sol: "<div class=\"q-sol\">\\(\\sum M_A=0\\): \\(N_B\\cos" + th + "^\\circ\\cdot L = P\\cdot d\\), so \\(N_B=" + fmt(NB, 0) + "\\) N. Then \\(A_x=N_B\\sin" + th + "^\\circ=" + fmt(Ax, 0) + "\\) N and \\(A_y=P-N_B\\cos" + th + "^\\circ=" + fmt(Ay, 0) + "\\) N.</div>"
    };
  };

  GENS["s:q5.4"] = function (rng) {
    var L = pick(rng, [4, 5, 6, 8]);
    var cy = pick(rng, [1, 2, 3, 4]);
    var dy = pick(rng, [-2, -3, -4, -5]);
    var cz = pick(rng, [2, 3, 4]);
    var dz = pick(rng, [2, 3, 4]);
    var W = pick(rng, [1000, 1500, 2000, 2500, 3000]);
    var B = [L, 0, 0], C = [0, cy, cz], D = [0, dy, dz];
    var uBC = unit([C[0] - B[0], C[1] - B[1], C[2] - B[2]]);
    var uBD = unit([D[0] - B[0], D[1] - B[1], D[2] - B[2]]);
    if (!uBC || !uBD) return { ok: false };
    // Fy: Tc uBC_y + Td uBD_y = 0
    // Fz: Tc uBC_z + Td uBD_z - W = 0
    var A2 = [[uBC[1], uBD[1]], [uBC[2], uBD[2]]];
    var det = A2[0][0] * A2[1][1] - A2[0][1] * A2[1][0];
    if (Math.abs(det) < 1e-8) return { ok: false };
    var rhsy = 0, rhsz = W;
    var Tc = (rhsy * A2[1][1] - A2[0][1] * rhsz) / det;
    var Td = (A2[0][0] * rhsz - rhsy * A2[1][0]) / det;
    if (Tc < 50 || Td < 50) return { ok: false };
    var Ax = -(Tc * uBC[0] + Td * uBD[0]);
    var Ay = -(Tc * uBC[1] + Td * uBD[1]);
    var Az = -(Tc * uBC[2] + Td * uBD[2] - W);
    return {
      ok: true, givens: { B: B, C: C, D: D, W: W },
      text: "A boom lies along the x-axis from a ball-and-socket at A(0,0,0) to B" + vecTex(B, 0) + " m. A " + fmt(W / 1000, 2) + " kN load acts downward (−z) at B. Cables run from B to C" + vecTex(C, 0) + " m and from B to D" + vecTex(D, 0) + " m. Find \\(T_{BC}\\), \\(T_{BD}\\) and the reaction at A.",
      ans: [
        { q: "T_BC", v: Tc, u: "N", tp: 1 },
        { q: "T_BD", v: Td, u: "N", tp: 1 },
        { q: "A_x", v: Ax, u: "N", tp: 1 },
        { q: "A_y", v: Ay, u: "N", ta: 10 },
        { q: "A_z", v: Az, u: "N", ta: 10 }
      ],
      hints: [
        "Write unit vectors \\(\\hat u_{BC}\\) and \\(\\hat u_{BD}\\).",
        "\\(\\sum M_A=\\vec r_{AB}\\times(T_{BC}\\hat u_{BC}+T_{BD}\\hat u_{BD}+\\vec L)=0\\) gives two useful equations."
      ],
      sol: "<div class=\"q-sol\">\\(\\sum M_A=0\\) forces the y and z components of the force at B to vanish, giving \\(T_{BC}=" + fmt(Tc, 0) + "\\) N and \\(T_{BD}=" + fmt(Td, 0) + "\\) N. Then \\(\\sum F=0\\) yields \\(\\vec A=(" + fmt(Ax, 0) + ",\\," + fmt(Ay, 1) + ",\\," + fmt(Az, 1) + ")\\) N.</div>"
    };
  };

  GENS["s:q5.5"] = function (rng) {
    // Keep a 3-4-5 strut: C at distance c along the beam, D is (3/4)c below A, |CD|=(5/4)c
    var scale = pick(rng, [0.75, 1, 1.25, 1.5]);
    var c = 3 * scale;
    var h = 2.25 * scale;
    var L = pick(rng, [c + 1, c + 1.5, 4 * scale, c + scale]);
    if (L <= c + 0.2) L = c + scale;
    var P = pick(rng, [8, 10, 12, 15, 16, 20]); // kN
    var Pbuck = pick(rng, [20, 25, 30, 40]); // kN
    var len = Math.hypot(c, h);
    var ux = c / len, uy = h / len; // D->C on the beam: compression pushes C with (+ux, +uy)
    // Moments about A: (force on beam at C)_y * c - P * L = 0
    // F * uy * c = P * L  => F = P L / (uy c)
    var Fcd = P * L / (uy * c);
    var Ax = -Fcd * ux;
    var Ay_kN = P - Fcd * uy; // this is actually -Fcd*uy + wait: Ay + Fy_on_beam - P = 0, Fy_on_beam = Fcd*uy
    // Ay = P - Fcd*uy  (kN). Canonical was -3.333 kN = -3333 N. Sign: Ay + 13.333 - 10 = 0 => Ay = -3.333. Yes Ay = P - Fcd*uy.
    var Ay = Ay_kN * 1000; // asked in N
    var Amag = Math.hypot(Ax, Ay_kN); // kN
    var Pmax = Pbuck * (uy * c) / L;
    if (Fcd < 1 || Pmax < 1) return { ok: false };
    return {
      ok: true, givens: { L: L, c: c, h: h, P: P, Pbuck: Pbuck },
      text: "EXAM-STYLE (20 min). A horizontal beam AB (" + fmt(L, 2) + " m) is pinned to a wall at A. A straight strut CD connects point C on the beam (" + fmt(c, 2) + " m from A) to point D on the wall, " + fmt(h, 2) + " m directly below A. A load \\(P=" + fmt(P, 0) + "\\) kN acts downward at B. Neglect weights. Find the strut force \\(F_{CD}\\), the pin reaction at A (\\(A_x\\), \\(A_y\\), and magnitude), and the maximum load \\(P\\) if the strut buckles at " + fmt(Pbuck, 0) + " kN compression.",
      ans: [
        { q: "F_CD", v: Fcd, u: "kN", tp: 1 },
        { q: "A_x", v: Ax, u: "kN", tp: 1 },
        { q: "A_y", v: Ay, u: "N", tp: 1 },
        { q: "|A|", v: Amag, u: "kN", tp: 1 },
        { q: "P_max", v: Pmax, u: "kN", tp: 1 }
      ],
      hints: [
        "CD has length " + fmt(len, 2) + " m — a 3-4-5 triangle (scaled).",
        "Moments about A eliminate A_x and A_y."
      ],
      sol: "<div class=\"q-sol\">The strut is a 3-4-5 member of length " + fmt(len, 2) + " m, so a compressive \\(F_{CD}\\) pushes the beam at C with direction \\((+" + fmt(ux, 3) + ",\\,+" + fmt(uy, 3) + ")\\). \\(\\sum M_A=0\\) gives \\(F_{CD}=" + fmt(Fcd, 2) + "\\) kN. Then \\(A_x=" + fmt(Ax, 2) + "\\) kN, \\(A_y=" + fmt(Ay, 0) + "\\) N, \\(|A|=" + fmt(Amag, 2) + "\\) kN, and at buckle \\(P_\\max=" + fmt(Pmax, 2) + "\\) kN.</div>"
    };
  };

  /* ---------- Intro AI ---------- */
  function ptsTex(pts) {
    return pts.map(function (p) { return "(" + fmt(p[0], 2) + "," + fmt(p[1], 2) + ")"; }).join(",\\,");
  }
  function ols(pts) {
    var n = pts.length, i, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (i = 0; i < n; i++) { sx += pts[i][0]; sy += pts[i][1]; }
    var xb = sx / n, yb = sy / n;
    for (i = 0; i < n; i++) {
      var dx = pts[i][0] - xb, dy = pts[i][1] - yb;
      sxx += dx * dx; sxy += dx * dy;
    }
    if (sxx < 1e-12) return null;
    var w = sxy / sxx, b = yb - w * xb;
    var mse = 0;
    for (i = 0; i < n; i++) {
      var e = pts[i][1] - (w * pts[i][0] + b);
      mse += e * e;
    }
    return { w: w, b: b, mse: mse / n, xb: xb, yb: yb, sxx: sxx };
  }
  function mseAt(pts, w, b) {
    var s = 0, i, n = pts.length;
    for (i = 0; i < n; i++) {
      var e = pts[i][1] - (w * pts[i][0] + b);
      s += e * e;
    }
    return s / n;
  }
  function gradMSE(pts, w, b) {
    var n = pts.length, dw = 0, db = 0, i;
    for (i = 0; i < n; i++) {
      var e = pts[i][1] - (w * pts[i][0] + b);
      dw += pts[i][0] * e;
      db += e;
    }
    return { dw: -(2 / n) * dw, db: -(2 / n) * db };
  }
  function randPts(rng) {
    var xs = [1, 2, 3, 4];
    if (rng() < 0.3) xs = [0, 1, 2, 3];
    var ys = [];
    var i;
    for (i = 0; i < 4; i++) ys.push(randInt(rng, 0, 8));
    var pts = xs.map(function (x, i) { return [x, ys[i]]; });
    var o = ols(pts);
    if (!o) return null;
    return pts;
  }
  function softmax(s) {
    var m = Math.max.apply(null, s), i, e = [], z = 0;
    for (i = 0; i < s.length; i++) { e[i] = Math.exp(s[i] - m); z += e[i]; }
    return e.map(function (v) { return v / z; });
  }

  GENS["a:q1.1"] = function (rng) {
    var uA1 = pick(rng, [8, 10, 12, 15]), pA = pick(rng, [0.5, 0.6, 0.7, 0.8]);
    var uA2 = pick(rng, [0, 1, 2]);
    var uB1 = pick(rng, [15, 18, 20, 24]), pB = pick(rng, [0.3, 0.4, 0.5, 0.6]);
    var uB2 = pick(rng, [-4, -2, 0, 1]);
    var uC = pick(rng, [5, 6, 6.5, 7, 8, 9]);
    var EUA = pA * uA1 + (1 - pA) * uA2;
    var EUB = pB * uB1 + (1 - pB) * uB2;
    var EUC = uC;
    if (Math.abs(EUA - EUB) < 0.05) return { ok: false };
    return {
      ok: true, givens: { uA1: uA1, pA: pA, uA2: uA2, uB1: uB1, pB: pB, uB2: uB2, uC: uC },
      text: "A rational agent chooses among three actions. A: utility " + fmt(uA1, 1) + " with probability " + pA + " and utility " + fmt(uA2, 1) + " with probability " + fmt(1 - pA, 2) + ". B: utility " + fmt(uB1, 1) + " with probability " + pB + " and utility \\(" + fmt(uB2, 1) + "\\) with probability " + fmt(1 - pB, 2) + ". C: utility " + fmt(uC, 1) + " with certainty. Compute the expected utility of A, of B, and of C.",
      ans: [{ q: "EU(A)", v: EUA, u: "1", tp: 1 }, { q: "EU(B)", v: EUB, u: "1", tp: 1 }, { q: "EU(C)", v: EUC, u: "1", tp: 1 }],
      hints: [
        "\\(\\mathrm{EU}(a)=\\sum P(\\text{outcome})\\times U(\\text{outcome})\\). For C the probability is 1.",
        "For B, the second term is \\(" + pB + "\\) is not the whole story — include \\(" + fmt(1 - pB, 2) + "\\times(" + fmt(uB2, 1) + ")\\)."
      ],
      sol: "<div class=\"q-sol\">\\(\\mathrm{EU}(A)=" + pA + "\\times" + fmt(uA1, 1) + "+" + fmt(1 - pA, 2) + "\\times" + fmt(uA2, 1) + "=" + fmt(EUA, 2) + "\\), \\(\\mathrm{EU}(B)=" + pB + "\\times" + fmt(uB1, 1) + "+" + fmt(1 - pB, 2) + "\\times(" + fmt(uB2, 1) + ")=" + fmt(EUB, 2) + "\\), and \\(\\mathrm{EU}(C)=" + fmt(EUC, 2) + "\\).</div>"
    };
  };

  GENS["a:q1.2"] = function (rng) {
    var b = pick(rng, [2, 3, 4, 5]);
    var d = pick(rng, [3, 4, 5, 6]);
    if (b === 5 && d === 6) d = 5; // keep the count reasonable
    var nodes = (Math.pow(b, d + 1) - 1) / (b - 1);
    if (nodes > 20000 || nodes !== Math.round(nodes)) return { ok: false };
    return {
      ok: true, givens: { b: b, d: d },
      text: "A complete tree has branching factor \\(b=" + b + "\\). The start node is at depth 0. Breadth-first search tests the goal when a node is generated. The unique goal is the last node generated at depth " + d + ". How many nodes does BFS generate?",
      ans: [{ q: "nodes generated", v: nodes, u: "count", ta: 0 }],
      hints: [
        "Depth \\(k\\) contains \\(b^k\\) nodes. You generate every node at depths 0 through " + d + ".",
        "The sum is \\((b^{d+1}-1)/(b-1)\\) with \\(d=" + d + "\\), \\(b=" + b + "\\)."
      ],
      sol: "<div class=\"q-sol\">\\(\\sum_{k=0}^{" + d + "} b^k=(b^{" + (d + 1) + "}-1)/(b-1)=" + fmt(nodes, 0) + "\\).</div>"
    };
  };

  GENS["a:q1.3"] = function (rng) {
    var pD = pick(rng, [0.005, 0.01, 0.02, 0.05, 0.1]);
    var tpr = pick(rng, [0.9, 0.95, 0.98, 0.99]);
    var fpr = pick(rng, [0.02, 0.05, 0.08, 0.1, 0.15]);
    var pPos = tpr * pD + fpr * (1 - pD);
    var post = (tpr * pD) / pPos;
    var pPosPct = pPos * 100, postPct = post * 100;
    if (pPosPct < 1 || postPct < 0.2) return { ok: false };
    return {
      ok: true, givens: { pD: pD, tpr: tpr, fpr: fpr },
      text: "A disease has prevalence \\(P(D)=" + pD + "\\). A test has \\(P(+\\mid D)=" + tpr + "\\) and false-positive rate \\(P(+\\mid \\neg D)=" + fpr + "\\). Compute \\(P(+)\\) and the posterior \\(P(D\\mid +)\\) as percents (for example 11 %), rounded to the nearest whole number.",
      ans: [{ q: "P(+)", v: pPosPct, u: "%", tp: 1, ri: true }, { q: "P(D|+)", v: postPct, u: "%", tp: 1, ri: true }],
      hints: [
        "Law of total probability: \\(P(+)=P(+\\mid D)P(D)+P(+\\mid\\neg D)P(\\neg D)\\). What is \\(P(\\neg D)\\)?",
        "Then Bayes: \\(P(D\\mid +)=P(+\\mid D)P(D)/P(+)\\)."
      ],
      sol: "<div class=\"q-sol\">\\(P(+)=" + tpr + "\\times" + pD + "+" + fpr + "\\times" + fmt(1 - pD, 3) + "=" + fmt(pPos, 4) + "\\) (" + fmt(pPosPct, 2) + " %). Then \\(P(D\\mid +)=" + fmt(post, 4) + "\\) (" + fmt(postPct, 2) + " %).</div>"
    };
  };

  GENS["a:q1.4"] = function (rng) {
    var nA = pick(rng, [60, 80, 90, 100, 120, 140, 150]);
    var nB = pick(rng, [40, 50, 60, 70, 80, 100]);
    var n = nA + nB;
    if (nA === nB) return { ok: false };
    var maj = 100 * Math.max(nA, nB) / n;
    var correct = pick(rng, [Math.round(0.6 * n), Math.round(0.7 * n), Math.round(0.75 * n), Math.round(0.8 * n), Math.round(0.85 * n)]);
    if (correct >= n || correct <= Math.max(nA, nB) && rng() < 0.3) {
      /* allow model better or worse than majority */
    }
    if (correct <= 0 || correct >= n) return { ok: false };
    var acc = 100 * correct / n;
    return {
      ok: true, givens: { nA: nA, nB: nB, correct: correct },
      text: "A data set has " + nA + " examples of class A and " + nB + " of class B (\\(n=" + n + "\\)). What is the accuracy, as a percent, of the majority-class baseline? A model predicts " + correct + " of the " + n + " labels correctly. What is its accuracy, as a percent?",
      ans: [{ q: "majority baseline", v: maj, u: "%", ta: 0.05 }, { q: "model accuracy", v: acc, u: "%", ta: 0.05 }],
      hints: [
        "The majority class is " + (nA >= nB ? "A" : "B") + ", with " + Math.max(nA, nB) + "/" + n + " of the data.",
        "Accuracy is (number correct)/\\(n\\), then convert to a percent. Include the % unit."
      ],
      sol: "<div class=\"q-sol\">Majority baseline: \\(" + Math.max(nA, nB) + "/" + n + "=" + fmt(maj, 2) + "\\,\\%\\). Model: \\(" + correct + "/" + n + "=" + fmt(acc, 2) + "\\,\\%\\).</div>"
    };
  };

  GENS["a:q2.1"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var w = pick(rng, [0.5, 1, 1.5, 2]);
    var b = pick(rng, [-0.5, 0, 0.5, 1]);
    var mse = mseAt(pts, w, b);
    return {
      ok: true, givens: { pts: pts, w: w, b: b },
      text: "Data: \\((x,y)=" + ptsTex(pts) + "\\). For the line \\(\\hat y=" + (w === 1 ? "x" : fmt(w, 2) + "x") + (b >= 0 ? "+" : "") + fmt(b, 2) + "\\) (that is, \\(w=" + fmt(w, 2) + "\\), \\(b=" + fmt(b, 2) + "\\)), compute \\(\\mathrm{MSE}=(1/n)\\sum(y_i-\\hat y_i)^2\\).",
      ans: [{ q: "MSE", v: mse, u: "1", tp: 1 }],
      hints: [
        "There are \\(n=" + pts.length + "\\) points. First write each \\(\\hat y_i\\), then each residual, then the average of the squared residuals.",
        "\\(\\hat y_i = " + fmt(w, 2) + " x_i + (" + fmt(b, 2) + ")\\)."
      ],
      sol: "<div class=\"q-sol\">Residuals from \\(\\hat y=" + fmt(w, 2) + "x+" + fmt(b, 2) + "\\) average in square to \\(\\mathrm{MSE}=" + fmt(mse, 4) + "\\).</div>"
    };
  };

  GENS["a:q2.2"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var o = ols(pts); if (!o) return { ok: false };
    return {
      ok: true, givens: { pts: pts },
      text: "For the four points \\((x,y)=" + ptsTex(pts) + "\\), find the ordinary-least-squares slope \\(w\\), intercept \\(b\\), and the MSE of that fit.",
      ans: [{ q: "w", v: o.w, u: "1", tp: 1 }, { q: "b", v: o.b, u: "1", tp: 1 }, { q: "MSE", v: o.mse, u: "1", tp: 1 }],
      hints: [
        "First compute the means \\(\\bar x\\) and \\(\\bar y\\). Then \\(\\hat w=\\sum(x-\\bar x)(y-\\bar y)/\\sum(x-\\bar x)^2\\).",
        "\\(\\bar x=" + fmt(o.xb, 2) + "\\) and \\(\\bar y=" + fmt(o.yb, 2) + "\\)."
      ],
      sol: "<div class=\"q-sol\">\\(\\bar x=" + fmt(o.xb, 3) + "\\), \\(\\bar y=" + fmt(o.yb, 3) + "\\). Then \\(\\hat w=" + fmt(o.w, 4) + "\\), \\(\\hat b=\\bar y-\\hat w\\bar x=" + fmt(o.b, 4) + "\\), and \\(\\mathrm{MSE}=" + fmt(o.mse, 4) + "\\).</div>"
    };
  };

  GENS["a:q2.3"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var sxy = 0, sxx = 0, i;
    for (i = 0; i < pts.length; i++) { sxy += pts[i][0] * pts[i][1]; sxx += pts[i][0] * pts[i][0]; }
    if (sxx < 1e-12) return { ok: false };
    var w = sxy / sxx;
    var mse = mseAt(pts, w, 0);
    return {
      ok: true, givens: { pts: pts },
      text: "For the four points \\((x,y)=" + ptsTex(pts) + "\\), fit the no-intercept model \\(\\hat y=wx\\) (the line is forced through the origin). Find \\(w\\) and the MSE.",
      ans: [{ q: "w", v: w, u: "1", tp: 1 }, { q: "MSE", v: mse, u: "1", tp: 1 }],
      hints: [
        "The critical point is \\(\\hat w=(\\sum x_i y_i)/(\\sum x_i^2)\\).",
        "Compute \\(\\sum xy\\) and \\(\\sum x^2\\) from the four points given above."
      ],
      sol: "<div class=\"q-sol\">\\(\\hat w=(\\sum xy)/(\\sum x^2)=" + fmt(sxy, 2) + "/" + fmt(sxx, 2) + "=" + fmt(w, 4) + "\\), with \\(\\mathrm{MSE}=" + fmt(mse, 5) + "\\).</div>"
    };
  };

  GENS["a:q2.4"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var w = pick(rng, [0, 0.5, 1, 1.5]);
    var b = pick(rng, [0, 0.5, 1, 1.5]);
    var g = gradMSE(pts, w, b);
    return {
      ok: true, givens: { pts: pts, w: w, b: b },
      text: "Using \\(\\mathrm{MSE}=(1/n)\\sum(y_i-w x_i-b)^2\\) on the four points \\((x,y)=" + ptsTex(pts) + "\\), compute \\(\\partial\\mathrm{MSE}/\\partial w\\) and \\(\\partial\\mathrm{MSE}/\\partial b\\) at \\((w,b)=(" + fmt(w, 2) + "," + fmt(b, 2) + ")\\).",
      ans: [{ q: "∂MSE/∂w", v: g.dw, u: "1", ta: 0.005 }, { q: "∂MSE/∂b", v: g.db, u: "1", ta: 0.005 }],
      hints: [
        "Residuals are \\(e=y-(wx+b)\\). Then \\(\\partial\\mathrm{MSE}/\\partial w=-(2/n)\\sum x_i e_i\\).",
        "If you dropped the 2, or used \\(1/(2n)\\) as the loss, your partials will be half as large."
      ],
      sol: "<div class=\"q-sol\">At \\((w,b)=(" + fmt(w, 2) + "," + fmt(b, 2) + ")\\), \\(\\partial\\mathrm{MSE}/\\partial w=" + fmt(g.dw, 4) + "\\) and \\(\\partial\\mathrm{MSE}/\\partial b=" + fmt(g.db, 4) + "\\).</div>"
    };
  };

  GENS["a:q3.1"] = function (rng) {
    var a = pick(rng, [2, 3, 4, 5, 6]);
    var w0 = pick(rng, [0, 1, -1, 2, 8]);
    var eta = pick(rng, [0.1, 0.2, 0.25, 0.3]);
    if (w0 === a) return { ok: false };
    var w1 = w0 - eta * 2 * (w0 - a);
    var w2 = w1 - eta * 2 * (w1 - a);
    return {
      ok: true, givens: { a: a, w0: w0, eta: eta },
      text: "Let \\(J(w)=(w-" + a + ")^2\\). Start at \\(w=" + fmt(w0, 2) + "\\) and take gradient-descent steps with \\(\\eta=" + eta + "\\). Report \\(w\\) after one step and after two steps.",
      ans: [{ q: "w after 1 step", v: w1, u: "1", tp: 1 }, { q: "w after 2 steps", v: w2, u: "1", tp: 1 }],
      hints: [
        "\\(J'(w)=2(w-" + a + ")\\). The update is \\(w\\leftarrow w-\\eta J'(w)\\).",
        "After the first step you should be at " + fmt(w1, 3) + ". Now compute \\(J'(" + fmt(w1, 3) + ")\\) and step again."
      ],
      sol: "<div class=\"q-sol\">\\(J'(w)=2(w-" + a + ")\\). Then \\(w_1=" + fmt(w0, 2) + "-" + eta + "\\times 2(" + fmt(w0, 2) + "-" + a + ")=" + fmt(w1, 3) + "\\) and \\(w_2=" + fmt(w2, 3) + "\\).</div>"
    };
  };

  GENS["a:q3.2"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var eta = pick(rng, [0.01, 0.02, 0.05]);
    var g = gradMSE(pts, 0, 0);
    var w = 0 - eta * g.dw, b = 0 - eta * g.db;
    return {
      ok: true, givens: { pts: pts, w0: 0, b0: 0, eta: eta },
      text: "On the four-point data \\((x,y)=" + ptsTex(pts) + "\\), start at \\((w,b)=(0,0)\\) and take one gradient-descent step on MSE with \\(\\eta=" + eta + "\\). Report \\(\\partial\\mathrm{MSE}/\\partial w\\), \\(\\partial\\mathrm{MSE}/\\partial b\\) at the start, then the updated \\(w\\) and \\(b\\).",
      ans: [{ q: "∂MSE/∂w", v: g.dw, u: "1", tp: 1 }, { q: "∂MSE/∂b", v: g.db, u: "1", tp: 1 }, { q: "w", v: w, u: "1", tp: 1 }, { q: "b", v: b, u: "1", tp: 1 }],
      hints: [
        "At \\((0,0)\\) every residual is just \\(y_i\\). Use \\(\\partial\\mathrm{MSE}/\\partial w=-(2/n)\\sum x_i y_i\\).",
        "Then \\(w\\leftarrow w-\\eta\\partial J/\\partial w\\) and likewise for \\(b\\)."
      ],
      sol: "<div class=\"q-sol\">At the origin the gradient is \\((" + fmt(g.dw, 4) + ",\\," + fmt(g.db, 4) + ")\\). One step of size \\(\\eta=" + eta + "\\) gives \\(w=" + fmt(w, 4) + "\\), \\(b=" + fmt(b, 4) + "\\).</div>"
    };
  };

  GENS["a:q3.3"] = function (rng) {
    var a = pick(rng, [2, 3, 4, 5]);
    var w0 = pick(rng, [0, 1, 5, 6, 8, -1]);
    if (w0 === a) return { ok: false };
    var etac = 1;
    var w1 = 2 * a - w0; // eta=1: w <- 2a - w
    var w2 = 2 * a - w1; // back to w0
    return {
      ok: true, givens: { a: a, w0: w0 },
      text: "Still for \\(J(w)=(w-" + a + ")^2\\) and the update \\(w\\leftarrow w-\\eta J'(w)\\): (a) find the critical learning rate \\(\\eta_c\\) such that the iteration diverges for every \\(\\eta>\\eta_c\\); (b) start at \\(w=" + fmt(w0, 2) + "\\) with \\(\\eta=1\\) and report \\(w\\) after one step and after two steps.",
      ans: [{ q: "η_c", v: etac, u: "1", ta: 0.005 }, { q: "w after 1 step", v: w1, u: "1", ta: 0.005 }, { q: "w after 2 steps", v: w2, u: "1", ta: 0.005 }],
      hints: [
        "Rewrite the update as \\(w\\leftarrow(1-2\\eta)w+" + (2 * a) + "\\eta\\). This converges iff \\(|1-2\\eta|<1\\).",
        "At \\(\\eta=1\\) the map is \\(w\\leftarrow " + (2 * a) + "-w\\). What does that do to " + fmt(w0, 2) + "?"
      ],
      sol: "<div class=\"q-sol\">Convergence requires \\(|1-2\\eta|<1\\), so \\(\\eta_c=1\\). At \\(\\eta=1\\), \\(w\\leftarrow " + (2 * a) + "-w\\), hence \\(w_1=" + fmt(w1, 2) + "\\) and \\(w_2=" + fmt(w2, 2) + "\\).</div>"
    };
  };

  GENS["a:q3.4"] = function (rng) {
    var pts = randPts(rng); if (!pts) return { ok: false };
    var w = pick(rng, [0.5, 1, 1.5]);
    var b = pick(rng, [0, 0.5, 1]);
    var eta = pick(rng, [0.1, 0.2, 0.25]);
    var g = gradMSE(pts, w, b);
    var w2 = w - eta * g.dw, b2 = b - eta * g.db;
    var mse = mseAt(pts, w2, b2);
    return {
      ok: true, givens: { pts: pts, w: w, b: b, eta: eta },
      text: "On the four-point data \\((x,y)=" + ptsTex(pts) + "\\), start at \\((w,b)=(" + fmt(w, 2) + "," + fmt(b, 2) + ")\\) and take one MSE gradient step with \\(\\eta=" + eta + "\\). Report the new \\(w\\), the new \\(b\\), and the MSE at the new point.",
      ans: [{ q: "w", v: w2, u: "1", tp: 1 }, { q: "b", v: b2, u: "1", ta: 0.005 }, { q: "MSE", v: mse, u: "1", tp: 1 }],
      hints: [
        "The gradient at the start is \\((" + fmt(g.dw, 4) + ",\\," + fmt(g.db, 4) + ")\\). Apply \\(w\\leftarrow w-\\eta\\partial J/\\partial w\\).",
        "Then recompute all four residuals at the new parameters and average their squares. Don't assume the loss went down."
      ],
      sol: "<div class=\"q-sol\">One step gives \\(w=" + fmt(w2, 4) + "\\), \\(b=" + fmt(b2, 4) + "\\), with \\(\\mathrm{MSE}=" + fmt(mse, 4) + "\\) at the new point.</div>"
    };
  };

  GENS["a:q4.1"] = function (rng) {
    var w = [pick(rng, [-2, -1, 1, 2]), pick(rng, [-2, -1, 1, 2])];
    var x = [pick(rng, [-1, 0, 1, 2]), pick(rng, [-1, 0, 1, 2])];
    var b = pick(rng, [-1, -0.5, 0, 0.5, 1]);
    var z = w[0] * x[0] + w[1] * x[1] + b;
    if (Math.abs(z) > 6) return { ok: false };
    var sig = 1 / (1 + Math.exp(-z));
    return {
      ok: true, givens: { w: w, x: x, b: b },
      text: "A neuron has weights \\(w=" + vecTex(w, 1) + "\\), bias \\(b=" + fmt(b, 2) + "\\), and input \\(x=" + vecTex(x, 1) + "\\). Compute the pre-activation \\(z=w\\cdot x+b\\) and the sigmoid output \\(\\sigma(z)=1/(1+e^{-z})\\).",
      ans: [{ q: "z", v: z, u: "1", ta: 0.005 }, { q: "σ(z)", v: sig, u: "1", tp: 1 }],
      hints: [
        "\\(z=" + fmt(w[0], 1) + "\\cdot" + fmt(x[0], 1) + "+(" + fmt(w[1], 1) + ")\\cdot" + fmt(x[1], 1) + "+" + fmt(b, 2) + "\\). Watch the sign.",
        "\\(\\sigma(z)=1/(1+e^{-z})\\)."
      ],
      sol: "<div class=\"q-sol\">\\(z=" + fmt(z, 4) + "\\) and \\(\\sigma(z)=1/(1+e^{" + fmt(-z, 4) + "})=" + fmt(sig, 5) + "\\).</div>"
    };
  };

  GENS["a:q4.2"] = function (rng) {
    var s = [randInt(rng, 0, 3), randInt(rng, -1, 2), randInt(rng, -2, 1)];
    var v = [pick(rng, [1, 2, 3]), pick(rng, [2, 3, 4, 5]), pick(rng, [4, 5, 6, 7])];
    var al = softmax(s);
    var out = al[0] * v[0] + al[1] * v[1] + al[2] * v[2];
    return {
      ok: true, givens: { s: s, v: v },
      text: "Scores \\(s=" + vecTex(s, 1) + "\\) and values \\(v=" + vecTex(v, 1) + "\\). Compute the three softmax weights \\(\\alpha_i\\) and the attention output \\(\\sum\\alpha_i v_i\\).",
      ans: [
        { q: "α₁", v: al[0], u: "1", tp: 1 },
        { q: "α₂", v: al[1], u: "1", tp: 1 },
        { q: "α₃", v: al[2], u: "1", tp: 1 },
        { q: "output", v: out, u: "1", tp: 1 }
      ],
      hints: [
        "\\(\\alpha_i=e^{s_i}/\\sum_j e^{s_j}\\).",
        "The output is a convex combination of the values, so it must lie between the min and max of \\(v\\)."
      ],
      sol: "<div class=\"q-sol\">Softmax weights \\((" + fmt(al[0], 5) + ",\\," + fmt(al[1], 5) + ",\\," + fmt(al[2], 5) + ")\\) and output \\(" + fmt(out, 4) + "\\).</div>"
    };
  };

  GENS["a:q4.3"] = function (rng) {
    var d = 2;
    var qv = [pick(rng, [0, 1]), pick(rng, [0, 1])];
    if (qv[0] === 0 && qv[1] === 0) qv[0] = 1;
    var keys = [
      [pick(rng, [0, 1]), pick(rng, [0, 1])],
      [pick(rng, [0, 1]), pick(rng, [0, 1])],
      [pick(rng, [0, 1]), pick(rng, [0, 1])]
    ];
    var v = [pick(rng, [1, 2, 3]), pick(rng, [1, 2, 4]), pick(rng, [2, 3, 4, 5])];
    var sc = keys.map(function (k) { return (qv[0] * k[0] + qv[1] * k[1]) / Math.sqrt(d); });
    var al = softmax(sc);
    var out = al[0] * v[0] + al[1] * v[1] + al[2] * v[2];
    function ktex(k) { return vecTex(k, 0); }
    return {
      ok: true, givens: { q: qv, keys: keys, v: v, d: d },
      text: "Scaled dot-product attention in \\(d=" + d + "\\). Query \\(q=" + vecTex(qv, 0) + "\\). Keys \\(k_1=" + ktex(keys[0]) + "\\), \\(k_2=" + ktex(keys[1]) + "\\), \\(k_3=" + ktex(keys[2]) + "\\). Values \\(v=" + vecTex(v, 0) + "\\). Compute the three scores \\(s_i=(q\\cdot k_i)/\\sqrt{d}\\), the three softmax weights, and the attention output.",
      ans: [
        { q: "s₁", v: sc[0], u: "1", tp: 1 },
        { q: "s₂", v: sc[1], u: "1", ta: 0.005 },
        { q: "s₃", v: sc[2], u: "1", tp: 1 },
        { q: "α₁", v: al[0], u: "1", tp: 1 },
        { q: "α₂", v: al[1], u: "1", tp: 1 },
        { q: "α₃", v: al[2], u: "1", tp: 1 },
        { q: "output", v: out, u: "1", tp: 1 }
      ],
      hints: [
        "\\(\\sqrt{d}=\\sqrt{2}\\approx 1.41421\\). Compute the unscaled dots first, then divide.",
        "Softmax the three scores, then form the weighted sum of the values."
      ],
      sol: "<div class=\"q-sol\">Scores \\((" + fmt(sc[0], 5) + ",\\," + fmt(sc[1], 5) + ",\\," + fmt(sc[2], 5) + ")\\), weights \\((" + fmt(al[0], 5) + ",\\," + fmt(al[1], 5) + ",\\," + fmt(al[2], 5) + ")\\), output \\(" + fmt(out, 4) + "\\).</div>"
    };
  };


  /* ---- ECON 101 Unit 1 ---- */
  GENS['e:q1.1'] = function (rng) {
    var W = pick(rng, [40, 48, 56, 64, 72, 80, 96, 120, 150]);
    var T = pick(rng, [12, 15, 18, 20, 25, 30, 35, 40, 45, 50]);
    var D = pick(rng, [8, 10, 12, 15, 18, 20]);
    var oc = W + T;
    var name = pick(rng, ['Maya', 'Luis', 'Priya', 'Owen']);
    return {
      ok: true,
      givens: {W: W, T: T, D: D},
      text: name + ' can work an evening shift and earn \\($' + W + '\\), or go to a concert with a \\($' + T + '\\) ticket. ' + name + ' would have spent \\($' + D + '\\) on dinner either way. What is the opportunity cost, in dollars, of going to the concert?',
      ans: [{q: 'opportunity cost', v: oc, u: '$', tp: 1}],
      hints: [
        'Opportunity cost includes the ticket and the wages given up.',
        'Dinner is paid either way, so it is not part of the cost of choosing the concert.'
      ],
      sol: '<div class="q-sol">Explicit cost = \\($' + T + '\\). Implicit cost = \\($' + W + '\\) of foregone wages. Dinner (\\($' + D + '\\)) is not incremental. Opportunity cost = ' + T + ' + ' + W + ' = \\($' + oc + '\\).</div>'
    };
  };

  GENS['e:q1.2'] = function (rng) {
    var A = pick(rng, [30000, 36000, 40000, 45000, 48000, 50000, 60000]);
    var C = pick(rng, [20000, 25000, 30000, 35000, 40000]);
    var acc = pick(rng, [20000, 25000, 30000, 40000, 50000, 60000, 70000]);
    var R = acc + C;
    var econ = acc - A;
    var name = pick(rng, ['Jordan', 'Sam', 'Riley', 'Chen']);
    return {
      ok: true,
      givens: {A: A, R: R, C: C},
      text: name + ' currently earns \\($' + A.toLocaleString('en-US') + '\\) in a job. Opening a workshop would bring in \\($' + R.toLocaleString('en-US') + '\\) of revenue and \\($' + C.toLocaleString('en-US') + '\\) of explicit costs, and ' + name + ' would leave the job. What is the accounting profit, and what is the economic profit, in dollars?',
      ans: [
        {q: 'accounting profit', v: acc, u: '$', tp: 1},
        {q: 'economic profit', v: econ, u: '$', tp: 1}
      ],
      hints: [
        'Accounting profit subtracts only explicit costs from revenue.',
        'Economic profit also subtracts the implicit cost of the job that would be left.'
      ],
      sol: '<div class="q-sol">Accounting profit = ' + R + ' − ' + C + ' = \\($' + acc + '\\). Implicit cost = \\($' + A + '\\). Economic profit = ' + acc + ' − ' + A + ' = \\($' + econ + '\\).</div>'
    };
  };

  GENS['e:q1.3'] = function (rng) {
    var k = pick(rng, [2, 3, 4, 5, 6]);
    var xmax = pick(rng, [4, 5, 6, 8, 10, 12]);
    var ymax = k * xmax;
    var pair = pick(rng, [
      ['tables', 'chairs'], ['bikes', 'scooters'], ['coats', 'hats'], ['loaves', 'cakes']
    ]);
    return {
      ok: true,
      givens: {xmax: xmax, ymax: ymax, k: k},
      text: 'A workshop can use all of a day\u2019s resources to make ' + xmax + ' ' + pair[0] + ' or ' + ymax + ' ' + pair[1] + ' (or any linear mix of the two). What is the opportunity cost of making one more ' + pair[0].replace(/s$/, '') + '?',
      ans: [{q: 'OC of one ' + pair[0].replace(/s$/, ''), v: k, u: 'units', tp: 1}],
      hints: [
        'The opportunity cost of one ' + pair[0].replace(/s$/, '') + ' is how many ' + pair[1] + ' you give up.',
        'That ratio is constant on a linear trade-off: ' + ymax + '/' + xmax + '.'
      ],
      sol: '<div class="q-sol">All resources \u2192 ' + xmax + ' ' + pair[0] + ' or ' + ymax + ' ' + pair[1] + '. Opportunity cost of 1 ' + pair[0].replace(/s$/, '') + ' = ' + ymax + '/' + xmax + ' = ' + k + ' ' + pair[1] + ' (enter ' + k + ' units).</div>'
    };
  };

  GENS['e:q1.4'] = function (rng) {
    var T = pick(rng, [8000, 10000, 12000, 15000, 18000, 20000]);
    var B = pick(rng, [400, 600, 800, 1000, 1200]);
    var W = pick(rng, [12000, 15000, 18000, 20000, 24000, 30000]);
    var rent = pick(rng, [6000, 7200, 8000, 9000, 10000, 12000]);
    var extra = pick(rng, [0, 0, 0, 500, 1000, 1500, 2000]);
    var D = rent + extra;
    var oc = T + B + W + extra;
    return {
      ok: true,
      givens: {T: T, B: B, W: W, D: D, rent: rent, extra: extra},
      text: 'A year of college costs \\($' + T.toLocaleString('en-US') + '\\) in tuition and \\($' + B.toLocaleString('en-US') + '\\) in books. The dorm is \\($' + D.toLocaleString('en-US') + '\\); the student would have paid \\($' + rent.toLocaleString('en-US') + '\\) in rent either way. If the student does not attend, the alternative is a job paying \\($' + W.toLocaleString('en-US') + '\\). What is the opportunity cost, in dollars, of attending college this year?',
      ans: [{q: 'opportunity cost', v: oc, u: '$', tp: 1}],
      hints: [
        'Add tuition, books, and foregone wages.',
        'Count only the extra housing cost above the rent that would be paid anyway.'
      ],
      sol: '<div class="q-sol">Incremental costs = tuition \\($' + T + '\\) + books \\($' + B + '\\) + foregone wages \\($' + W + '\\) + extra housing \\($' + extra + '\\) = \\($' + oc + '\\).</div>'
    };
  };

  GENS['e:q2.1'] = function (rng) {
    var xmax = pick(rng, [6, 8, 10, 12, 15, 16, 20]);
    var k = pick(rng, [2, 3, 4, 5]);
    var ymax = k * xmax;
    var xs = [];
    var i;
    for (i = 1; i < xmax; i++) if ((ymax * i) % xmax === 0) xs.push(i);
    if (!xs.length) return {ok: false};
    var x = pick(rng, xs);
    var y = ymax - k * x;
    var pair = pick(rng, [['wheat', 'cloth'], ['cars', 'trucks'], ['corn', 'soy'], ['computers', 'phones']]);
    return {
      ok: y > 0,
      givens: {xmax: xmax, ymax: ymax, x: x, k: k},
      text: 'A linear PPF runs from ' + xmax + ' units of ' + pair[0] + ' (and no ' + pair[1] + ') to ' + ymax + ' units of ' + pair[1] + ' (and no ' + pair[0] + '). If the economy produces ' + x + ' units of ' + pair[0] + ' and is on the frontier, how many units of ' + pair[1] + ' does it produce?',
      ans: [{q: pair[1], v: y, u: 'units', tp: 1}],
      hints: [
        'On a linear PPF, ' + pair[1] + ' = ' + ymax + ' − (' + ymax + '/' + xmax + ') × ' + pair[0] + '.',
        'Each unit of ' + pair[0] + ' costs ' + k + ' units of ' + pair[1] + '.'
      ],
      sol: '<div class="q-sol">' + pair[1] + ' = ' + ymax + ' − ' + k + ' × ' + x + ' = ' + y + ' units.</div>'
    };
  };

  GENS['e:q2.2'] = function (rng) {
    var k = pick(rng, [2, 3, 4, 5, 6]);
    var xmax = pick(rng, [4, 5, 6, 8, 10, 12]);
    var ymax = k * xmax;
    var pair = pick(rng, [['computers', 'phones'], ['tables', 'chairs'], ['trucks', 'cars'], ['ships', 'planes']]);
    return {
      ok: true,
      givens: {xmax: xmax, ymax: ymax, k: k},
      text: 'A linear PPF runs from ' + xmax + ' ' + pair[0] + ' (and no ' + pair[1] + ') to ' + ymax + ' ' + pair[1] + ' (and no ' + pair[0] + '). What is the opportunity cost of producing one more ' + pair[0].replace(/s$/, '') + '?',
      ans: [{q: 'OC of one ' + pair[0].replace(/s$/, ''), v: k, u: 'units', tp: 1}],
      hints: [
        'The constant slope is ' + pair[1] + ' given up per ' + pair[0].replace(/s$/, '') + '.',
        'That ratio is ' + ymax + '/' + xmax + '.'
      ],
      sol: '<div class="q-sol">Opportunity cost of 1 ' + pair[0].replace(/s$/, '') + ' = ' + ymax + '/' + xmax + ' = ' + k + ' ' + pair[1] + ' (enter ' + k + ' units).</div>'
    };
  };

  GENS['e:q2.3'] = function (rng) {
    var y0 = pick(rng, [18, 20, 22, 24, 25, 30]);
    var drops = [];
    var d = pick(rng, [1, 1, 2]);
    var nPts = pick(rng, [6, 7, 8]);
    var i, y = y0, ys = [y0];
    for (i = 1; i < nPts; i++) {
      d += pick(rng, [1, 1, 2]);
      drops.push(d);
      y -= d;
      if (y < 0) return {ok: false};
      ys.push(y);
    }
    if (ys[ys.length - 1] !== 0 && rng() < 0.5) {
      /* leave a leftover; still fine */
    }
    var n = 1 + randInt(rng, 1, drops.length - 1);
    var oc = drops[n - 1];
    var rows = ys.map(function (v, j) { return '(' + j + ', ' + v + ')'; }).join(', ');
    return {
      ok: oc > 0 && n >= 2,
      givens: {ys: ys, n: n, oc: oc},
      text: 'A bowed-out PPF for robots (\\(X\\)) and pizzas (\\(Y\\)) has the efficient points (robots, pizzas) = ' + rows + '. What is the opportunity cost of the ' + n + nth(n) + ' robot (moving from ' + (n - 1) + ' robots to ' + n + ')?',
      ans: [{q: 'OC of the ' + n + nth(n) + ' robot', v: oc, u: 'units', tp: 1}],
      hints: [
        'The opportunity cost of the ' + n + nth(n) + ' robot is the pizzas you lose between ' + (n - 1) + ' and ' + n + ' robots.',
        'Read the two pizza totals in the table and subtract.'
      ],
      sol: '<div class="q-sol">At ' + (n - 1) + ' robots, pizzas = ' + ys[n - 1] + '. At ' + n + ' robots, pizzas = ' + ys[n] + '. Opportunity cost = ' + ys[n - 1] + ' − ' + ys[n] + ' = ' + oc + ' pizzas (enter ' + oc + ' units).</div>'
    };
  };

  GENS['e:q2.4'] = function (rng) {
    var xmax = pick(rng, [6, 8, 10, 12, 16, 20]);
    var k = pick(rng, [2, 3, 4]);
    var ymax = k * xmax;
    var xs = [];
    var i;
    for (i = 1; i < xmax; i++) if ((k * i) === Math.round(k * i)) xs.push(i);
    var x = pick(rng, xs);
    var yFront = ymax - k * x;
    if (yFront < 3) return {ok: false};
    var slack = pick(rng, [2, 3, 4, 5, 6, 8].filter(function (s) { return s < yFront; }));
    if (!slack) return {ok: false};
    var y = yFront - slack;
    var pair = pick(rng, [['wheat', 'cloth'], ['corn', 'beans'], ['cars', 'bikes']]);
    return {
      ok: true,
      givens: {xmax: xmax, ymax: ymax, x: x, y: y, k: k, slack: slack},
      text: 'A linear PPF runs from ' + xmax + ' ' + pair[0] + ' to ' + ymax + ' ' + pair[1] + '. The economy is at (' + x + ' ' + pair[0] + ', ' + y + ' ' + pair[1] + '). Holding ' + pair[0] + ' at ' + x + ', how many more units of ' + pair[1] + ' can it produce if it reaches the frontier?',
      ans: [{q: 'additional ' + pair[1], v: slack, u: 'units', tp: 1}],
      hints: [
        'First find the maximum ' + pair[1] + ' at ' + x + ' ' + pair[0] + ' on the frontier.',
        'Subtract the ' + pair[1] + ' already being made.'
      ],
      sol: '<div class="q-sol">On the frontier at ' + x + ' ' + pair[0] + ', ' + pair[1] + ' = ' + ymax + ' − ' + k + ' × ' + x + ' = ' + yFront + '. They make ' + y + ', so they can add ' + slack + ' units without cutting ' + pair[0] + '. The starting point is inside the PPF.</div>'
    };
  };

  GENS['e:q3.1'] = function (rng) {
    var low = pick(rng, [12, 16, 18, 20, 24, 30, 36]);
    var gap = pick(rng, [6, 8, 10, 12, 16, 18, 20, 24]);
    var high = low + gap;
    var goods = pick(rng, ['computers', 'bicycles', 'coats', 'phones']);
    var names = rng() < 0.5 ? ['Ava', 'Ben'] : ['Costa', 'Delia'];
    return {
      ok: true,
      givens: {high: high, low: low, gap: gap},
      text: 'In a week, ' + names[0] + ' can assemble ' + high + ' ' + goods + ' and ' + names[1] + ' can assemble ' + low + ' ' + goods + ', each working the same number of hours. How many more ' + goods + ' per week does ' + names[0] + ' produce than ' + names[1] + '?',
      ans: [{q: names[0] + "'s extra " + goods, v: gap, u: 'units', tp: 1}],
      hints: [
        'Absolute advantage is about who produces more with the same resources.',
        'Subtract ' + names[1] + "'s weekly output from " + names[0] + "'s."
      ],
      sol: '<div class="q-sol">' + names[0] + ' produces ' + high + ' − ' + low + ' = ' + gap + ' more ' + goods + ' per week than ' + names[1] + '.</div>'
    };
  };

  GENS['e:q3.2'] = function (rng) {
    var aX = pick(rng, [1, 2, 3, 4]);
    var ocA = pick(rng, [1, 2, 3, 4, 5]);
    var aY = aX * ocA;
    var ocB;
    var guard = 0;
    do { ocB = pick(rng, [1, 2, 3, 4, 5, 6]); guard++; } while (ocB === ocA && guard < 10);
    if (ocB === ocA) return {ok: false};
    var bX = pick(rng, [1, 2, 3]);
    var bY = bX * ocB;
    return {
      ok: true,
      givens: {aX: aX, aY: aY, bX: bX, bY: bY, ocA: ocA, ocB: ocB},
      text: 'Ava can bake ' + aX + ' loaf' + (aX === 1 ? '' : 'ves') + ' of bread per hour or weave ' + aY + ' bolts of cloth per hour. Ben can bake ' + bX + ' loaf' + (bX === 1 ? '' : 'ves') + ' per hour or weave ' + bY + ' bolts per hour. What is each person\u2019s opportunity cost of one loaf of bread, in bolts of cloth?',
      ans: [
        {q: "Ava's OC of one loaf", v: ocA, u: 'units', tp: 1},
        {q: "Ben's OC of one loaf", v: ocB, u: 'units', tp: 1}
      ],
      hints: [
        'Ava\u2019s opportunity cost of 1 loaf is cloth per hour divided by loaves per hour.',
        'Do the same ratio for Ben. The lower opportunity cost identifies comparative advantage in bread.'
      ],
      sol: '<div class="q-sol">Ava: ' + aY + '/' + aX + ' = ' + ocA + ' bolts per loaf. Ben: ' + bY + '/' + bX + ' = ' + ocB + ' bolts per loaf.</div>'
    };
  };

  GENS['e:q3.3'] = function (rng) {
    var lo = pick(rng, [1, 2, 3, 4]);
    var hi = lo + pick(rng, [1, 2, 3, 4, 5]);
    return {
      ok: true,
      givens: {lo: lo, hi: hi},
      text: 'Ava\u2019s opportunity cost of one loaf of bread is ' + lo + ' bolts of cloth, and Ben\u2019s is ' + hi + ' bolts of cloth. Mutually beneficial trade occurs when one loaf trades for more than how many bolts of cloth, and fewer than how many bolts of cloth?',
      ans: [
        {q: 'more than', v: lo, u: 'units', tp: 1},
        {q: 'fewer than', v: hi, u: 'units', tp: 1}
      ],
      hints: [
        'The terms of trade must beat each trader\u2019s opportunity cost.',
        'Ava will export bread only if she gets more cloth per loaf than she can make herself.'
      ],
      sol: '<div class="q-sol">A mutually beneficial price satisfies ' + lo + ' < cloth per loaf < ' + hi + '. Enter ' + lo + ' and ' + hi + '.</div>'
    };
  };

  GENS['e:q3.4'] = function (rng) {
    var Ha = pick(rng, [6, 8, 10, 12]);
    var Hb = pick(rng, [6, 8, 10, 12]);
    var aX = pick(rng, [2, 3, 4]);
    var aY = pick(rng, [1, 2]);
    if (aY / aX >= 1) return {ok: false};
    var bX = 1;
    var bY = pick(rng, [2, 3, 4]);
    var ocA = aY / aX, ocB = bY / bX;
    if (!(ocA < ocB)) return {ok: false};
    if (Ha % 2 || Hb % 2) return {ok: false};
    var autoAX = (Ha / 2) * aX, autoAY = (Ha / 2) * aY;
    var specAX = Ha * aX;
    var pChoices = [];
    var p;
    for (p = ocA + 0.5; p < ocB - 1e-9; p += 0.5) {
      if (Math.abs(p * 2 - Math.round(p * 2)) < 1e-9) pChoices.push(p);
    }
    if (!pChoices.length) return {ok: false};
    var price = pick(rng, pChoices);
    var tmax = specAX - 1;
    var T, gX, gY, found = false, tries = 0;
    while (tries++ < 30) {
      T = randInt(rng, 2, Math.max(2, Math.min(24, tmax - 1)));
      if (T * price !== Math.round(T * price)) continue;
      gX = (specAX - T) - autoAX;
      gY = (T * price) - autoAY;
      if (gX > 0 && gY > 0 && gX === Math.round(gX) && gY === Math.round(gY)) { found = true; break; }
    }
    if (!found) return {ok: false};
    return {
      ok: true,
      givens: {Ha: Ha, Hb: Hb, aX: aX, aY: aY, bX: bX, bY: bY, T: T, price: price, gX: gX, gY: gY},
      text: 'Ava has ' + Ha + ' hours and can make ' + aX + ' loaves of bread per hour or ' + aY + ' bolts of cloth per hour. Ben has ' + Hb + ' hours and can make ' + bX + ' loaf' + (bX === 1 ? '' : 'ves') + ' per hour or ' + bY + ' bolts of cloth per hour. In autarky each spends half of their hours on each good. Then they specialize according to comparative advantage and trade ' + T + ' loaves for ' + fmt(T * price) + ' bolts of cloth. How many more loaves and how many more bolts of cloth does Ava consume than in autarky?',
      ans: [
        {q: "Ava's extra loaves", v: gX, u: 'units', tp: 1},
        {q: "Ava's extra cloth", v: gY, u: 'units', tp: 1}
      ],
      hints: [
        'Ava\u2019s opportunity cost of bread is ' + fmt(ocA) + ' cloth; Ben\u2019s is ' + fmt(ocB) + '. Ava specializes in bread, Ben in cloth.',
        'Compare Ava\u2019s consumption after the trade with her autarky basket.'
      ],
      sol: '<div class="q-sol">Ava specializes: ' + specAX + ' loaves. After trading away ' + T + ' loaves for ' + fmt(T * price) + ' cloth she consumes ' + (specAX - T) + ' loaves and ' + fmt(T * price) + ' cloth. Autarky: ' + autoAX + ' loaves and ' + autoAY + ' cloth. Gains: ' + gX + ' loaves and ' + gY + ' cloth.</div>'
    };
  };

  GENS['e:q4.1'] = function (rng) {
    var B = pick(rng, [1, 2, 3, 4, 5]);
    var D = pick(rng, [1, 2, 3, 4, 5]);
    var P = pick(rng, [8, 10, 12, 15, 16, 18, 20, 24, 25]);
    var C = pick(rng, [0, 5, 10, 16, 20, 24]);
    var Q = C + D * P;
    var A = Q + B * P;
    if (A <= C || Q <= 0) return {ok: false};
    return {
      ok: true,
      givens: {A: A, B: B, C: C, D: D, P: P, Q: Q},
      text: 'Demand is \\(Q_d = ' + A + ' - ' + B + 'P\\) and supply is \\(Q_s = ' + C + ' + ' + D + 'P\\), with \\(P\\) in dollars per unit. Find the equilibrium price, in dollars per unit, and the equilibrium quantity.',
      ans: [
        {q: 'P*', v: P, u: '$/unit', tp: 1},
        {q: 'Q*', v: Q, u: 'units', tp: 1}
      ],
      hints: [
        'Set quantity demanded equal to quantity supplied and solve for \\(P\\).',
        'Then plug \\(P^*\\) back into either equation to get \\(Q^*\\).'
      ],
      sol: '<div class="q-sol">' + A + ' − ' + B + 'P = ' + C + ' + ' + D + 'P \\(\\Rightarrow\\) P* = \\($' + P + '\\) per unit. Q* = ' + Q + ' units.</div>'
    };
  };

  GENS['e:q4.2'] = function (rng) {
    var B = pick(rng, [1, 2, 3, 4]);
    var D = pick(rng, [1, 2, 3, 4]);
    var Pstar = pick(rng, [10, 12, 15, 16, 18, 20, 24]);
    var C = pick(rng, [0, 4, 8, 10, 16, 20]);
    var Qstar = C + D * Pstar;
    var A = Qstar + B * Pstar;
    if (Qstar <= 0) return {ok: false};
    var delta = pick(rng, [-8, -6, -5, -4, -3, 3, 4, 5, 6, 8]);
    var P0 = Pstar + delta;
    if (P0 <= 0) return {ok: false};
    var Qd = A - B * P0, Qs = C + D * P0;
    var gap = Qd - Qs;
    if (gap === 0) return {ok: false};
    return {
      ok: true,
      givens: {A: A, B: B, C: C, D: D, P0: P0, gap: gap},
      text: 'Demand is \\(Q_d = ' + A + ' - ' + B + 'P\\) and supply is \\(Q_s = ' + C + ' + ' + D + 'P\\). The posted price is \\($' + P0 + '\\) per unit. What is \\(Q_d - Q_s\\) at that price? (A positive number is a shortage; a negative number is a surplus.)',
      ans: [{q: 'Qd − Qs', v: gap, u: 'units', tp: 1}],
      hints: [
        'Plug \\(P = ' + P0 + '\\) into both equations.',
        'Subtract quantity supplied from quantity demanded.'
      ],
      sol: '<div class="q-sol">\\(Q_d = ' + Qd + '\\), \\(Q_s = ' + Qs + '\\), so \\(Q_d - Q_s = ' + gap + '\\) units.</div>'
    };
  };

  GENS['e:q4.3'] = function (rng) {
    var B = pick(rng, [1, 2, 3, 4]);
    var D = pick(rng, [1, 2, 3, 4]);
    var P0 = pick(rng, [8, 10, 12, 15, 16, 20]);
    var C = pick(rng, [0, 5, 10, 16, 20]);
    var Q0 = C + D * P0;
    var A = Q0 + B * P0;
    if (Q0 <= 0) return {ok: false};
    var shiftD = rng() < 0.6;
    var delta = pick(rng, [8, 10, 12, 16, 20, 24]) * (rng() < 0.75 ? 1 : -1);
    var A2 = A, C2 = C;
    if (shiftD) A2 = A + delta; else C2 = C + delta;
    if (A2 <= C2) return {ok: false};
    var den = B + D;
    if ((A2 - C2) % den !== 0) return {ok: false};
    var P2 = (A2 - C2) / den;
    var Q2 = A2 - B * P2;
    if (P2 <= 0 || Q2 <= 0) return {ok: false};
    var text = shiftD
      ? 'Start from \\(Q_d = ' + A + ' - ' + B + 'P\\) and \\(Q_s = ' + C + ' + ' + D + 'P\\). Demand changes so the new demand is \\(Q_d = ' + A2 + ' - ' + B + 'P\\). Supply is unchanged. Find the new equilibrium price, in dollars per unit, and the new equilibrium quantity.'
      : 'Start from \\(Q_d = ' + A + ' - ' + B + 'P\\) and \\(Q_s = ' + C + ' + ' + D + 'P\\). Supply changes so the new supply is \\(Q_s = ' + C2 + ' + ' + D + 'P\\). Demand is unchanged. Find the new equilibrium price, in dollars per unit, and the new equilibrium quantity.';
    return {
      ok: true,
      givens: {A: A, B: B, C: C, D: D, A2: A2, C2: C2, P2: P2, Q2: Q2, shiftD: shiftD ? 1 : 0},
      text: text,
      ans: [
        {q: 'new P*', v: P2, u: '$/unit', tp: 1},
        {q: 'new Q*', v: Q2, u: 'units', tp: 1}
      ],
      hints: [
        'Set the new curve equal to the unchanged curve and solve for \\(P\\).',
        'Then plug back in to get the new \\(Q^*\\).'
      ],
      sol: '<div class="q-sol">New equilibrium: \\(P^* = \\)$' + P2 + '/unit, \\(Q^* = ' + Q2 + '\\) units.</div>'
    };
  };

  GENS['e:q4.4'] = function (rng) {
    var b = pick(rng, [0.5, 1, 2]);
    var d = pick(rng, [0.5, 1, 2]);
    var Q = pick(rng, [20, 24, 30, 40, 50, 60]);
    var c = pick(rng, [0, 2, 4, 5, -4, -10]);
    var P = c + d * Q;
    var a = P + b * Q;
    if (P <= 0 || a <= P) return {ok: false};
    var CS = 0.5 * (a - P) * Q;
    var PS = 0.5 * (P - c) * Q;
    if (CS !== Math.round(CS) || PS !== Math.round(PS) || CS <= 0 || PS <= 0) return {ok: false};
    function frac(v) {
      if (v === 0.5) return '1/2';
      return String(v);
    }
    var dem = (b === 0.5) ? ('P = ' + fmt(a) + ' - (1/2)Q') : ('P = ' + fmt(a) + ' - ' + fmt(b) + 'Q');
    var sup = (d === 0.5) ? ('P = ' + fmt(c) + ' + (1/2)Q') : ('P = ' + fmt(c) + ' + ' + fmt(d) + 'Q');
    return {
      ok: true,
      givens: {a: a, b: b, c: c, d: d, P: P, Q: Q, CS: CS, PS: PS},
      text: 'Demand is \\(' + dem.replace('P = ', 'P=') + '\\) and supply is \\(' + sup.replace('P = ', 'P=') + '\\), with \\(P\\) in dollars per unit. At equilibrium (\\(P^* = ' + fmt(P) + '\\), \\(Q^* = ' + fmt(Q) + '\\)), what is consumer surplus and what is producer surplus, in dollars?',
      ans: [
        {q: 'consumer surplus', v: CS, u: '$', tp: 1},
        {q: 'producer surplus', v: PS, u: '$', tp: 1}
      ],
      hints: [
        'Consumer surplus is the triangle \\((1/2)\\times(\\text{demand intercept} - P^*)\\times Q^*\\).',
        'Producer surplus is \\((1/2)\\times(P^* - \\text{supply intercept})\\times Q^*\\).'
      ],
      sol: '<div class="q-sol">CS = (1/2)(' + fmt(a) + ' − ' + fmt(P) + ')(' + fmt(Q) + ') = \\($' + fmt(CS) + '\\). PS = (1/2)(' + fmt(P) + ' − (' + fmt(c) + '))(' + fmt(Q) + ') = \\($' + fmt(PS) + '\\).</div>'
    };
  };

  function nth(n) {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    if (n % 10 === 1) return 'st';
    if (n % 10 === 2) return 'nd';
    if (n % 10 === 3) return 'rd';
    return 'th';
  }


  function instantiate(id, seed, course, template) {
    course = course || _course || "s";
    var key = course + ":" + id;
    var gen = GENS[key];
    if (!gen) {
      var reason = FIXED[key] || "This item is conceptual (or not parameterized).";
      return {
        id: id, course: course, fixed: true, reason: reason,
        text: template && template.text,
        ans: template && template.ans,
        hints: template && template.hints,
        sol: template && template.sol,
        givens: null
      };
    }
    var inst = null, k;
    for (k = 0; k < 80; k++) {
      var rng = mulberry32((seed + k * 1000003) >>> 0);
      inst = gen(rng);
      if (inst && inst.ok !== false) break;
      inst = null;
    }
    if (!inst) {
      inst = gen(mulberry32(0xC0FFEE ^ hash(key)));
    }
    if (!inst || inst.ok === false) throw new Error("generator failed for " + key + " seed " + seed);
    inst.id = id;
    inst.course = course;
    inst.seed = seed >>> 0;
    inst.fixed = false;
    return inst;
  }

  function get(qid) {
    if (_cache[qid]) return _cache[qid];
    var inst = instantiate(qid, currentSeed(qid), _course);
    _cache[qid] = inst;
    return inst;
  }
  function apply(q) {
    if (!q || !q.id) return q;
    var inst = instantiate(q.id, currentSeed(q.id), _course, q);
    _cache[q.id] = inst;
    if (!inst.fixed) {
      q.text = inst.text;
      q.ans = inst.ans;
      if (inst.hints) q.hints = inst.hints;
      q.sol = inst.sol;
      q.diagram = inst.diagram;
    } else if (inst.sol) {
      q.sol = q.sol || inst.sol;
    }
    return inst;
  }

  var api = {
    mulberry32: mulberry32, hash: hash, shuffle: shuffleInPlace, pick: pick, randInt: randInt,
    fmt: fmt, solve3: solve3,
    instantiate: instantiate, get: get, fresh: fresh, apply: apply,
    attachStore: attachStore, orderOf: orderOf,
    currentSeed: currentSeed, getTries: getTries, bumpTries: bumpTries,
    gens: GENS, fixed: FIXED, G: G
  };
  root.GrokeQuizRand = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
