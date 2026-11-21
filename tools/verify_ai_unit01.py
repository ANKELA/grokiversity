#!/usr/bin/env python3
"""Independently recompute every numeric answer in AI 101 Unit 1 and compare to the YAML.
Usage: python3 tools/verify_ai_unit01.py   (exit code 1 on any mismatch)"""
import math, sys, pathlib, numpy as np, yaml
ROOT = pathlib.Path(__file__).resolve().parents[1]
UNIT = ROOT / "courses/ai-101-intro/units/01-fundamentals.yaml"
calc = {}

# q1.1 expected utility
calc["q1.1"] = [0.7*10 + 0.3*0, 0.4*20 + 0.6*(-2), 6.5]
# q1.2 BFS, goal test on generation, last node at depth 5, b=4
calc["q1.2"] = [sum(4**k for k in range(0, 6))]
# q1.3 Bayes
p_pos = 0.95*0.01 + 0.10*0.99
calc["q1.3"] = [p_pos, 0.95*0.01 / p_pos]
# q1.4 majority baseline and model accuracy, as percents
calc["q1.4"] = [100*120/200, 100*150/200]

# Shared four-point data
x = np.array([1.0, 2, 3, 4]); y = np.array([2.0, 2, 5, 5]); n = len(x)
# q2.1  ŷ = x + 0.5
calc["q2.1"] = [float(np.mean((y - (x + 0.5))**2))]
# q2.2 OLS
xbar, ybar = x.mean(), y.mean()
w = float(np.sum((x-xbar)*(y-ybar)) / np.sum((x-xbar)**2))
b = float(ybar - w*xbar)
calc["q2.2"] = [w, b, float(np.mean((y - (w*x + b))**2))]
# q2.3 no intercept
w0 = float(np.dot(x, y) / np.dot(x, x))
calc["q2.3"] = [w0, float(np.mean((y - w0*x)**2))]
# q2.4 gradient at (1,1)
e = y - (1*x + 1)
calc["q2.4"] = [float(-(2/n)*np.dot(x, e)), float(-(2/n)*np.sum(e))]

# q3.1  J=(w-3)^2, eta=0.2, start 0
w = 0.0
steps = []
for _ in range(2):
    w = w - 0.2*2*(w - 3)
    steps.append(w)
calc["q3.1"] = steps
# q3.2 from (0,0), eta=0.01
dJdw = float(-(2/n)*np.dot(x, y)); dJdb = float(-(2/n)*np.sum(y))
calc["q3.2"] = [dJdw, dJdb, 0 - 0.01*dJdw, 0 - 0.01*dJdb]
# q3.3 critical eta and oscillation at eta=1 from w=5
calc["q3.3"] = [1.0, 5 - 1*2*(5-3), 5]  # after 2 steps returns to 5; compute second explicitly
w1 = 5 - 1*2*(5-3)
w2 = w1 - 1*2*(w1-3)
calc["q3.3"] = [1.0, w1, w2]
# q3.4 from (1,1), eta=0.2
dJdw, dJdb = calc["q2.4"]
w, b = 1 - 0.2*dJdw, 1 - 0.2*dJdb
calc["q3.4"] = [w, b, float(np.mean((y - (w*x + b))**2))]

# q4.1 neuron
z = 1*1 + (-2)*1 + 0.5
calc["q4.1"] = [z, 1/(1+math.exp(-z))]
# q4.2 softmax attention
s = np.array([2.0, 1, 0]); alpha = np.exp(s)/np.exp(s).sum(); v = np.array([1.0, 3, 5])
calc["q4.2"] = [float(alpha[0]), float(alpha[1]), float(alpha[2]), float(alpha @ v)]
# q4.3 scaled dot-product
q = np.array([1.0, 0]); ks = np.array([[1.0, 0], [0, 1], [1, 1]])
scores = ks @ q / math.sqrt(2)
al = np.exp(scores)/np.exp(scores).sum()
vals = np.array([1.0, 2, 4])
calc["q4.3"] = [float(scores[0]), float(scores[1]), float(scores[2]),
                float(al[0]), float(al[1]), float(al[2]), float(al @ vals)]

def ok(expected, got, a):
    if "tolerance_abs" in a:
        return abs(expected - got) <= a["tolerance_abs"] + 1e-12
    tol = a.get("tolerance_pct", 1)/100
    return abs(expected - got) <= tol*max(abs(got), 1e-9) or abs(expected - got) < 1e-6

data = yaml.safe_load(UNIT.read_text()); bad = nans = 0
for c in data["concepts"]:
    for q in c["quiz"]:
        vals = calc[q["id"]]
        assert len(vals) == len(q["answers"]), f"{q['id']}: {len(vals)} computed vs {len(q['answers'])} yaml"
        for a, v in zip(q["answers"], vals):
            nans += 1
            good = ok(a["value"], float(v), a)
            bad += not good
            print(f"{'PASS' if good else 'FAIL'}  {q['id']:5} {a['quantity']:<22} yaml={a['value']:<12} computed={float(v):.8g} {a['unit']}")
print(f"\n{nans-bad}/{nans} answers verified"); sys.exit(1 if bad else 0)
