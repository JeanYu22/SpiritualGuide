/**
 * Life-transit model: blends three deterministic cycles into a yearly
 * "supportiveness" score (0-100) per life aspect —
 *
 *   1. the numerological nine-year personal cycle (seed → harvest → release)
 *   2. the twelve-year earthly-branch cycle (trine / clash / combine / harm)
 *   3. a seven-year renewal rhythm anchored to age
 *
 * The output is a smooth, reproducible curve: the "systematic" lens the app
 * pairs with the oracle's interpretive reading. It highlights supportive
 * windows and threshold years rather than predicting events.
 */

import { ASPECTS, AspectId, TransitSeries } from "../types";
import { personalYear } from "./numerology";
import { branchRelation, BranchRelation, effectiveYear } from "./bazi";
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

// how strongly each aspect feels the branch relation, in [-1, 1]
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

function sevenYearPhase(age: number, offset: number): number {
  // gentle sine over a 7-year renewal rhythm, aspect-shifted
  return Math.sin(((age + offset) / 7) * Math.PI * 2) * 0.5;
}

const SEVEN_OFFSET: Record<AspectId, number> = {
  career: 0,
  wealth: 1.5,
  relationships: 3,
  health: 4.5,
  growth: 6,
};

export function aspectScore(birthDate: string, aspect: AspectId, year: number): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const natalYear = effectiveYear(new Date(by, bm - 1, bd));
  const age = year - by;

  const py = personalYear(birthDate, year);
  const a = PY_AFFINITY[aspect][py - 1]; // [-0.5, 1]

  const rel = branchRelation(natalYear, year);
  const r = RELATION_VALUE[rel] * RELATION_WEIGHT[aspect];

  const s = sevenYearPhase(age, SEVEN_OFFSET[aspect]);

  // a small stable personal harmonic so two people born a day apart differ
  const rnd = mulberry32(hashString(`${birthDate}|${aspect}`));
  const phase = rnd() * Math.PI * 2;
  const p = Math.sin((year / 4.2) * Math.PI * 2 + phase) * 0.18;

  // weighted blend -> 0-100
  const raw = a * 0.42 + r * 0.33 + s * 0.18 + p * 0.07;
  const score = 50 + raw * 45;
  return Math.round(Math.min(96, Math.max(6, score)) * 10) / 10;
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

export interface YearHighlight {
  year: number;
  aspect: AspectId;
  kind: "peak" | "threshold";
  score: number;
}

/** Best supportive window and most demanding threshold per aspect in a range. */
export function highlights(
  birthDate: string,
  startYear: number,
  endYear: number
): YearHighlight[] {
  const out: YearHighlight[] = [];
  for (const a of ASPECTS) {
    let best = { year: startYear, score: -1 };
    let worst = { year: startYear, score: 101 };
    for (let y = startYear; y <= endYear; y++) {
      const s = aspectScore(birthDate, a.id, y);
      if (s > best.score) best = { year: y, score: s };
      if (s < worst.score) worst = { year: y, score: s };
    }
    out.push({ year: best.year, aspect: a.id, kind: "peak", score: best.score });
    out.push({ year: worst.year, aspect: a.id, kind: "threshold", score: worst.score });
  }
  return out;
}
