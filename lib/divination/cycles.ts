/**
 * Life-transit model: blends three deterministic cycles into a yearly
 * "supportiveness" score (0-100) per life aspect —
 *
 *   1. the numerological nine-year personal cycle (seed → harvest → release)
 *   2. the twelve-year earthly-branch cycle (trine / clash / combine / harm)
 *   3. a seven-year renewal rhythm anchored to age
 *
 * Every score is explainable: `aspectScoreDetail` exposes how much each cycle
 * contributes to a given year, and `transitionPoints` finds the critical
 * turning points (peaks, troughs, surges, threshold years) with a plain
 * "what / why / how to use it" narrative for each.
 */

import { ASPECTS, AspectId, TransitSeries } from "../types";
import { personalYear, PERSONAL_YEAR_THEMES } from "./numerology";
import { branchRelation, BranchRelation, effectiveYear, RELATION_NOTES, yearPillar } from "./bazi";
import { hashString, mulberry32 } from "./iching";

// affinity of each aspect with each personal year number (1-9), in [-1, 1]
const PY_AFFINITY: Record<AspectId, number[]> = {
  //            PY:  1     2     3     4     5     6     7     8     9
  career: /*    */ [0.9, 0.1, 0.4, 0.5, 0.3, 0.0, -0.2, 1.0, -0.5],
  wealth: /*    */ [0.4, 0.0, 0.2, 0.6, -0.1, 0.2, -0.3, 1.0, -0.4],
  relationships: [0.1, 0.9, 0.5, -0.1, 0.2, 1.0, -0.3, 0.1, -0.2],
  health: /*    */ [0.5, 0.2, 0.0, 0.8, -0.3, 0.3, 0.6, -0.2, 0.1],
  growth: /*    */ [0.6, 0.3, 0.7, 0.1, 0.5, 0.0, 1.0, 0.2, 0.4],
};

// how strongly each aspect feels the branch relation, in [0, 1]
const RELATION_VALUE: Record<BranchRelation, number> = {
  self: -0.55,
  trine: 0.8,
  clash: -0.7,
  harm: -0.35,
  combine: 0.6,
  neutral: 0.05,
};

const RELATION_WEIGHT: Record<AspectId, number> = {
  career: 0.9,
  wealth: 0.8,
  relationships: 1.0,
  health: 0.7,
  growth: 0.5,
};

const SEVEN_OFFSET: Record<AspectId, number> = {
  career: 0,
  wealth: 1.5,
  relationships: 3,
  health: 4.5,
  growth: 6,
};

function sevenYearPhase(age: number, offset: number): number {
  return Math.sin(((age + offset) / 7) * Math.PI * 2) * 0.5;
}

export interface DriverDetail {
  /** contribution of this driver to the final 0-100 score (signed points) */
  points: number;
  label: string;
}

export interface ScoreDetail {
  year: number;
  aspect: AspectId;
  value: number;
  personalYear: DriverDetail & { number: number };
  branch: DriverDetail & { relation: BranchRelation };
  rhythm: DriverDetail;
  /** one-line explanation of the strongest force this year */
  dominant: string;
}

export function aspectScoreDetail(birthDate: string, aspect: AspectId, year: number): ScoreDetail {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const natalYear = effectiveYear(new Date(by, bm - 1, bd));
  const age = year - by;

  const py = personalYear(birthDate, year);
  const a = PY_AFFINITY[aspect][py - 1];

  const rel = branchRelation(natalYear, year);
  const r = RELATION_VALUE[rel] * RELATION_WEIGHT[aspect];

  const s = sevenYearPhase(age, SEVEN_OFFSET[aspect]);

  // a small stable personal harmonic so two people born a day apart differ
  const rnd = mulberry32(hashString(`${birthDate}|${aspect}`));
  const phase = rnd() * Math.PI * 2;
  const p = Math.sin((year / 4.2) * Math.PI * 2 + phase) * 0.18;

  const pyPts = a * 0.42 * 45;
  const brPts = r * 0.33 * 45;
  const ryPts = (s * 0.18 + p * 0.07) * 45;
  const score = Math.round(Math.min(96, Math.max(6, 50 + pyPts + brPts + ryPts)));

  const pillar = yearPillar(year);
  const pyTheme = PERSONAL_YEAR_THEMES[py].split(" — ")[0];
  const drivers = [
    {
      key: "py",
      pts: pyPts,
      line: `personal year ${py} (${pyTheme}) ${pyPts >= 0 ? "lifts" : "asks patience of"} this aspect`,
    },
    {
      key: "br",
      pts: brPts,
      line: `${pillar.animal} year: ${RELATION_NOTES[rel].split(" — ")[0]}`,
    },
    { key: "ry", pts: ryPts, line: `the seven-year body-and-energy rhythm runs ${ryPts >= 0 ? "high" : "low"}` },
  ].sort((x, y) => Math.abs(y.pts) - Math.abs(x.pts));

  return {
    year,
    aspect,
    value: score,
    personalYear: {
      number: py,
      points: Math.round(pyPts),
      label: `Personal year ${py} — ${pyTheme}`,
    },
    branch: {
      relation: rel,
      points: Math.round(brPts),
      label: `${pillar.animal} year — ${rel === "neutral" ? "neutral to your sign" : RELATION_NOTES[rel].split(" — ")[0]}`,
    },
    rhythm: {
      points: Math.round(ryPts),
      label: `Seven-year rhythm ${ryPts >= 0 ? "rising" : "resting"}`,
    },
    dominant: drivers[0].line,
  };
}

export function aspectScore(birthDate: string, aspect: AspectId, year: number): number {
  return aspectScoreDetail(birthDate, aspect, year).value;
}

export function transitSeries(
  birthDate: string,
  aspects: AspectId[],
  startYear: number,
  endYear: number
): TransitSeries[] {
  const ids = aspects.length ? aspects : ASPECTS.map((a) => a.id);
  return ids
    .map((id) => ASPECTS.find((a) => a.id === id))
    .filter((a): a is (typeof ASPECTS)[number] => Boolean(a))
    .map((a) => ({
      aspect: a.id,
      name: a.name,
      slot: a.slot,
      points: Array.from({ length: endYear - startYear + 1 }, (_, i) => ({
        year: startYear + i,
        value: aspectScore(birthDate, a.id, startYear + i),
      })),
    }));
}

/* ------------------------------------------------------------------ */
/* Critical transition points                                          */
/* ------------------------------------------------------------------ */

export type TransitionKind = "peak" | "trough" | "surge" | "drop" | "threshold";

export interface TransitionPoint {
  year: number;
  /** null = a whole-life threshold year (affects every aspect) */
  aspect: AspectId | null;
  aspectName?: string;
  slot?: number;
  kind: TransitionKind;
  value?: number;
  title: string;
  why: string;
  advice: string;
}

const KIND_TITLE: Record<Exclude<TransitionKind, "threshold">, string> = {
  peak: "Supportive window",
  trough: "Consolidation year",
  surge: "Momentum turns upward",
  drop: "The tide turns",
};

const KIND_ADVICE: Record<Exclude<TransitionKind, "threshold">, string> = {
  peak: "Act here: launch, commit, negotiate, expand. Prepare in the year before so you arrive ready.",
  trough: "Not misfortune — a season to consolidate. Repair, rest, study, save; avoid forcing big leaps.",
  surge: "Start positioning now: groundwork laid in this year compounds through the rise that follows.",
  drop: "Finish and secure what matters before this year; enter it with reserves and flexible plans.",
};

function whyFor(detail: ScoreDetail): string {
  const parts: string[] = [];
  if (Math.abs(detail.personalYear.points) >= 4) {
    parts.push(detail.personalYear.label.toLowerCase());
  }
  if (Math.abs(detail.branch.points) >= 4) {
    parts.push(detail.branch.label.toLowerCase());
  }
  if (parts.length === 0) parts.push(detail.rhythm.label.toLowerCase());
  return parts.join("; ");
}

/**
 * Finds the critical transition points for the given aspects and range:
 * per-aspect local peaks/troughs and the steepest rises/falls, plus
 * whole-life threshold years (own-sign and clash years).
 */
export function transitionPoints(
  birthDate: string,
  aspects: AspectId[],
  startYear: number,
  endYear: number
): TransitionPoint[] {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const natalYear = effectiveYear(new Date(by, bm - 1, bd));
  const out: TransitionPoint[] = [];
  const ids = aspects.length ? aspects : ASPECTS.map((a) => a.id);

  for (const id of ids) {
    const meta = ASPECTS.find((a) => a.id === id);
    if (!meta) continue;
    const details = Array.from({ length: endYear - startYear + 1 }, (_, i) =>
      aspectScoreDetail(birthDate, id, startYear + i)
    );
    const values = details.map((d) => d.value);

    let peakI = 0;
    let troughI = 0;
    values.forEach((v, i) => {
      if (v > values[peakI]) peakI = i;
      if (v < values[troughI]) troughI = i;
    });

    let surgeI = -1;
    let dropI = -1;
    for (let i = 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      if (d >= 12 && (surgeI < 0 || d > values[surgeI] - values[surgeI - 1])) surgeI = i;
      if (d <= -12 && (dropI < 0 || d < values[dropI] - values[dropI - 1])) dropI = i;
    }

    const used = new Set<number>();
    const push = (i: number, kind: Exclude<TransitionKind, "threshold">) => {
      if (i < 0 || used.has(i)) return;
      used.add(i);
      const det = details[i];
      out.push({
        year: det.year,
        aspect: id,
        aspectName: meta.name,
        slot: meta.slot,
        kind,
        value: det.value,
        title: `${KIND_TITLE[kind]} — ${meta.name}`,
        why: whyFor(det),
        advice: KIND_ADVICE[kind],
      });
    };
    push(peakI, "peak");
    push(troughI, "trough");
    push(surgeI - 1, "surge"); // mark the year *before* the jump — where positioning happens
    push(dropI - 1, "drop");
  }

  // whole-life threshold years: own-sign and clash years touch every aspect
  for (let y = startYear; y <= endYear; y++) {
    const rel = branchRelation(natalYear, y);
    if (rel === "self" || rel === "clash") {
      const pillar = yearPillar(y);
      out.push({
        year: y,
        aspect: null,
        kind: "threshold",
        title: rel === "self" ? `Own-sign year (${pillar.animal})` : `Clash year (${pillar.animal})`,
        why: RELATION_NOTES[rel],
        advice:
          rel === "self"
            ? "A threshold across all aspects: keep commitments deliberate, foundations tended, and changes well-prepared rather than impulsive."
            : "Friction touches every aspect this year. Choose your changes early and lead them yourself — movement you initiate goes far better than movement forced on you.",
      });
    }
  }

  return out.sort((a, b) => a.year - b.year);
}

/** Convenience: the strongest opportunities and demands in a range, for readings. */
export function keyMoments(birthDate: string, startYear: number, endYear: number) {
  const pts = transitionPoints(birthDate, [], startYear, endYear);
  return {
    peaks: pts.filter((p) => p.kind === "peak"),
    troughs: pts.filter((p) => p.kind === "trough"),
    thresholds: pts.filter((p) => p.kind === "threshold"),
  };
}
