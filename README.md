# Grokeversity

**University-level curricula, one concept at a time. It is free, open source and mastery-based, and you can study it with an AI tutor such as Grok. The first two tracks are Mechanical Engineering and Introduction to AI.**

> ⚠️ **Honest disclaimer.** Grokeversity is an independent community project. It is **not affiliated with, sponsored by or endorsed by xAI** (the maker of Grok) or by any university. It is **not an accredited institution** and does **not** award degrees or academic credit. What we offer is a *degree-equivalent curriculum*: a course of study designed to match the depth of an accredited B.S. in Mechanical Engineering. Completion certificates are not degrees. "Grok" is a trademark of its owner; this project does not use xAI or Grok logos.

## Mission
Anyone with curiosity, an internet connection and an AI chat account should be able to learn the full content of a useful degree, rigorously and at their own pace. The first tracks are **Mechanical Engineering (ME)** and **Introduction to AI**.

## Pitch
- **Rigor:** every course maps to a real university syllabus, about 135 study hours per 3-credit course. Problems are at textbook end-of-chapter difficulty, exams are timed, and finals are cumulative. You need **≥ 80% mastery** to advance, and the track ends with a capstone design project. See [PLAN.md](PLAN.md#2-rigor-standard).
- **Visual and mathematical:** rendered equations (KaTeX), draggable force vectors, a free-body-diagram builder, live equilibrium solvers and step-by-step worked solutions.
- **An AI tutor, not a cheat sheet:** [`tutor/TUTOR_PROMPT.md`](tutor/TUTOR_PROMPT.md) turns Grok into a strict Socratic tutor. It never gives the answer away, requires you to show work and units, and advances you only when you show mastery.
- **Your pace:** nothing in the lessons is timed. Exams are timed, as in a real course.

## Try it now
- **Web demo:** [ankela.github.io/grokeversity](https://ankela.github.io/grokeversity/). Two tracks are listed; Unit 1 of each first course is playable:
  - [ME 201 Statics, Unit 1](https://ankela.github.io/grokeversity/#learn) — forces, free-body diagrams, equilibrium.
  - [AI 101 Introduction to AI, Unit 1](https://ankela.github.io/grokeversity/intro-ai.html) — agents, linear models, gradient descent, neurons and attention.
  Progress is saved in your browser, and no account or API key is needed. You can also open `prototype/index.html` or `prototype/intro-ai.html` locally.
- **With Grok:** click **"Copy tutor prompt for Grok"** in a lesson, or copy [`tutor/TUTOR_PROMPT.md`](tutor/TUTOR_PROMPT.md) (Statics) or [`tutor/TUTOR_PROMPT_AI.md`](tutor/TUTOR_PROMPT_AI.md) (Intro to AI). Paste it into a new Grok chat and type `start`.

## How it works for a student
1. Pick the ME track and look at the degree map. Prerequisites are enforced: Calculus and Physics come before Statics.
2. Each **course** is divided into **units**, and each unit into **concepts**. For each concept you read and play with the visuals, watch a worked solution, then do the quiz.
3. Answers are checked numerically, within 1% and **with units**. Hints come one step at a time. You need ≥ 80% to unlock the next concept.
4. Missed ideas return in **spaced review**.
5. Each unit ends with a **timed exam**, and each course ends with a cumulative **final**, a graded **problem set** and a multi-step **design problem**.
6. Labs: hands-on work can't be fully replaced online. We provide home and simulation alternatives (phone sensors, cheap kits, CAD and FEA) and say clearly where these fall short. See [PLAN.md](PLAN.md#7-labs--hands-on-work).

## Certificates
- **Course certificates:** pass all unit exams, the problem sets and an identity-checked final (≥ 80%).
- **Track certificate:** *"Certificate of Completion: Mechanical Engineering Curriculum"*. This requires every course certificate plus a capstone design project reviewed by human mentors.
- Certificates are issued as verifiable digital credentials (Open Badges 3.0 / W3C Verifiable Credentials) with a public verification link. **They are not degrees and are not accredited.** See [PLAN.md §8](PLAN.md#8-certificates) and the [mockup](assets/certificate_mockup.png).

## Repository layout
```
README.md  PLAN.md  CONTRIBUTING.md  LICENSE (MIT)  LICENSE-CONTENT.md (CC BY-SA 4.0)
schema/unit.schema.json                     # JSON Schema for unit files
degrees/mechanical-engineering/degree.yaml  # ME degree map (course sequence)
degrees/introduction-to-ai/degree.yaml      # Intro to AI track map
courses/ai-101-intro/course.yaml            # AI 101 syllabus, benchmark URLs, textbooks
courses/ai-101-intro/units/01-fundamentals.yaml  # fully worked Unit 1 (4 concepts, 15 problems)
courses/me-201-statics/course.yaml          # course metadata, syllabus benchmarks, textbooks
courses/me-201-statics/units/01-forces-and-equilibrium.yaml   # fully worked sample unit (5 concepts, 22 problems)
tutor/TUTOR_PROMPT.md                       # copy-paste Grok tutor for Statics Unit 1
tutor/TUTOR_PROMPT_AI.md                    # copy-paste Grok tutor for AI 101 Unit 1
prototype/                                  # static website (index.html, intro-ai.html, app.js, ai.js, app.css, assets/)
tools/verify_statics_unit01.py              # recomputes every numeric answer (59/59 pass)
tools/verify_ai_unit01.py                   # recomputes every numeric answer (41/41 pass)
tools/validate.py                           # schema validation
tools/test_prototype.py                     # headless browser test + screenshots
tools/build_site.py                         # embeds tutor prompt, renders og.png & icons, sets absolute URLs
assets/certificate_mockup.png
```

## How contributors add courses
1. Copy `courses/me-201-statics/` as a template. Fill in `course.yaml` with the benchmark syllabus URLs, textbooks and hours.
2. Write units in YAML that follow `schema/unit.schema.json`: objectives, explanation outline, tutor prompts, and quiz items with answers, tolerances, hints and full solutions.
3. Add a verification script under `tools/` that **independently recomputes every numeric answer**.
4. Run `python3 tools/validate.py` and your verify script. Open a pull request, and get two human reviews, one of them from a subject-matter reviewer.
Details are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License recommendation
- **Code:** MIT ([choosealicense.com/licenses/mit](https://choosealicense.com/licenses/mit/)).
- **Course content:** CC BY-SA 4.0 ([creativecommons.org/licenses/by-sa/4.0](https://creativecommons.org/licenses/by-sa/4.0/)). Anyone may reuse and adapt the content, as long as they give credit and share alike.
- Don't paste in copyrighted textbook problems. MIT OCW material is CC BY-NC-SA, which is not compatible with CC BY-SA, so **link** to it and don't copy it.

## Status
Version 0.2 is live at [ankela.github.io/grokeversity](https://ankela.github.io/grokeversity/), with playable Unit 1 lessons in Mechanical Engineering (Statics) and Introduction to AI. See the roadmap in [PLAN.md](PLAN.md#10-roadmap).
