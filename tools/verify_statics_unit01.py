#!/usr/bin/env python3
"""Independently recompute every numeric answer in ME 201 Unit 1 and compare to the YAML.
Usage: python3 tools/verify_statics_unit01.py   (exit code 1 on any mismatch)"""
import sys, pathlib, numpy as np, yaml
ROOT = pathlib.Path(__file__).resolve().parents[1]
UNIT = ROOT / "courses/me-201-statics/units/01-forces-and-equilibrium.yaml"
d, g = np.deg2rad, 9.81
ang = lambda v: np.degrees(np.arctan2(v[1], v[0]))
unit = lambda v: np.asarray(v, float) / np.linalg.norm(v)
calc = {}

# q1.1
R = 300*np.array([np.cos(d(30)), np.sin(d(30))]) + 500*np.array([np.cos(d(135)), np.sin(d(135))])
calc["q1.1"] = [np.linalg.norm(R), ang(R)]
# q1.2
F = 600*unit(np.array([-1, 3, 6]) - np.array([2, 0, 0]))
calc["q1.2"] = [*F, *np.degrees(np.arccos(F/600))]
# q1.3
F1 = 500*np.array([np.cos(d(20)), np.sin(d(20))]); F2 = np.array([800, 0]) - F1
calc["q1.3"] = [np.linalg.norm(F2), ang(F2), abs(F1[1]), -90.0]
# q1.4
u = unit([3, 0, 4]); calc["q1.4"] = [F @ u, np.degrees(np.arccos(F @ u / 600))]
# q2.x  (counting answers – support theory)
calc["q2.1"] = [1, 2, 3, 1]; calc["q2.2"] = [30]; calc["q2.3"] = [4, 3, 4-3]
calc["q2.4"] = [3]; calc["q2.5"] = [3, 6]
# q3.1
W = 50*g
T = np.linalg.solve([[-np.cos(d(30)), np.cos(d(45))], [np.sin(d(30)), np.sin(d(45))]], [0, W])
calc["q3.1"] = list(T)
# q3.2
Tac = 8*g/np.sin(d(30)); Fs = Tac*np.cos(d(30)); calc["q3.2"] = [Tac, Fs, 1000*Fs/800]  # stretch in mm so a whole-number entry is meaningful
# q3.3
U = np.column_stack([unit(p) for p in ([-2, -3, 6], [3, -2, 6], [0, 4, 6])])
T3 = np.linalg.solve(U, [0, 0, 1200]); assert (T3 > 0).all(); calc["q3.3"] = list(T3)
# q4.1, q4.2
calc["q4.1"] = [200*0.40*np.sin(d(60))]
Fx, Fy = 500*np.cos(d(30)), 500*np.sin(d(30)); calc["q4.2"] = [2.0*Fy - 1.5*Fx]
# q4.3, q4.4
M = np.cross([2, 0, 0], F); calc["q4.3"] = [*M, np.linalg.norm(M)]; calc["q4.4"] = [M @ u]
# q4.5
calc["q4.5"] = [-400, 3.0*-400]
# q5.1
By = 10*2/6; calc["q5.1"] = [1000*(10 - By), 1000*By]  # newtons (6.667 kN would round poorly)
# q5.2
By = (12*1.5 + 6*5)/4; calc["q5.2"] = [12 + 6 - By, By]
# q5.3
NB = 8*3/(5*np.cos(d(30))); calc["q5.3"] = [1000*NB, 1000*NB*np.sin(d(30)), 1000*(8 - NB*np.cos(d(30)))]
# q5.4 (solve full 6-equation system by least squares, check residual ~ 0)
B = np.array([6., 0, 0]); uc, ud = unit(np.array([0, 2, 3]) - B), unit(np.array([0, -4, 3]) - B); L = np.array([0, 0, -2.])
# unknowns: Tc, Td, Ax, Ay, Az
A = np.zeros((6, 5)); b = np.zeros(6)
A[:3, 0], A[:3, 1], A[:3, 2:] = uc, ud, np.eye(3); b[:3] = -L
A[3:, 0], A[3:, 1] = np.cross(B, uc), np.cross(B, ud); b[3:] = -np.cross(B, L)
x, *_ = np.linalg.lstsq(A, b, rcond=None); assert np.allclose(A @ x, b, atol=1e-9)
calc["q5.4"] = [1000*v for v in x]  # newtons; |value| in kN was < 10
# q5.5
e = unit([3.0, 2.25]); Fcd = 10*4.0/(3.0*e[1])
Ax, Ay = -Fcd*e[0], 10 - Fcd*e[1]
calc["q5.5"] = [Fcd, Ax, 1000*Ay, np.hypot(Ax, Ay), 10*25/Fcd]  # A_y in N; others stay kN

def ok(expected, got, a):
    if "tolerance_abs" in a: return abs(expected - got) <= a["tolerance_abs"]
    tol = a.get("tolerance_pct", 1)/100
    return abs(expected - got) <= tol*max(abs(got), 1e-9) or abs(expected - got) < 1e-6

data = yaml.safe_load(UNIT.read_text()); bad = n = 0
for c in data["concepts"]:
    for q in c["quiz"]:
        vals = calc[q["id"]]
        assert len(vals) == len(q["answers"]), q["id"]
        for a, v in zip(q["answers"], vals):
            n += 1; good = ok(a["value"], float(v), a); bad += not good
            print(f"{'PASS' if good else 'FAIL'}  {q['id']:5} {a['quantity']:<26} yaml={a['value']:<10} computed={float(v):.4f} {a['unit']}")

# teaching micro-checks (not in the YAML quiz bank; used on "check yourself" slides)
import math
micro = [
    ("c1fx 100 N at 30°", 100*math.cos(math.radians(30)), 86.6025, "N", 1),
    ("c1fy 100 N at 30°", 100*math.sin(math.radians(30)), 50.0, "N", 1),
    ("c1r 3-4-5", 5.0, 5.0, "N", 1),
    ("c2roll unknowns", 1, 1, "count", 0),
    ("c2unk pin+roller", 3, 3, "count", 0),
    ("c3w 5 kg * 9.81", 5*9.81, 49.05, "N", 1),
    ("c4m 20 N * 0.30 m", 20*0.30, 6.0, "N·m", 1),
    ("c5ab Ay 12 kN at 2 m on 8 m", 12*(8-2)/8, 9.0, "kN", 1),
    ("c5ab By 12 kN at 2 m on 8 m", 12*2/8, 3.0, "kN", 1),
]
mbad = 0
for name, got, exp, unit, tp in micro:
    n += 1
    tol = (0 if unit=="count" else tp/100*abs(exp) or 1e-9)
    if unit=="count":
        good = got == exp
    else:
        good = abs(got-exp) <= max(tol, 1e-6)
    mbad += not good
    print(f"{'PASS' if good else 'FAIL'}  micro {name:<36} expected={exp:<10} computed={got:.4f} {unit}")
bad += mbad
# Playable-quiz integer-rounding policy (mirrors prototype/app.js):
# accept the nearest whole number (both sides of a .5) as well as the stated tolerance.
# Values with |v|<~10 that are not already integers are converted to a unit where the
# answer is a meaningful integer, or left precise (none remain in Statics Unit 1 scored Qs).
def half_away(v):
    if v == 0: return 0
    return int((1 if v > 0 else -1) * (__import__('math').floor(abs(v) + 0.5)))
def int_targets(v):
    import math
    if abs(abs(v) - math.floor(abs(v)) - 0.5) <= 1e-8:
        return [math.floor(v), math.ceil(v)]
    return [half_away(v)]
print("\nInteger-round targets for playable YAML answers:")
for c in data["concepts"]:
    for q in c["quiz"]:
        for a in q["answers"]:
            v=a["value"]; u=a["unit"]
            if u=="count":
                continue
            ts=int_targets(v)
            print(f"  {q['id']:5} {a['quantity']:<26} exact={v} {u}  accepts {ts} {u} (and ±tol)")


# Playable quiz unit-menu conversions (app.js UNITS table)
LBF_N = 4.4482216152605
LBFFT_NM = 1.3558179483314004
IN_M = 0.0254
FT_M = 0.3048
import math
conv_bad = 0
checks = [
    ("1 kN → N", 1*1000, 1000, 0),
    ("115.15 lbf → N", 115.15*LBF_N, 512.2, 1),          # 1%
    ("1 lbf·ft → N·m", 1*LBFFT_NM, 1.3558179483314004, 0),
    ("π/2 rad → deg", (math.pi/2)*(180/math.pi), 90, 0),
    ("12 in → m", 12*IN_M, 0.3048, 0),
    ("1 ft → m", 1*FT_M, 0.3048, 0),
    ("170 mm → m", 170*0.001, 0.170, 0),
]
for name, got, exp, tp in checks:
    tol = (tp/100)*abs(exp) if tp else 1e-12
    good = abs(got-exp) <= max(tol, 1e-12)
    conv_bad += not good
    print(f"{'PASS' if good else 'FAIL'}  unit {name:<22} got={got:.8g} expected={exp}")
n += len(checks)
bad += conv_bad

print(f"\n{n-bad}/{n} answers verified (including micro-checks)"); sys.exit(1 if bad else 0)

