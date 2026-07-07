/**
 * Builds the divination context shared by the AI oracle (as system-prompt
 * grounding) and the offline "Inner Compass" demo reading.
 */

import { ASPECTS, Profile } from "../types";
import { castHexagram, Cast } from "./iching";
import { birthPillar, branchRelation, RELATION_NOTES, yearPillar, YearPillar } from "./bazi";
import { numerologyProfile, lifePathTheme, PERSONAL_YEAR_THEMES, personalYear } from "./numerology";
import { aspectScore, highlights } from "./cycles";

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
  const hl = highlights(profile.birthDate, start, end);

  const lines: string[] = [];
  for (const a of ASPECTS) {
    const peak = hl.find((h) => h.aspect === a.id && h.kind === "peak")!;
    const low = hl.find((h) => h.aspect === a.id && h.kind === "threshold")!;
    const nowScore = aspectScore(profile.birthDate, a.id, currentYear);
    lines.push(
      `${a.name}: now ${nowScore}/100; most supportive ${peak.year} (${peak.score}); threshold year ${low.year} (${low.score})`
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

/** Offline reading used when no ANTHROPIC_API_KEY is configured. */
export function localReading(profile: Profile, question: string, ctx: DivinationContext): string {
  const c = ctx.cast;
  const name = profile.name ? `, ${profile.name}` : "";
  const changingText = c.changingLines.length
    ? `Line${c.changingLines.length > 1 ? "s" : ""} ${c.changingLines.join(" and ")} ${c.changingLines.length > 1 ? "are" : "is"} in motion: the situation is not fixed. It is turning toward **#${c.resulting!.number} ${c.resulting!.english}** — ${c.resulting!.theme}. Hold your question lightly; what feels solid today is already becoming something else.`
    : `No lines are changing: the image is settled. This is less about transformation and more about inhabiting the present pattern fully.`;

  const py = ctx.personalYearNow;
  const nextThree = [1, 2, 3]
    .map((i) => {
      const y = ctx.currentYear + i;
      const p = personalYear(profile.birthDate, y);
      return `- **${y}** — personal year ${p}: ${PERSONAL_YEAR_THEMES[p]}`;
    })
    .join("\n");

  return `### The moment of your asking

Welcome${name}. I listened to your question through two lenses at once — the symbolic and the systematic — so you can *feel* the moment and also *see* its shape.

For this consultation the coins fell into **Hexagram #${c.primary.number} ${c.primary.chinese} (${c.primary.pinyin}) — ${c.primary.english}**: ${c.primary.theme}.

${changingText}

### Where you stand in your cycles

You were born under the **${ctx.natal.label}** pillar, and ${ctx.currentYear} is a **${ctx.current.label}** year — ${ctx.relationNote}.

Your life path number is **${ctx.lifePath}** (${ctx.lifePathNote}), and you are moving through **personal year ${py}**: ${PERSONAL_YEAR_THEMES[py]}.

The next three years, in the nine-year rhythm:

${nextThree}

### The systematic view

Below is your ten-year transit map — the same cycles rendered as curves, so supportive windows and threshold years are visible at a glance. Rising curves mark seasons to initiate and expand; dips are not misfortune, but seasons that reward consolidation, patience and care.

\`\`\`chart
{"kind":"transit","title":"Ten-year life transit map","startYear":${ctx.currentYear},"endYear":${ctx.currentYear + 9}}
\`\`\`

### A gentle synthesis

Take the hexagram as the *quality* of this moment and the curves as its *terrain*. Neither is a verdict — both are weather reports. Plan bold beginnings into the rising seasons, schedule rest and repair into the low ones, and let threshold years (especially any clash or own-sign year) be years of deliberate, well-prepared movement rather than sudden leaps.

*Ask me about any aspect — career, wealth, relationships, health, growth — or any specific year on the map, and we will look closer together.*

> This guidance is reflective, not predictive. It is meant to help you think clearly and act kindly toward your own future — important decisions deserve professional advice as well.

*(Offline Inner Compass mode: set ANTHROPIC_API_KEY to consult the full AI oracle.)*`;
}
