# SpiritualGuide — a life-transit oracle

An AI-guided fortune-telling companion that helps people plan around the critical
transits of their lives. It reads a seeker's question through Oriental and Western
divination traditions **and** renders the same cycles as clear, systematic curves —
a deliberate mix of the spiritual and the scientific, with a supportive, mindful tone.

## What it does

1. **Profile** — the seeker enters their birth date (time/place optional) and what's
   on their mind. Nothing is stored server-side.
2. **Life map (systematic lens)** — deterministic engines compute:
   - the **Chinese year pillar** (heavenly stem + earthly branch, element, animal)
   - the **numerology life path** and nine-year personal cycle
   - a ten-year **transit map**: per-aspect supportiveness curves (career, wealth,
     relationships, health, growth) blended from the 9-year, 12-year branch-relation
     and 7-year renewal cycles — rendered as an interactive SVG chart with hover
     tooltips, aspect toggles and a current-year marker. **Critical transition
     points** (supportive windows, consolidation years, momentum turns, threshold
     years) are marked on the curves; hovering a marker explains *what* it is,
     *why* it happens (which cycle drives it) and *how to use it*. The crosshair
     tooltip names the drivers behind any hovered year, and a "What moves these
     curves?" panel explains the three-cycle model.
   - an **I-Ching hexagram** cast for the moment of arrival (full 64-hexagram
     King Wen resolution with changing lines).
3. **Oracle chat (interpretive lens)** — a streaming conversation with an AI agent
   (Claude `claude-opus-4-8`, adaptive thinking) that freely chooses the tradition
   that fits the seeker — I-Ching, BaZi/Qi-Men-style timing, Vedic/Ayurvedic rhythm,
   Western astrology or numerology — based on the birth data, the wording and timing
   of the question, and any numbers mentioned. The agent is grounded in the app's
   computed context and can embed chart directives (```chart fences) that the client
   renders as live transit charts. Every substantive reading closes with structured
   counsel — **opportunities, obstacles, supporting resources and watch-outs** —
   plus concrete next steps. In offline mode a question-aware follow-up engine
   answers timing questions ("when is a good window for…"), specific-year questions
   and aspect deep-dives from the deterministic model.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Without an `ANTHROPIC_API_KEY`, the app runs in **Inner Compass mode**: readings are
generated locally from the deterministic engines, so the whole experience (including
charts in chat) still works offline.

## Design

- **UI/UX** — a calm mix of spiritual (serif display type, hexagrams, soft violet
  glow) and scientific (hairline grids, tabular figures, validated chart palette).
  Fully responsive: side-by-side panels on laptop, stacked on mobile. Light and dark
  themes with a toggle (defaults to the system preference).
- **Charts** follow a fixed spec: 2px lines, ≥8px end markers with surface rings,
  10% area wash for single series, legend for multiple series, hover crosshair +
  tooltip. The categorical palette is a CVD-validated set with separate light/dark
  steps.
- **Tone** — supportive, neutral and mindful. Difficult periods are framed as
  seasons for consolidation; every reading ends with something actionable. A
  standing disclaimer keeps the guidance reflective, not predictive.

## Structure

```
app/
  page.tsx             single-page flow: hero → profile → life map + oracle chat
  api/oracle/route.ts  streaming oracle endpoint (Claude or offline mode)
components/
  ProfileForm.tsx      birth-data intake
  Dashboard.tsx        year pillar / life path / personal year + transit chart + hexagram
  TransitChart.tsx     responsive SVG line chart (hover, legend, annotations)
  Hexagram.tsx         six-line hexagram rendering with changing lines
  ChatPanel.tsx        streaming chat, markdown-lite, ```chart directive rendering
lib/divination/
  iching.ts            64 hexagrams, King Wen matrix, seeded three-coin cast
  numerology.ts        life path (with masters), personal year themes
  bazi.ts              year pillar, branch relations (trine/clash/combine/harm)
  cycles.ts            the transit model: blended cycle scores per aspect/year
  reading.ts           shared context builder + offline reading generator
```

## Disclaimer

SpiritualGuide offers reflective guidance to support thinking and planning. It does
not predict events and is not a substitute for medical, legal or financial advice.
