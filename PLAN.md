# Grokeversity: Product and Technical Plan (v0.1)

*Status: draft, 21 Nov 2026. First track: **Mechanical Engineering**. Everything here is local and unpublished.*

> Grokeversity is a community project. It is **not affiliated with or endorsed by xAI** and **not an accredited degree**. We call the ME track a *degree-equivalent curriculum*.

---

## 1. Product in one paragraph
Grokeversity is a free, open-source course of study whose depth matches an accredited B.S. in Mechanical Engineering. Content lives in version-controlled Markdown/YAML: degree → courses → units → concepts → problems. Every numeric answer is machine-verified. A static web app teaches each concept with rendered math and interactive diagrams, grades strictly with mastery gates (≥ 80%), and schedules spaced review. An AI tutor does the one-on-one coaching. In the MVP, the student pastes our **tutor prompt into their own Grok chat**. Later, they can **bring their own xAI API key**.

## 2. Rigor standard
"Equivalent to a real accredited ME degree" means the following. This is a hard requirement for every course.

| Requirement | Standard |
|---|---|
| Syllabus mapping | Every course names **at least one real university syllabus** (MIT OCW or a public university catalog) and covers its full topic list and learning outcomes. |
| Program outcomes | The whole track must cover all seven **ABET EAC Criterion 3 student outcomes**: (1) complex problem solving, (2) engineering design, (3) communication, (4) ethics and professional responsibility, (5) teamwork, (6) experimentation and data analysis, (7) self-directed learning. It must also meet the ABET **Mechanical program criteria**: math through multivariate calculus and differential equations; modeling, analysis, design and realization of physical systems; coverage of both thermal and mechanical systems; and depth in one of them. [ABET 2025-26 criteria][abet] |
| Curriculum mass | Match ABET Criterion 5: **≥ 30 credit-equivalents of math and basic science** and **≥ 45 of engineering topics**, plus a **culminating design experience** that uses standards and multiple constraints. [abet] |
| Study hours | 1 credit-equivalent ≈ **45 hours** of total work. That figure comes from the US federal credit-hour definition: 1 h of instruction plus 2 h out of class per week for about 15 weeks. [34 CFR 600.2][cfr] A 3-credit course is therefore about **135 h** (target range 120–150 h), and the full ~120-credit track is about **5,400 h**. |
| Problem sets | One graded set per unit, with 10–15 problems at **textbook end-of-chapter difficulty** (Hibbeler / Beer & Johnston level). Easy, medium and hard problems, including 3D work. |
| Design problems | At least one **multi-step, open-ended design problem** per engineering course, graded with a rubric: requirements, analysis, safety factor, drawings, and a written justification. |
| Exams | Timed, closed-book **unit exams** drawn from randomized, parametrized banks. A cumulative **final** (2–3 h) per course. Certificate finals are identity-checked (§8). |
| Mastery | **≥ 80%** to pass any concept, unit exam or final. Retakes use new randomized forms after a cooldown period. |
| Capstone | A two-course capstone: a real design project with requirements, standards (e.g. ASME Y14.5 drawings), analysis, a prototype or high-fidelity simulation, a report and a recorded design review in front of human mentors. |

**Reference textbooks** (students buy, borrow or use free alternatives):
- Statics: R.C. Hibbeler, *Engineering Mechanics: Statics* (Pearson) [hib]; F.P. Beer, E.R. Johnston et al., *Vector Mechanics for Engineers: Statics* (McGraw Hill) [beer]; free alternative: Baker & Haynes, *Engineering Statics: Open and Interactive* [es].
- Calculus and physics (free): OpenStax *Calculus* and *University Physics* [osc][osp].
- Other courses: the standard texts are listed in each `course.yaml`. Examples: Hibbeler for dynamics, Gere/Goodno or Beer for mechanics of materials, Çengel for thermodynamics and heat transfer, Fox & McDonald or White for fluids, Shigley for machine design, Callister for materials, Ogata or Nise for controls.

## 3. Degree map: Mechanical Engineering
The track is modeled loosely on ABET-accredited ME programs and on MIT's Course 2 core [mitcat]. Course IDs are our own. Credits are equivalents; about 120 in total.

| Yr | Course (ours) | Cr | Prereqs | Benchmark syllabus (public) |
|---|---|---|---|---|
| 1 | MATH 101 Calculus I | 4 | (precalc) | [MIT 18.01SC](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/) |
| 1 | MATH 102 Calculus II | 4 | 101 | 18.01SC (second half); [OpenStax Calculus][osc] |
| 1 | PHYS 101 Mechanics | 4 | MATH 101 | [MIT 8.01SC](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/) |
| 1 | PHYS 102 Electricity & Magnetism | 4 | PHYS 101, MATH 102 | [MIT 8.02](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/) |
| 1 | CHEM 101 Chemistry | 4 | | [MIT 5.111SC](https://ocw.mit.edu/courses/5-111sc-principles-of-chemical-science-fall-2014/) or [3.091](https://ocw.mit.edu/courses/3-091-introduction-to-solid-state-chemistry-fall-2018/) |
| 1 | ME 101 Intro Design & CAD | 3 | | [MIT 2.00B](https://ocw.mit.edu/courses/2-00b-toy-product-design-spring-2008/); CAD in [Onshape Education](https://www.onshape.com/en/education/) / [FreeCAD](https://www.freecad.org/) |
| 1 | CS 101 Programming for Engineers | 3 | | [MIT 2.086](https://ocw.mit.edu/courses/2-086-numerical-computation-for-mechanical-engineers-fall-2014/) (intro part) |
| 2 | MATH 201 Multivariable Calculus | 4 | 102 | [MIT 18.02SC](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/) |
| 2 | MATH 202 Differential Equations | 3 | 102 | [MIT 18.03SC](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/) |
| 2 | MATH 203 Linear Algebra | 3 | 102 | [MIT 18.06SC](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/) |
| 2 | **ME 201 Statics** ✅ sample | 3 | PHYS 101, MATH 101 | [MIT 2.001 (statics part)](https://ocw.mit.edu/courses/2-001-mechanics-materials-i-fall-2006/pages/syllabus/); [Engineering Statics][es] |
| 2 | ME 202 Dynamics | 3 | ME 201, MATH 202 | [MIT 2.003SC](https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/) |
| 2 | ME 203 Mechanics of Materials | 4 | ME 201 | [MIT 2.001](https://ocw.mit.edu/courses/2-001-mechanics-materials-i-fall-2006/), [2.002](https://ocw.mit.edu/courses/2-002-mechanics-and-materials-ii-spring-2004/) |
| 2 | EE 201 Circuits & Electronics | 3 | PHYS 102 | (catalog-level; e.g. MIT 2.678 in [catalog][mitcat]) |
| 2 | MSE 201 Materials Science | 3 | CHEM 101 | [MIT 3.012](https://ocw.mit.edu/courses/3-012-fundamentals-of-materials-science-fall-2005/) |
| 3 | ME 301 Thermodynamics | 3 | PHYS 101, MATH 201 | MIT 2.005 Thermal-Fluids I ([catalog][mitcat], [dept page][mit2005]) |
| 3 | ME 302 Fluid Mechanics | 3 | ME 202, MATH 202 | 2.005/2.006 ([catalog][mitcat]); [MIT 2.06](https://ocw.mit.edu/courses/2-06-fluid-dynamics-spring-2013/) |
| 3 | ME 303 Heat Transfer | 3 | ME 301, ME 302 | 2.005/2.006 ([catalog][mitcat]); [MIT 2.51](https://ocw.mit.edu/courses/2-51-intermediate-heat-and-mass-transfer-fall-2008/) (stretch) |
| 3 | ME 304 Machine Design | 4 | ME 203, ME 101 | [MIT 2.72](https://ocw.mit.edu/courses/2-72-elements-of-mechanical-design-spring-2009/), [2.007](https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/) |
| 3 | ME 305 Manufacturing | 3 | ME 304, MSE 201 | [MIT 2.008 (2025)](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2025/) |
| 3 | ME 306 Numerical Methods | 3 | CS 101, MATH 203 | [MIT 2.086](https://ocw.mit.edu/courses/2-086-numerical-computation-for-mechanical-engineers-spring-2013/) |
| 3 | STAT 301 Probability & Statistics | 3 | MATH 201 | [MIT 18.05](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/) |
| 3 | ME 307 Measurement & Instrumentation Lab | 3 | ME 203, EE 201, STAT 301 | MIT 2.671 ([catalog][mitcat]) |
| 4 | ME 401 System Dynamics & Controls | 4 | ME 202, MATH 202 | [MIT 2.003J](https://ocw.mit.edu/courses/2-003j-dynamics-and-control-i-spring-2007/), [2.004](https://ocw.mit.edu/courses/2-004-dynamics-and-control-ii-spring-2008/), [2.14](https://ocw.mit.edu/courses/2-14-analysis-and-design-of-feedback-control-systems-spring-2014/) |
| 4 | ME 402 Thermal-Fluid Systems Design | 3 | ME 303 | MIT 2.006 ([catalog][mitcat]) |
| 4 | ME 403 Mechatronics | 3 | EE 201, ME 401 | (catalog-level) |
| 4 | ME 490/491 Capstone Design I & II | 6 | senior standing | MIT 2.009 ([catalog][mitcat]); ABET Criterion 5 culminating design [abet] |
| 4 | Technical electives ×3 | 9 | varies | e.g. FEA, CFD, robotics, HVAC |
| 1–4 | Ethics, technical writing, economics, humanities | ~18 | | Needed for ABET outcomes 3 and 4. |

MIT's 2.005, 2.006, 2.671 and 2.009 did not have a current OCW page that we could find, so the links above point to the MIT catalog. Contributors should add a second public syllabus for each course from an ABET-accredited university.

Subtotals: math and basic science ≈ 33 (calculus ×3, DiffEq, linear algebra, physics ×2, chemistry, statistics); engineering topics ≈ 69, including design and capstone; general education ≈ 18. Total ≈ 120. This meets ABET's 30/45 minimums [abet].


## 3b. Introduction to Economics (ECON 101)

A second playable track, **Introduction to Economics**, is a university-level principles course (microeconomics plus an introduction to macroeconomics), not an accredited degree. The syllabus is mapped to:

- MIT OCW [14.01 Principles of Microeconomics](https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2018/)
- MIT OCW [14.02 Principles of Macroeconomics](https://ocw.mit.edu/courses/14-02-principles-of-macroeconomics-spring-2014/)
- [OpenStax *Principles of Economics* 3e](https://openstax.org/details/books/principles-economics-3e) (CC BY 4.0)

Those works are **cited as topic-list standards**, not copied. All lesson prose and problems are original and released under CC BY-SA 4.0.

Planned units: (1) scarcity, opportunity cost, and the PPF; (2) comparative advantage and trade; (3) supply and demand; (4) elasticity; (5) government intervention (price controls, taxes, deadweight loss); (6) consumer choice; (7) costs and production; (8) market structures; (9) externalities and public goods; (10) GDP and measurement; (11) inflation and unemployment; (12) money, monetary policy, and fiscal policy. Unit 1 is playable and teaches scarcity, the PPF, comparative advantage, and a first look at supply and demand.

See `courses/econ-101-intro/` and `tutor/TUTOR_PROMPT_ECON.md`.

## 4. How "uses your Grok account" actually works

**What exists (verified 21 Nov 2026):**
- xAI runs a **public developer API** at `https://api.x.ai/v1`. It is **OpenAI-SDK compatible**, so you set `base_url="https://api.x.ai/v1"` with an API key. New work should use the **Responses API**; Chat Completions is now called "legacy". [xai-quick][xai-cc][xai-resp]
- API keys are created in the **xAI Console** (`console.x.ai`) and billed per token from **prepaid credits** or by monthly invoice. Prepaid credits are generally **non-refundable**. [xai-quick][xai-bill]
- **The account is shared, but billing is separate.** xAI's FAQ says the same account works for Grok and for the API, but "the billing is separate". A Grok or SuperGrok consumer subscription **does not pay for API calls**. [xai-acct]
- As of this writing, the flagship `grok-4.7` costs **$2.00 per 1M input tokens and $6.00 per 1M output tokens** ($0.50 for cached input). Prices change, so always re-check. [xai-price][xai-models]
- Every response reports its exact cost (`usage.cost_in_usd_ticks`), which is handy for per-student budgets. [xai-cost]
- (Observation: the docs.x.ai pages are currently titled "SpaceXSI Docs"; the API host is still api.x.ai.)
- We found **no public "Sign in with Grok" OAuth** that lets a third-party app spend a user's *consumer* Grok subscription. Don't plan around one.

**The options:**

| Option | How it works | Cost to student | Cost to project | Pros | Cons |
|---|---|---|---|---|---|
| **A. Prompt pack** (MVP) | The student copies `TUTOR_PROMPT.md` into their own Grok chat (free or paid). The web app is fully static. | Their existing Grok plan | **$0** | Works today with any Grok account; zero infrastructure; no keys handled | The tutor can't see app progress; the answer key is visible in the prompt; it can't be proctored |
| **B. BYOK** (Phase 2) | The student pastes their own xAI API key into the web app, and the tutor panel calls the Responses API with the unit's context and grading. | Per-token on *their* API billing, roughly a few cents to ~$0.35 per study hour (estimate below) | ~$0 | Tutor and app share state; the answer key stays hidden from the student UI; strict server-side-style grading | The student needs a Console account and credits. Keys must never be stored on our servers. Browser-to-API CORS is unverified and may need a stateless pass-through proxy. |
| **C. Sponsored tutor** (Phase 3) | Project-funded API key, rate-limited per student | $0 | ~$0.15–0.35 per student-hour (estimate) | Best experience for students | Needs funding (§11), abuse controls and accounts |

**Token estimate (assumption, not a quote):** one tutoring hour ≈ 40 turns × (~3k prompt + ~0.4k output tokens) ≈ 120k input + 16k output. At grok-4.7 list prices that is ≈ $0.24 + $0.10 = **$0.34/h** uncached, and roughly half that with prompt caching.

## 5. Recommended MVP
1. **Static course repository plus a static web app.** It needs no backend and is hosted free (§12). It contains Statics Unit 1 (done in this repo) and then all of Statics.
2. **A tutor prompt pack** for each unit (Option A), with a one-click **"Copy tutor prompt for Grok"** button (done in the prototype).
3. **Mastery engine in the browser:** numeric grading with tolerance and unit parsing, a hint ladder, ≥ 80% gates, and progress in `localStorage`. Spaced review via an FSRS-style scheduler [fsrs]; a simple 1-3-7-day schedule in v0.
4. **Verification CI:** schema validation plus a script that recomputes every answer (`tools/verify_statics_unit01.py`, currently 59/59 passing).
5. After that: BYOK tutor (Option B), randomized parametrized problem banks, accounts, and certificates.

## 6. Curriculum structure, progress and spaced review
**Hierarchy:** `degree.yaml` → `course.yaml` → `units/*.yaml` → `concepts[]` → `quiz[]`. The schema is `schema/unit.schema.json`.

Each **concept** has:
- `id`, `title` and `prerequisites` (concept IDs)
- `objectives` (measurable, written as "Compute…", "Draw…")
- `explanation_outline` (the teaching skeleton that the tutor expands)
- `explanation_prompts` (alternative analogies and representations for re-teaching)
- `quiz[]`, with 3–5 or more items

Each **quiz item** has `difficulty` (easy, medium, hard or exam), `prompt`, `answers[]` (quantity, value, unit, `tolerance_pct` or `tolerance_abs`), `hints[]` (a Socratic ladder), `solution`, and optionally `rubric` and `expected_text`. Unit-level fields: `mastery_threshold` (≥ 0.80, enforced by the schema) and `unit_exam` (timing, allowed aids, how problems are drawn, retake policy).

**Progress at the student's own pace:**
- State is stored per concept: the attempts, first-try correctness, hints used, mastery %, the last-seen date and the next review date.
- Mastery % weights first-try answers at 1.0, second-try at 0.75 and later tries at 0.5. A concept also requires at least one medium or hard item solved with hints no deeper than level 2.
- v0 stores this in `localStorage`. v1 adds optional accounts with export and import (JSON) so students own their data.
- **Spaced review:** missed and newly mastered items return at roughly 1, 3, 7 and 21 days (an FSRS-style scheduler later). Each new concept opens with a retrieval question.
- **No deadlines** apply to lessons. Exams are timed per sitting only.

## 7. Labs and hands-on work
ME labs (instrumentation, materials testing, machining, thermal-fluids rigs) **can't be fully replaced online**, and the certificate will say so. The alternatives are:
- **Phone sensors:** phyphox [phyphox] (accelerometer, gyroscope, acoustics), for dynamics and vibration labs.
- **Low-cost kits** (~$50–150, estimate): an Arduino with a load cell (HX711), thermocouples and strain gauges, used for statics, materials and measurement labs. Students report uncertainty analysis as in MIT 2.671.
- **Simulation:** CAD in Onshape (free for education) [onshape] or FreeCAD [freecad], which includes FEA; OpenModelica [openmodelica] for system dynamics and controls; and open-source CFD for fluids.
- **Makerspaces and community colleges:** a "lab passport" lists approved local options for hands-on manufacturing.
- Lab reports are graded by rubric and reviewed by peers or mentors. The capstone needs a physical prototype *or* a validated high-fidelity simulation.

## 8. Certificates
**Tiers:**
1. **Course Certificate**, for example "ME 201 Statics". To earn it, pass every unit (≥ 80%), every problem set (≥ 80%), the design problem (rubric ≥ 80%) and an **identity-checked, timed, cumulative final (≥ 80%)**.
2. **Track Certificate:** *"Certificate of Completion: Mechanical Engineering Curriculum"*. It requires all required course certificates, the lab portfolio, and a capstone that passes **human mentor review**: two reviewers with engineering degrees or PE licenses, plus a recorded design review.

**Credibility measures:**
- **Randomized, parametrized question banks**, so each sitting gets new numbers and a new problem mix, and the answer keys are never shipped to the client.
- **Proctored or identity-checked finals.** Options include a third-party proctor, roughly $8–13 per exam at institutional rates (e.g. Honorlock $8.24 per exam at Purdue [honor]; ProctorU $12.60 per attempt [proctoru]), or a lightweight option: webcam recording, ID check and an oral follow-up with a volunteer.
- **Oral spot checks:** a 10-minute video explanation of one exam answer, randomly assigned.
- **AI grading has limits.** AI grades practice work only. Certificate exams are auto-graded numerically against verified keys, and humans review the open-ended parts (design and capstone). An AI tutor can't detect a student who uses another AI, so integrity comes from proctoring and oral checks, not from AI judgment.
- **Rate limits and cooldowns** on retakes.

**Verifiable credentials:**
- Issue certificates as **1EdTech Open Badges 3.0** credentials [ob3][1edtech]. These are built on the **W3C Verifiable Credentials Data Model 2.0** [vc2] and digitally signed by a Grokeversity issuer key.
- Each certificate gets a **public verification URL** and **QR code**, such as `verify.<domain>/<credential-id>`, that shows its status. The printed PDF also carries a **SHA-256 hash** of the signed credential JSON, so anyone can confirm that the PDF matches the record. Revocations are published in a status list.
- A mockup is at `assets/certificate_mockup.png`.

**Legal limits on the word "degree"** (not legal advice; get a lawyer before issuing anything):
- In the US, many states restrict who may grant degrees and penalize false academic credentials. For example, **Oregon** forbids claiming an academic degree unless it came from an accredited or state-approved school (ORS 348.609) [ors]. **Washington** makes it unlawful to grant or offer a "false academic credential" (RCW 28B.85.220) [rcw].
- Therefore: **never** call it a degree, diploma, B.S. or "bachelor's". Don't use Latin honors. Don't say "accredited" or "university-equivalent".
- **Recommended title:** "Certificate of Completion: Mechanical Engineering Curriculum". The name "Grokeversity" itself is fine as a brand, but any page that issues certificates should carry the disclaimer.

**Sample certificate wording (honest):**
> **Grokeversity**, an open-source community learning project
> **Certificate of Completion**
> This certifies that **[Name]** has completed the Grokeversity **Mechanical Engineering Curriculum**: all required courses (~5,400 study hours), identity-checked final examinations (≥ 80%), and a capstone design project reviewed by volunteer engineering mentors.
> *This is not an academic degree and does not confer academic credit. Grokeversity is not an accredited institution. Grokeversity is an independent community project, not affiliated with or endorsed by xAI or any university.*
> Credential ID · Issue date · Verification URL / QR · SHA-256

**Later path to recognized value (Phase 4+):**
- **ACE Learning Evaluations** [ace]. The American Council on Education reviews non-traditional courses for credit recommendations that many colleges accept. This needs proctored exams and a formal organization.
- **FE exam preparation.** Map the curriculum to the NCEES **FE Mechanical** specifications [fe]. Be honest that most state boards require an ABET-accredited degree (or extra experience) to *sit* for the FE or become licensed, so our certificate alone does not qualify anyone.
- Partnerships with accredited institutions for credit-by-exam or prior-learning assessment.

## 9. Interface and UX
**Principles:** visual first, math always rendered, one idea per screen, immediate feedback, and nothing hidden behind a login for learning.

- **Math:** KaTeX for speed [katex], with MathJax as a fallback for complex accessibility needs [mathjax].
- **Interactive diagrams:** draggable force vectors with live components and resultant (built); a **free-body-diagram builder** (built: toggle reactions and check); a **live equilibrium solver** (built: drag the ring and watch the tensions and force triangle update); a moment calculator with a draggable line of action; and truss and frame builders later.
- **Step-by-step animated worked solutions** that reveal one line at a time (built).
- **3D views** for 3D statics (position vectors, cross products, ball-and-socket booms) using Three.js [three], with orbit controls and toggles for vector components.
- **Plots:** shear and moment diagrams, phase portraits and stress-strain curves, using D3 [d3] or JSXGraph [jsx].
- **Math input:** a box for answers with units, which parses `0.512 kN` and `169.9 mm` (built, with unit-kind checks). A MathLive editor [mathlive] can be added for symbolic answers.
- **Progress map:** the degree map with locked and unlocked courses, mastery rings, and the spaced-review queue (track map built on the landing page).
- **AI tutor chat panel** next to the lesson. In v0 it is scripted and has a "Copy tutor prompt for Grok" button (built). In v1 the BYOK panel streams from the xAI Responses API with unit context and the student's attempts.
- **Accessibility:** keyboard-operable handles, ARIA labels, colorblind-safe palette and reduced-motion support.

**Recommended stack:** Next.js (static export) + React [next], KaTeX, Mafs [mafs] or JSXGraph for 2D interactive math, Three.js for 3D, and D3 for plots. Content is YAML compiled at build time, and the site is hosted statically. The prototype in `prototype/` is plain HTML, CSS and JS with KaTeX from a CDN, so beginners can read and edit it.

**Prototype status (tested headless with Chrome, no console errors):** a landing page, the ME track map, Statics Unit 1 concepts 1–3 with three interactives and nine graded quiz items, localStorage progress that survives a reload, a mobile layout at 390×844 with no horizontal overflow, OG and X card tags with a 1200×630 `og.png`, a favicon and a footer disclaimer. Screenshots are in `prototype/screenshots/`.

## 10. Quality control for AI-generated content
1. **Humans own correctness.** AI may draft explanations and problems, but every unit starts as `draft-needs-human-review`. It becomes `reviewed` only after two approvals, one from a subject-matter reviewer.
2. **Machine-verified answers:** each unit ships a script that independently recomputes every numeric answer, and CI fails on any mismatch.
3. **Dual-method checks:** for example, a moment check about a second point, and an energy method against a force method.
4. **Schema validation:** required fields, mastery ≥ 0.80, at least 3 items per concept, and a hint ladder present.
5. **Difficulty calibration:** after launch, track first-try rates and median time per item. Flag items above 95% first-try (too easy) or below 20% (unclear or wrong).
6. **Student error reports:** a "Report a problem" link on every item opens a GitHub issue template.
7. **Copyright hygiene:** problems are original. Don't copy textbook problems. Link OCW (CC BY-NC-SA) rather than copying it.
8. **Tutor prompt red-team:** test every prompt against "just give me the answer", jailbreaks and wrong-but-confident student work before each release.

## 11. Funding
**Stage 1: fiscal sponsor (no incorporation needed).**
- **Hack Club HCB:** the project operates under The Hack Foundation's 501(c)(3). It can accept tax-deductible donations and grants within days. The fee is a **flat 7% of incoming funds**. [hcb][hcbfaq]
- **Open Source Collective** (on Open Collective): fiscal hosting for open-source projects with transparent budgets. The fee is **10% of incoming funds** plus payment-processor fees. [osc-fees][oc-hosts]
- **GitHub Sponsors:** **0% fee** on sponsorships from personal accounts, and up to 6% from organization accounts. [ghs]
- Pick **one** fiscal sponsor. HCB is cheaper; OSC is more "open-source native". Both work with GitHub Sponsors.

**Stage 2: own 501(c)(3)**, once revenue and governance are stable. IRS user fee: **$275 for Form 1023-EZ** (only for small organizations with gross receipts ≤ $50k) or **$600 for Form 1023**, plus state filings and annual returns. [irs-fee]

**Rough monthly costs** (estimates; sources noted where prices are cited):

| Item | MVP (static + prompt pack) | Phase 2–3 (1,000 active students) |
|---|---|---|
| Hosting (static) | **$0** on GitHub Pages / Cloudflare Pages [ghp][cfp] | $0–25 |
| Domain | ~$1–2/mo (≈ $10–20/yr, estimate) | same |
| AI tutor | **$0** (students use their own Grok) | BYOK: $0. Sponsored: 1,000 students × 10 h × ~$0.15–0.34/h ≈ **$1,500–3,400** [xai-price] |
| Backend (accounts, banks, credentials) | $0 | ~$0–50 on free/low tiers (estimate) |
| Proctoring (certificate finals only) | $0 | e.g. 100 finals/mo × $8–13 ≈ **$800–1,300** [honor][proctoru]. This could be a student fee or covered by sponsorship. |
| Credential signing and verification | $0 | ~$0 (open-source tooling) |

## 12. Hosting and launch (when the user decides)
- **GitHub Pages:** free for public repositories. The published site can be up to 1 GB, with a soft limit of 100 GB/month of bandwidth. It must not be used primarily for commercial transactions [ghp][ghp-lim]. The `prototype/` folder is already static and includes `.nojekyll`.
- Alternative: **Cloudflare Pages**, also free [cfp].
- Steps (not done; they need the user's approval and a GitHub login): create a GitHub account or org `grokeversity` (the name currently looks free) → create a public repo → push → Settings → Pages → deploy from `/prototype` (or move it to `/docs`) → run `python3 tools/build_site.py --base-url https://grokeversity.github.io/<repo>/` so the X card image URL is absolute → check it with X's card preview after posting.

## 13. Roadmap
| Phase | Scope | Exit criteria |
|---|---|---|
| **0 – Groundwork** ✅ | README, PLAN, schema, Statics U1 (5 concepts, 22 verified problems), tutor prompt, prototype site, certificate mockup | Local; tests pass |
| **1 – Public demo** (2–4 wks) | Publish the static site and repo; concepts 4–5 interactives; 3D view for q1.2/q3.3; issue templates; first 5 contributors | Link shareable on X; 0 console errors; 100 learners try it |
| **2 – Statics complete** (2–3 mo) | Units 2–6 (trusses, internal forces, friction, centroids); parametrized banks; BYOK tutor; unit exams; FSRS review | ≥ 60 bank items per unit; reviewer sign-off |
| **3 – Year-2 core** (6–12 mo) | Dynamics, Mechanics of Materials, Calc III/DiffEq links; accounts and export; fiscal sponsor; course certificates (beta, proctored) | 3 courses verified; first certificates |
| **4 – Full track** (2–3 yrs) | Thermo, fluids, heat transfer, design, manufacturing, controls, labs kit, capstone with mentors; track certificate; Open Badges 3.0 issuance; ACE review exploration; FE-prep mapping | First track completers; external review |

## 14. Open decisions for the project owner
1. **Name and trademark:** "Grokeversity" contains "Grok", which is an xAI trademark. The GitHub user/org name `grokeversity` currently returns 404 (it looks free), and `.com`, `.org`, `.io` and `.dev` show no registration in RDAP. Using "Grok" in the name could draw a trademark objection, so consider asking xAI or a lawyer, or keep a fallback name ready.
2. **Fiscal sponsor:** HCB (7%) or Open Source Collective (10%).
3. **Tutor model:** prompt pack only, or also BYOK in Phase 2 (and whether to support other models besides Grok).
4. **Certificates:** whether to charge a proctoring fee, and who the volunteer mentor reviewers will be.
5. **Hosting:** GitHub Pages vs Cloudflare Pages; custom domain.

---
### Sources
[abet]: https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/
[cfr]: https://www.ecfr.gov/current/title-34/subtitle-B/chapter-VI/part-600/subpart-A/section-600.2
[mitcat]: https://catalog.mit.edu/subjects/2/
[mit2005]: https://meche.mit.edu/featured-classes/thermal-fluids-engineering-i
[hib]: https://www.pearson.com/en-us/subject-catalog/p/engineering-mechanics-statics/P200000003383
[beer]: https://www.mheducation.com/highered/product/vector-mechanics-engineers-statics-beer-johnston/M9781260804638.html
[es]: https://engineeringstatics.org/
[osc]: https://openstax.org/details/books/calculus-volume-1
[osp]: https://openstax.org/details/books/university-physics-volume-1
[xai-quick]: https://docs.x.ai/developers/quickstart
[xai-cc]: https://docs.x.ai/developers/rest-api-reference/inference/chat-completions
[xai-resp]: https://docs.x.ai/developers/rest-api-reference/inference/responses
[xai-acct]: https://docs.x.ai/developers/faq/accounts
[xai-bill]: https://docs.x.ai/console/faq/billing
[xai-price]: https://docs.x.ai/developers/pricing
[xai-models]: https://docs.x.ai/developers/models
[xai-cost]: https://docs.x.ai/developers/cost-tracking
[fsrs]: https://github.com/open-spaced-repetition/fsrs4anki
[phyphox]: https://www.phyphox.org/
[onshape]: https://www.onshape.com/en/education/
[freecad]: https://www.freecad.org/
[openmodelica]: https://www.openmodelica.org/
[honor]: https://www.purdue.edu/innovativelearning/tools-resources/instructional-technology/honorlock/
[proctoru]: https://extension.illinois.edu/psep/understanding-proctoru-exam-fees
[ob3]: https://www.imsglobal.org/spec/ob/v3p0
[1edtech]: https://www.1edtech.org/standards/open-badges
[vc2]: https://www.w3.org/TR/vc-data-model-2.0/
[ors]: https://oregon.public.law/statutes/ors_348.609
[rcw]: https://app.leg.wa.gov/RCW/default.aspx?cite=28B.85.220
[ace]: https://www.acenet.edu/National-Guide/Pages/default.aspx
[fe]: https://ncees.org/exams/fe-exam/
[katex]: https://katex.org/
[mathjax]: https://www.mathjax.org/
[three]: https://threejs.org/
[d3]: https://d3js.org/
[jsx]: https://jsxgraph.org/
[mafs]: https://mafs.dev/
[mathlive]: https://cortexjs.io/mathlive/
[next]: https://nextjs.org/
[hcb]: https://v3.hackclub.com/fiscal-sponsorship/
[hcbfaq]: https://help.hcb.hackclub.com/en/articles/15409723-what-is-fiscal-sponsorship-and-how-is-it-different-from-starting-my-own-501-c-3
[osc-fees]: https://docs.oscollective.org/welcome-and-introduction-to-osc/fees
[oc-hosts]: https://documentation.opencollective.com/fiscal-hosts/fiscal-hosts
[ghs]: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
[irs-fee]: https://www.irs.gov/charities-non-profits/form-1023-and-1023-ez-amount-of-user-fee
[ghp]: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
[ghp-lim]: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
[cfp]: https://pages.cloudflare.com/

| Ref | URL |
|---|---|
| ABET criteria 2025–26 | https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/ |
| xAI API quickstart / accounts FAQ / billing FAQ / pricing | https://docs.x.ai/developers/quickstart · https://docs.x.ai/developers/faq/accounts · https://docs.x.ai/console/faq/billing · https://docs.x.ai/developers/pricing |
| Open Badges 3.0 / W3C VC 2.0 | https://www.imsglobal.org/spec/ob/v3p0 · https://www.w3.org/TR/vc-data-model-2.0/ |
| Oregon ORS 348.609 / Washington RCW 28B.85.220 | https://oregon.public.law/statutes/ors_348.609 · https://app.leg.wa.gov/RCW/default.aspx?cite=28B.85.220 |
| HCB / OSC / GitHub Sponsors / IRS fees | https://v3.hackclub.com/fiscal-sponsorship/ · https://docs.oscollective.org/welcome-and-introduction-to-osc/fees · https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors · https://www.irs.gov/charities-non-profits/form-1023-and-1023-ez-amount-of-user-fee |
