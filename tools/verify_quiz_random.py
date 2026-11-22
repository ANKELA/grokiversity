#!/usr/bin/env python3
"""Check each quiz generator over many seeds against an independent calculation."""
from __future__ import annotations
import json, math, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
N = 500
G = 9.81
TOL = 1e-8

def close(a, b, tol=TOL):
    return math.isfinite(a) and math.isfinite(b) and abs(a - b) <= tol * max(1.0, abs(b), abs(a))

def hypot3(x, y, z):
    return math.sqrt(x * x + y * y + z * z)

def unit(v):
    n = hypot3(*v)
    return [v[0] / n, v[1] / n, v[2] / n]

def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

def cosd(d):
    return math.cos(math.radians(d))

def sind(d):
    return math.sin(math.radians(d))

def softmax(s):
    m = max(s)
    e = [math.exp(x - m) for x in s]
    z = sum(e)
    return [v / z for v in e]

def mse_at(pts, w, b):
    n = len(pts)
    return sum((y - (w * x + b)) ** 2 for x, y in pts) / n

def grad_mse(pts, w, b):
    n = len(pts)
    dw = db = 0.0
    for x, y in pts:
        e = y - (w * x + b)
        dw += x * e
        db += e
    return -(2 / n) * dw, -(2 / n) * db

def ols(pts):
    n = len(pts)
    xb = sum(p[0] for p in pts) / n
    yb = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - xb) ** 2 for p in pts)
    sxy = sum((p[0] - xb) * (p[1] - yb) for p in pts)
    w = sxy / sxx
    b = yb - w * xb
    return w, b, mse_at(pts, w, b)

def calc(key, g):
    """Independent answers from givens, same formulas as the worked solutions."""
    if key == "s:q1.1":
        Rx = g["F1"] * cosd(g["th1"]) + g["F2"] * cosd(g["th2"])
        Ry = g["F1"] * sind(g["th1"]) + g["F2"] * sind(g["th2"])
        return [math.hypot(Rx, Ry), math.degrees(math.atan2(Ry, Rx))]
    if key == "s:q1.4":
        F, C = g["F"], g["C"]
        u = unit(C)
        Foc = dot(F, u)
        mag = hypot3(*F)
        cang = max(-1.0, min(1.0, Foc / mag))
        return [Foc, math.degrees(math.acos(cang))]
    if key == "s:q1.3":
        F2x = g["R"] - g["F1"] * cosd(g["th1"])
        F2y = 0 - g["F1"] * sind(g["th1"])
        return [math.hypot(F2x, F2y), math.degrees(math.atan2(F2y, F2x))]
    if key == "s:q3.1":
        W = g["m"] * G
        den = sind(g["alpha"] + g["beta"])
        return [W * cosd(g["beta"]) / den, W * cosd(g["alpha"]) / den]
    if key == "s:q3.2":
        W = g["m"] * G
        TAC = W / sind(g["theta"])
        Fs = TAC * cosd(g["theta"])
        return [TAC, Fs, (Fs / g["k"]) * 1000]
    if key == "s:q3.3":
        import numpy as np
        B, C, D, P = g["B"], g["C"], g["D"], g["P"]
        U = np.column_stack([unit(B), unit(C), unit(D)])
        T = np.linalg.solve(U, [0, 0, P])
        return [float(T[0]), float(T[1]), float(T[2])]
    if key == "s:q4.1":
        return [g["F"] * g["d"] * sind(g["theta"])]
    if key == "s:q4.2":
        Fx = g["F"] * cosd(g["theta"])
        Fy = g["F"] * sind(g["theta"])
        return [g["x"] * Fy - g["y"] * Fx]
    if key == "s:q4.5":
        return [-g["F"], -g["F"] * g["x"]]
    if key == "s:q4.3":
        M = cross(g["r"], g["F"])
        return M + [hypot3(*M)]
    if key == "s:q4.4":
        M = cross(g["r"], g["F"])
        return [dot(unit(g["C"]), M)]
    if key == "s:q5.1":
        Ay = g["P"] * 1000 * (g["L"] - g["x"]) / g["L"]
        By = g["P"] * 1000 * g["x"] / g["L"]
        return [Ay, By]
    if key == "s:q5.2":
        Wd = g["w"] * g["Lu"]
        xd = g["Lu"] / 2
        By = (Wd * xd + g["P"] * g["Lp"]) / g["Lb"]
        Ay = Wd + g["P"] - By
        return [Ay, By]
    if key == "s:q5.3":
        Pn = g["P"] * 1000
        NB = (Pn * g["d"]) / (g["L"] * cosd(g["theta"]))
        Ax = NB * sind(g["theta"])
        Ay = Pn - NB * cosd(g["theta"])
        return [NB, Ax, Ay]
    if key == "s:q5.4":
        import numpy as np
        B, C, D, W = g["B"], g["C"], g["D"], g["W"]
        uBC = unit([C[i] - B[i] for i in range(3)])
        uBD = unit([D[i] - B[i] for i in range(3)])
        A = np.array([[uBC[1], uBD[1]], [uBC[2], uBD[2]]], float)
        Td = np.linalg.solve(A, [0.0, W])
        Tc, Td = float(Td[0]), float(Td[1])
        Ax = -(Tc * uBC[0] + Td * uBD[0])
        Ay = -(Tc * uBC[1] + Td * uBD[1])
        Az = -(Tc * uBC[2] + Td * uBD[2] - W)
        return [Tc, Td, Ax, Ay, Az]
    if key == "s:q5.5":
        L, c, h, P, Pbuck = g["L"], g["c"], g["h"], g["P"], g["Pbuck"]
        length = math.hypot(c, h)
        ux, uy = c / length, h / length
        Fcd = P * L / (uy * c)
        Ax = -Fcd * ux
        Ay = (P - Fcd * uy) * 1000
        Amag = math.hypot(Ax, P - Fcd * uy)
        Pmax = Pbuck * (uy * c) / L
        return [Fcd, Ax, Ay, Amag, Pmax]
    if key == "a:q1.1":
        EUA = g["pA"] * g["uA1"] + (1 - g["pA"]) * g["uA2"]
        EUB = g["pB"] * g["uB1"] + (1 - g["pB"]) * g["uB2"]
        return [EUA, EUB, g["uC"]]
    if key == "a:q1.2":
        b, d = g["b"], g["d"]
        return [(b ** (d + 1) - 1) / (b - 1)]
    if key == "a:q1.3":
        p_pos = g["tpr"] * g["pD"] + g["fpr"] * (1 - g["pD"])
        post = (g["tpr"] * g["pD"]) / p_pos
        return [p_pos * 100, post * 100]
    if key == "a:q1.4":
        n = g["nA"] + g["nB"]
        maj = 100 * max(g["nA"], g["nB"]) / n
        acc = 100 * g["correct"] / n
        return [maj, acc]
    if key == "a:q2.1":
        return [mse_at(g["pts"], g["w"], g["b"])]
    if key == "a:q2.2":
        return list(ols(g["pts"]))
    if key == "a:q2.3":
        sxy = sum(x * y for x, y in g["pts"])
        sxx = sum(x * x for x, y in g["pts"])
        w = sxy / sxx
        return [w, mse_at(g["pts"], w, 0)]
    if key == "a:q2.4":
        return list(grad_mse(g["pts"], g["w"], g["b"]))
    if key == "a:q3.1":
        w1 = g["w0"] - g["eta"] * 2 * (g["w0"] - g["a"])
        w2 = w1 - g["eta"] * 2 * (w1 - g["a"])
        return [w1, w2]
    if key == "a:q3.2":
        dw, db = grad_mse(g["pts"], g["w0"], g["b0"])
        return [dw, db, g["w0"] - g["eta"] * dw, g["b0"] - g["eta"] * db]
    if key == "a:q3.3":
        w1 = 2 * g["a"] - g["w0"]
        w2 = 2 * g["a"] - w1
        return [1, w1, w2]
    if key == "a:q3.4":
        dw, db = grad_mse(g["pts"], g["w"], g["b"])
        w2 = g["w"] - g["eta"] * dw
        b2 = g["b"] - g["eta"] * db
        return [w2, b2, mse_at(g["pts"], w2, b2)]
    if key == "a:q4.1":
        z = g["w"][0] * g["x"][0] + g["w"][1] * g["x"][1] + g["b"]
        return [z, 1 / (1 + math.exp(-z))]
    if key == "a:q4.2":
        al = softmax(g["s"])
        out = sum(ai * vi for ai, vi in zip(al, g["v"]))
        return al + [out]
    if key == "a:q4.3":
        d = g["d"]
        qv, keys, v = g["q"], g["keys"], g["v"]
        sc = [(qv[0] * k[0] + qv[1] * k[1]) / math.sqrt(d) for k in keys]
        al = softmax(sc)
        out = sum(ai * vi for ai, vi in zip(al, v))
        return sc + al + [out]

    if key == "e:q1.1":
        return [g["W"] + g["T"]]
    if key == "e:q1.2":
        acc = g["R"] - g["C"]
        return [acc, acc - g["A"]]
    if key == "e:q1.3":
        return [g["ymax"] / g["xmax"]]
    if key == "e:q1.4":
        return [g["T"] + g["B"] + g["W"] + g["extra"]]
    if key == "e:q2.1":
        return [g["ymax"] - g["k"] * g["x"]]
    if key == "e:q2.2":
        return [g["ymax"] / g["xmax"]]
    if key == "e:q2.3":
        ys, n = g["ys"], g["n"]
        return [ys[n - 1] - ys[n]]
    if key == "e:q2.4":
        return [g["ymax"] - g["k"] * g["x"] - g["y"]]
    if key == "e:q3.1":
        return [g["high"] - g["low"]]
    if key == "e:q3.2":
        return [g["aY"] / g["aX"], g["bY"] / g["bX"]]
    if key == "e:q3.3":
        return [g["lo"], g["hi"]]
    if key == "e:q3.4":
        auto_ax = (g["Ha"] / 2) * g["aX"]
        auto_ay = (g["Ha"] / 2) * g["aY"]
        spec_ax = g["Ha"] * g["aX"]
        return [spec_ax - g["T"] - auto_ax, g["T"] * g["price"] - auto_ay]
    if key == "e:q4.1":
        P = (g["A"] - g["C"]) / (g["B"] + g["D"])
        Q = g["A"] - g["B"] * P
        return [P, Q]
    if key == "e:q4.2":
        return [(g["A"] - g["B"] * g["P0"]) - (g["C"] + g["D"] * g["P0"])]
    if key == "e:q4.3":
        P = (g["A2"] - g["C2"]) / (g["B"] + g["D"])
        Q = g["A2"] - g["B"] * P
        return [P, Q]
    if key == "e:q4.4":
        return [0.5 * (g["a"] - g["P"]) * g["Q"], 0.5 * (g["P"] - g["c"]) * g["Q"]]
    raise KeyError("no independent calc for " + key)


DUMP_JS = r"""
const R = require('./prototype/quiz-rand.js');
const N = %d;
const out = {};
for (const key of Object.keys(R.gens)) {
  const [course, id] = key.split(':');
  out[key] = [];
  for (let s = 1; s <= N; s++) {
    const inst = R.instantiate(id, s, course);
    out[key].push({
      seed: s,
      givens: inst.givens,
      ans: inst.ans.map(a => ({q: a.q, v: a.v, u: a.u})),
      fixed: !!inst.fixed
    });
  }
}
process.stdout.write(JSON.stringify(out));
""" % N

def main():
    proc = subprocess.run(
        ["node", "-e", DUMP_JS],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit("node dump failed")
    data = json.loads(proc.stdout)
    fails = []
    n_ok = 0
    for key, rows in sorted(data.items()):
        assert len(rows) == N, f"{key}: expected {N} rows, got {len(rows)}"
        for row in rows:
            got = [a["v"] for a in row["ans"]]
            want = calc(key, row["givens"])
            if len(got) != len(want):
                fails.append((key, row["seed"], f"len {len(got)} vs {len(want)}"))
                continue
            bad = []
            for i, (gv, wv) in enumerate(zip(got, want)):
                if not close(gv, wv):
                    bad.append(f"[{i}] js={gv} py={wv} d={gv-wv}")
            if bad:
                fails.append((key, row["seed"], "; ".join(bad)))
            else:
                n_ok += 1
            if len(fails) >= 12:
                break
        if len(fails) >= 12:
            break
    if fails:
        for k, s, msg in fails:
            print(f"FAIL {k} seed {s}: {msg}")
        raise SystemExit(f"verify_quiz_random failed ({len(fails)} shown)")
    print(f"verify_quiz_random: {len(data)} generators × {N} seeds = {n_ok} instances match an independent calculation")
    # Determinism: same seed twice
    det = subprocess.run(
        ["node", "-e", "const R=require('./prototype/quiz-rand.js'); const a=R.instantiate('q1.1', 42, 's'); const b=R.instantiate('q1.1', 42, 's'); console.log(JSON.stringify({ok:JSON.stringify(a.ans)===JSON.stringify(b.ans), A:a.ans, B:b.ans}));"],
        cwd=str(ROOT), capture_output=True, text=True, check=True,
    )
    d = json.loads(det.stdout)
    assert d["ok"], d
    print("deterministic seed 42 for s:q1.1: ok")
    return 0

if __name__ == "__main__":
    sys.exit(main())
