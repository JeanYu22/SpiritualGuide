/**
 * Builds the divination context shared by the AI oracle (as system-prompt
 * grounding) and the offline "Inner Compass" mode — plus the offline reading
 * generators themselves: a structured opening reading and a question-aware
 * follow-up engine. Every reading closes with concrete guidance on
 * opportunities, obstacles, supporting resources and watch-outs.
 */

import { ASPECTS, AspectId, Profile } from "../types";
import { castHexagram, Cast } from "./iching";
import { birthPillar, branchRelation, RELATION_NOTES, yearPillar, YearPillar } from "./bazi";
import { numerologyProfile, lifePathTheme, PERSONAL_YEAR_THEMES, personalYear } from "./numerology";
import {
  aspectScoreDetail,
  keyMoments,
  transitionPoints,
  TransitionPoint,
} from "./cycles";

export interface DivinationContext {
  now: Date;
  currentYear: number;
  natal: YearPillar;
  current: YearPillar;
  relationNote: string;
  lifePath: number;
  lifePathNote: string;
  personalYearNow: number;
  personalYearNote: string;
  cast: Cast;
  outlookText: string;
}

export function buildContext(profile: Profile, question: string, now = new Date()): DivinationContext {
  const currentYear = now.getFullYear();
  const natal = birthPillar(profile.birthDate);
  const current = yearPillar(currentYear);
  const num = numerologyProfile(profile.birthDate, currentYear);
  const cast = castHexagram(question || profile.focus || profile.birthDate, now);

  const rel = branchRelation(natal.year, currentYear);
  const start = currentYear;
  const end = currentYear + 9;
  const km = keyMoments(profile.birthDate, start, end);

  const lines: string[] = [];
  for (const a of ASPECTS) {
    const peak = km.peaks.find((h) => h.aspect === a.id);
    const low = km.troughs.find((h) => h.aspect === a.id);
    const nowD = aspectScoreDetail(profile.birthDate, a.id, currentYear);
    lines.push(
      `${a.name}: now ${nowD.value}/100 (${nowD.dominant}); most supportive ${peak?.year} (${peak?.value}); consolidation year ${low?.year} (${low?.value})`
    );
  }
  if (km.thresholds.length) {
    lines.push(
      `Threshold years affecting all aspects: ${km.thresholds
        .map((t) => `${t.year} (${t.title.toLowerCase()})`)
        .join(", ")}`
    );
  }

  return {
    now,
    currentYear,
    natal,
    current,
    relationNote: RELATION_NOTES[rel],
    lifePath: num.lifePath,
    lifePathNote: lifePathTheme(num.lifePath),
    personalYearNow: num.personalYear,
    personalYearNote: PERSONAL_YEAR_THEMES[num.personalYear],
    cast,
    outlookText: lines.join("\n"),
  };
}

export function contextSummary(profile: Profile, ctx: DivinationContext): string {
  const c = ctx.cast;
  const changing = c.changingLines.length
    ? `changing line(s) ${c.changingLines.join(", ")} → transforms into #${c.resulting!.number} ${c.resulting!.english} (${c.resulting!.theme})`
    : "no changing lines — a settled image";
  return [
    `Seeker: ${profile.name || "unnamed"}; born ${profile.birthDate}${profile.birthTime ? " at " + profile.birthTime : ""}${profile.birthPlace ? " in " + profile.birthPlace : ""}.`,
    `Natal year pillar: ${ctx.natal.label}.`,
    `Current year (${ctx.currentYear}): ${ctx.current.label} — ${ctx.relationNote}.`,
    `Life path number: ${ctx.lifePath} (${ctx.lifePathNote}).`,
    `Personal year now: ${ctx.personalYearNow} — ${ctx.personalYearNote}.`,
    `I-Ching cast for this consultation: #${c.primary.number} ${c.primary.chinese} ${c.primary.pinyin} — ${c.primary.english} (${c.primary.theme}); ${changing}.`,
    `Ten-year systematic outlook (0-100 supportiveness):`,
    ctx.outlookText,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Offline reading generators                                          */
/* ------------------------------------------------------------------ */

const num = (v?: number) => (v == null ? "" : ` (${v}/100)`);

function factorBlock(
  birthDate: string,
  aspects: AspectId[],
  startYear: number,
  endYear: number,
  currentYear: number
): string {
  const pts = transitionPoints(birthDate, aspects, startYear, endYear);
  const peaks = pts.filter((p) => p.kind === "peak" || p.kind === "surge");
  const lows = pts.filter((p) => p.kind === "trough" || p.kind === "drop");
  const thresholds = pts.filter((p) => p.kind === "threshold");

  const opp = peaks.length
    ? peaks
        .map((p) =>
          p.kind === "peak"
            ? `- **${p.year} — ${p.aspectName}**${num(p.value)}: ${p.why}. A window to launch, commit or negotiate.`
            : `- **${p.year} — ${p.aspectName}**: momentum turns upward here — groundwork laid now compounds.`
        )
        .join("\n")
    : "- No sharp peaks in this window — progress comes from steady effort rather than timing.";

  const obs = [
    ...lows.map((p) =>
      p.kind === "trough"
        ? `- **${p.year} — ${p.aspectName}**${num(p.value)}: ${p.why}. Expect slower returns; don't force leaps.`
        : `- **after ${p.year} — ${p.aspectName}**: the tide turns; finish and secure what matters beforehand.`
    ),
    ...thresholds.map((t) => `- **${t.year} — all aspects**: ${t.title.toLowerCase()} — ${t.why.split(" — ")[1] ?? t.why}.`),
  ].join("\n");

  // supporting resources: cooperative years + strongest aspect now + relational personal years
  const resources: string[] = [];
  for (let y = startYear; y <= Math.min(endYear, startYear + 4); y++) {
    const natal = birthPillar(birthDate);
    const rel = branchRelation(natal.year, y);
    if (rel === "combine" || rel === "trine") {
      resources.push(
        `- **${y}** is a ${rel === "combine" ? "combination" : "harmony-triangle"} year: cooperation is favored — partnerships, mentors and allies open doors that effort alone cannot.`
      );
      break;
    }
  }
  const strongestNow = [...ASPECTS]
    .map((a) => aspectScoreDetail(birthDate, a.id, currentYear))
    .sort((x, y) => y.value - x.value)[0];
  const strongMeta = ASPECTS.find((a) => a.id === strongestNow.aspect)!;
  resources.push(
    `- Your strongest current ground is **${strongMeta.name}** (${strongestNow.value}/100) — lean on it to fund and steady moves in weaker aspects.`
  );
  const pyNow = personalYear(birthDate, currentYear);
  if ([2, 6].includes(pyNow)) {
    resources.push(`- Personal year ${pyNow} favors alliances — ask for help; it will come more easily than usual.`);
  } else if (pyNow === 8) {
    resources.push(`- Personal year 8 attracts backers and recognition — make your results visible.`);
  } else {
    resources.push(`- Personal year ${pyNow} (${PERSONAL_YEAR_THEMES[pyNow].split(" — ")[0]}) supplies its own fuel — align your asks with it.`);
  }

  const watch: string[] = [];
  if (thresholds.length) {
    watch.push(
      `- Keep large irreversible commitments out of **${thresholds.map((t) => t.year).join(" and ")}** where possible; move them a year earlier or later.`
    );
  }
  if (peaks.some((p) => p.kind === "peak")) {
    watch.push(`- In peak years, the risk is overcommitment — choose the one or two moves that matter and decline the rest.`);
  }
  if ([7, 9].includes(pyNow)) {
    watch.push(
      `- This is a ${pyNow === 7 ? "ripening (7)" : "composting (9)"} personal year: energy wants reflection${pyNow === 9 ? " and release" : ""} — pushing hard growth now tends to under-deliver.`
    );
  }
  if (!watch.length) watch.push(`- Nothing structural — the main risk is drifting through supportive years without a plan.`);

  return `### Opportunities

${opp}

### Obstacles

${obs || "- No hard obstacles in this window."}

### Supporting resources

${resources.join("\n")}

### Watch-outs

${watch.join("\n")}`;
}

function chartFence(aspects: AspectId[], startYear: number, endYear: number, title: string): string {
  const a = aspects.length ? `,"aspects":${JSON.stringify(aspects)}` : "";
  return `\`\`\`chart
{"kind":"transit","title":"${title}"${a},"startYear":${startYear},"endYear":${endYear}}
\`\`\``;
}

/** Opening reading for the first turn. */
export function localReading(profile: Profile, question: string, ctx: DivinationContext): string {
  const c = ctx.cast;
  const name = profile.name ? `, ${profile.name}` : "";
  const changingText = c.changingLines.length
    ? `Line${c.changingLines.length > 1 ? "s" : ""} ${c.changingLines.join(" and ")} ${c.changingLines.length > 1 ? "are" : "is"} in motion: the situation is turning toward **#${c.resulting!.number} ${c.resulting!.english}** — ${c.resulting!.theme}.`
    : `No lines are changing: the image is settled — inhabit the present pattern fully before seeking the next.`;

  return `### The moment of your asking

Welcome${name}. I read your question through two lenses — the symbolic, to feel the moment, and the systematic, to see its shape.

The coins fell into **Hexagram #${c.primary.number} ${c.primary.chinese} (${c.primary.pinyin}) — ${c.primary.english}**: ${c.primary.theme}. ${changingText}

### Where you stand

Born under the **${ctx.natal.label}** pillar; ${ctx.currentYear} is a **${ctx.current.label}** year — ${ctx.relationNote}. Your life path is **${ctx.lifePath}** (${ctx.lifePathNote}), moving through **personal year ${ctx.personalYearNow}**: ${ctx.personalYearNote}.

${chartFence([], ctx.currentYear, ctx.currentYear + 9, "Ten-year life transit map")}

The markers on the map are your critical transition points — hover them for what each one asks of you. Here is the same map as counsel:

${factorBlock(profile.birthDate, [], ctx.currentYear, ctx.currentYear + 9, ctx.currentYear)}

### Next steps

- Pick the **one aspect** that matters most this season and ask me about its best window — we will plan backward from it.
- Put the threshold years in your calendar now; decisions near them deserve extra preparation.
- Re-read the hexagram tonight: ${c.primary.english.toLowerCase()} is the quality this moment rewards.

> This guidance is reflective, not predictive — weather, not verdicts. Important decisions deserve professional advice as well.`;
}

/* ------------------------------------------------------------------ */
/* Question-aware follow-up engine (offline mode)                      */
/* ------------------------------------------------------------------ */

const ASPECT_KEYWORDS: [RegExp, AspectId][] = [
  [/career|job|work|business|profession|promotion|startup|purpose|vocation/i, "career"],
  [/wealth|money|financ|invest|saving|income|property|buy.*(house|home)|salary/i, "wealth"],
  [/relationship|love|partner|marri|romance|family|friend|dating|spouse/i, "relationships"],
  [/health|body|energy|illness|fitness|stress|vitality|sleep/i, "health"],
  [/growth|study|learn|wisdom|spirit|education|degree|skill|travel/i, "growth"],
];

function detectAspects(q: string): AspectId[] {
  const found: AspectId[] = [];
  for (const [re, id] of ASPECT_KEYWORDS) if (re.test(q)) found.push(id);
  return found;
}

function detectYears(q: string, currentYear: number): number[] {
  const ys = new Set<number>();
  const explicit = q.match(/20\d{2}/g);
  explicit?.forEach((s) => {
    const y = Number(s);
    if (y >= currentYear - 5 && y <= currentYear + 30) ys.add(y);
  });
  if (/this year/i.test(q)) ys.add(currentYear);
  if (/next year/i.test(q)) ys.add(currentYear + 1);
  return [...ys].sort();
}

function yearBreakdown(birthDate: string, aspects: AspectId[], year: number): string {
  const ids = aspects.length ? aspects : ASPECTS.map((a) => a.id);
  return ids
    .map((id) => {
      const meta = ASPECTS.find((a) => a.id === id)!;
      const d = aspectScoreDetail(birthDate, id, year);
      const [first, second] = [d.personalYear, d.branch, d.rhythm].sort(
        (x, y) => Math.abs(y.points) - Math.abs(x.points)
      );
      const fmt = (v: { label: string; points: number }) =>
        `${v.label.toLowerCase()} (${v.points > 0 ? "+" : ""}${v.points} pts)`;
      return `- **${meta.name}: ${d.value}/100** — driven by ${fmt(first)}, then ${fmt(second)}.`;
    })
    .join("\n");
}

export function answerFollowUp(profile: Profile, question: string, ctx: DivinationContext): string {
  const bd = profile.birthDate;
  const yearNow = ctx.currentYear;
  const aspects = detectAspects(question);
  const years = detectYears(question, yearNow);
  const isTiming = /\bwhen\b|best time|good time|right time|window|which year|what year|timing/i.test(question);
  const horizonEnd = yearNow + 9;

  // fresh cast for this specific question — the symbolic voice stays present
  const cast = castHexagram(question, new Date());
  const castLine = `*For this question the coins give **#${cast.primary.number} ${cast.primary.english}** — ${cast.primary.theme}${cast.resulting ? `, turning toward **${cast.resulting.english}**` : ""}.*`;

  // ---- timing questions: find the window --------------------------------
  if (isTiming) {
    const targets = aspects.length ? aspects : (["career"] as AspectId[]);
    const meta = ASPECTS.find((a) => a.id === targets[0])!;
    const pts = transitionPoints(bd, targets, yearNow, horizonEnd);
    const peak = pts.find((p) => p.kind === "peak" && p.aspect === targets[0]);
    const surge = pts.find((p) => p.kind === "surge" && p.aspect === targets[0]);
    const lowsBefore = pts.filter(
      (p) => (p.kind === "trough" || p.kind === "threshold") && peak && p.year < peak.year
    );

    const prep = surge && peak && surge.year < peak.year ? surge.year : peak ? peak.year - 1 : yearNow;
    return `### Timing for ${meta.name.toLowerCase()}

${castLine}

The most supportive window ahead is **${peak?.year}**${num(peak?.value)} — ${peak?.why}. Momentum starts building from **${prep}**, which is your positioning year: quiet groundwork then, visible moves in ${peak?.year}.

${yearBreakdown(bd, targets, peak?.year ?? yearNow)}

${chartFence(targets, yearNow, horizonEnd, `${meta.name} — the road to ${peak?.year}`)}

${lowsBefore.length ? `**On the way there:** ${lowsBefore.map((p) => `${p.year} — ${p.title.replace(/\s*\(.*\)/, "").toLowerCase()}`).join("; ")}. Use ${lowsBefore.length > 1 ? "these years" : "this year"} for preparation, saving and skill-building rather than launches.` : `The road to ${peak?.year} is fairly clear — steady building is enough.`}

### How to use this window

- **Before ${peak?.year}:** clear debts of time and money; line up allies and credentials in the cooperative years.
- **In ${peak?.year}:** make the move visible — negotiate, launch, commit. ${KIND_HINT[personalYear(bd, peak?.year ?? yearNow)]}
- **After:** consolidate quickly; don't stack a second leap onto the first without a pause.

> Weather, not verdicts — the window favors you, it doesn't replace preparation.`;
  }

  // ---- specific-year questions ------------------------------------------
  if (years.length) {
    const y = years[0];
    const targets = aspects.length ? aspects : [];
    const pts = transitionPoints(bd, targets, y - 1, y + 1).filter((p) => p.year === y);
    const natal = birthPillar(bd);
    const rel = branchRelation(natal.year, y);
    const py = personalYear(bd, y);
    return `### The year ${y}, read closely

${castLine}

${y} is a **${yearPillar(y).label}** year for you — ${RELATION_NOTES[rel]}. In your nine-year rhythm it is **personal year ${py}**: ${PERSONAL_YEAR_THEMES[py]}.

${yearBreakdown(bd, targets, y)}

${pts.length ? `**Transition markers that land in ${y}:** ${pts.map((p) => `${p.title.toLowerCase()} (${p.why})`).join("; ")}.` : ""}

${chartFence(targets, Math.max(yearNow, y - 3), y + 3, `Around ${y}`)}

${factorBlock(bd, targets, y, y + 1, yearNow)}

> Hold ${y} lightly: these are the tides beneath it — your choices remain the boat.`;
  }

  // ---- aspect deep-dive ---------------------------------------------------
  if (aspects.length) {
    const id = aspects[0];
    const meta = ASPECTS.find((a) => a.id === id)!;
    const nowD = aspectScoreDetail(bd, id, yearNow);
    const pts = transitionPoints(bd, [id], yearNow, horizonEnd);
    const peak = pts.find((p) => p.kind === "peak");
    const trough = pts.find((p) => p.kind === "trough");
    return `### ${meta.name}: a closer reading

${castLine}

Right now this aspect stands at **${nowD.value}/100** — ${nowD.dominant}. Ahead of you: the most supportive year is **${peak?.year}**${num(peak?.value)}, and the deepest consolidation year is **${trough?.year}**${num(trough?.value)}.

${chartFence([id], yearNow, horizonEnd, `${meta.name}, ${yearNow}–${horizonEnd}`)}

${factorBlock(bd, [id], yearNow, horizonEnd, yearNow)}

### Next steps

- Plan your boldest ${meta.name.toLowerCase()} move for **${peak?.year}**, and use the year before it to position.
- Book ${trough?.year} in advance as a maintenance year — repair, learn, save.
- Ask me about a specific year on this curve and I will unpack its forces.

> Weather, not verdicts.`;
  }

  // ---- general follow-up ---------------------------------------------------
  const km = keyMoments(bd, yearNow, horizonEnd);
  const bestPeak = [...km.peaks].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
  return `### Reading your question

${castLine}

Your question doesn't name an aspect, so let me answer with the strongest signals in your ten-year map:

- The single most supportive window ahead is **${bestPeak?.year} for ${bestPeak?.aspectName}**${num(bestPeak?.value)} — ${bestPeak?.why}.
${km.thresholds.length ? `- The years asking the most care are **${km.thresholds.map((t) => t.year).join(" and ")}** (${km.thresholds[0].title.toLowerCase()}) — deliberate movement only.` : ""}
- You are in **personal year ${ctx.personalYearNow}** now: ${ctx.personalYearNote}.

${factorBlock(bd, [], yearNow, horizonEnd, yearNow)}

If you tell me which aspect of life your question lives in — career, wealth, relationships, health or growth — or name a year, I can read it much more closely.

> Weather, not verdicts.`;
}

// small per-personal-year action hint used in timing answers
const KIND_HINT: Record<number, string> = {
  1: "A seeding year — beginnings carry extra weight.",
  2: "Bring a partner or ally into the move.",
  3: "Make it public — visibility multiplies this year.",
  4: "Structure the move well; contracts and details reward care.",
  5: "Stay flexible — the shape of the opportunity may shift mid-move.",
  6: "Balance the move against home commitments explicitly.",
  7: "Pair the move with study or certification for depth.",
  8: "Negotiate hard — this year respects ambition.",
  9: "Let something end cleanly to make room for it.",
};
