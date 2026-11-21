#!/usr/bin/env python3
"""Render assets/certificate_mockup.png (sample wording only; no xAI/Grok marks)."""
import hashlib, pathlib
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parents[1]
W, H = 2000, 1414
img = Image.new("RGB", (W, H), "#fbf8f1"); d = ImageDraw.Draw(img)
F = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    try: return ImageFont.truetype(F + name, size)
    except OSError: return ImageFont.load_default()
serif, serifb, sans = (lambda s: font("DejaVuSerif.ttf", s)), (lambda s: font("DejaVuSerif-Bold.ttf", s)), (lambda s: font("DejaVuSans.ttf", s))
navy, gold, grey = "#1f2a56", "#b08d3c", "#5b6070"
d.rectangle([40, 40, W-40, H-40], outline=navy, width=10); d.rectangle([70, 70, W-70, H-70], outline=gold, width=3)
def c(y, text, f, fill=navy):
    w = d.textlength(text, font=f); d.text(((W-w)/2, y), text, font=f, fill=fill)
c(140, "GROKEVERSITY", serifb(54), gold)
c(210, "An open-source community learning project", sans(28), grey)
c(330, "Certificate of Completion", serifb(86))
c(450, "This certifies that", serif(34), grey)
c(510, "Jane Q. Student", serifb(78))
d.line([560, 610, W-560, 610], fill=gold, width=3)
c(640, "has completed the Grokeversity", serif(36))
c(695, "Mechanical Engineering Curriculum", serifb(46))
c(760, "All required courses · ~5,400 study hours · identity-checked final exams (≥80%) · peer-reviewed capstone design project", sans(26), grey)
disc = ["This is not an academic degree and does not confer academic credit. Grokeversity is not an accredited institution.",
        "Grokeversity is an independent community project, not affiliated with or endorsed by xAI or any university."]
for i, t in enumerate(disc): c(850 + i*40, t, sans(24), "#7a3b3b")
cred_id = "GKV-ME-2027-000123"; h = hashlib.sha256(b"sample credential json").hexdigest()
d.text((150, 1010), f"Credential ID: {cred_id}", font=sans(26), fill=navy)
d.text((150, 1050), "Issued: 2027-06-01   ·   Open Badges 3.0 / W3C Verifiable Credential", font=sans(24), fill=grey)
d.text((150, 1090), f"SHA-256: {h[:32]}…", font=font("DejaVuSansMono.ttf", 22), fill=grey)
d.text((150, 1130), "Verify: https://verify.grokeversity.example/GKV-ME-2027-000123", font=sans(24), fill=navy)
for i, (x, who) in enumerate([(150, "Capstone mentor reviewer"), (720, "Curriculum maintainer")]):
    d.line([x, 1260, x+420, 1260], fill=navy, width=2); d.text((x, 1272), who, font=sans(24), fill=grey)
# QR placeholder (pseudo-pattern from hash; a real build would use the `qrcode` package)
x0, y0, cell = 1560, 990, 11; bits = bin(int(h, 16))[2:].zfill(256)
d.rectangle([x0-12, y0-12, x0+25*cell+12, y0+25*cell+12], fill="white", outline=navy)
for r in range(25):
    for col in range(25):
        corner = (r < 7 and col < 7) or (r < 7 and col > 17) or (r > 17 and col < 7)
        on = (r in (0, 6) or col in (0, 6) or (2 <= r <= 4 and 2 <= col <= 4)) if r < 7 and col < 7 else \
             (r in (0, 6) or col in (18, 24) or (2 <= r <= 4 and 20 <= col <= 22)) if r < 7 and col > 17 else \
             (r in (18, 24) or col in (0, 6) or (20 <= r <= 22 and 2 <= col <= 4)) if r > 17 and col < 7 else bits[(r*25+col) % 256] == "1"
        if on: d.rectangle([x0+col*cell, y0+r*cell, x0+col*cell+cell-1, y0+r*cell+cell-1], fill=navy)
d.text((x0-5, y0+25*cell+20), "Scan to verify (mock)", font=sans(20), fill=grey)
d.text((W-560, 90), "SAMPLE / MOCKUP — not a real credential", font=sans(22), fill="#a0a0a0")
out = ROOT / "assets/certificate_mockup.png"; img.save(out); print(out)
