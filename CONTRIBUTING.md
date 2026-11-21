# Contributing to Grokeversity

Thank you! The goal is **accredited-level rigor**, so correctness beats speed.

## Ways to help
- **Write a unit:** follow `schema/unit.schema.json`, using `courses/me-201-statics/units/01-forces-and-equilibrium.yaml` or `courses/ai-101-intro/units/01-fundamentals.yaml` as the model.
- **Review a unit:** subject-matter reviewers (engineers, instructors, grad students) are especially welcome.
- **Build an interactive:** add it to `prototype/app.js` (Statics) or `prototype/ai.js` (Intro to AI). Examples: a moment calculator, a truss builder, a 3D vector viewer, a bias–variance explorer.
- **Report errors:** open an issue that names the unit, the item ID and the correct answer, and shows your working.

## Rules for course content
1. **Original problems only.** Do not copy textbook problems. Link MIT OCW (CC BY-NC-SA) instead of copying it. Contributions are licensed CC BY-SA 4.0 (content) and MIT (code).
2. Every concept needs: objectives, an explanation outline, ≥ 3 quiz items across difficulties, hint ladders and full worked solutions. Use SI units and state the tolerances.
3. **Verify every number:** add or extend a `tools/verify_*.py` script that recomputes each answer independently.
4. AI-drafted content is allowed but must be labeled `status: draft-needs-human-review` until two humans approve it, one of them a subject-matter reviewer.
5. Map each course to a public syllabus and the ABET outcomes in `course.yaml`.

## Before you open a pull request
```bash
python3 tools/validate.py                 # schema
python3 tools/verify_statics_unit01.py    # (and your own verify script)
python3 tools/verify_ai_unit01.py
python3 tools/build_site.py               # embeds tutor prompt, rebuilds og.png/icons
python3 tools/test_prototype.py           # headless browser test (needs playwright + Chrome)
```

## Conduct
Be kind, be precise, and cite your sources. Never claim Grokeversity is accredited or affiliated with xAI.
