/**
 * Chinese year-pillar engine (BaZi-lite): heavenly stem, earthly branch,
 * element, polarity and zodiac animal for the birth year, plus the annual
 * relationship between a natal branch and any calendar year — the backbone
 * of the 12-year transit cycle.
 */

export type Element = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export interface YearPillar {
  year: number;
  stem: string;
  branch: string;
  animal: string;
  element: Element;
  yin: boolean;
  label: string; // e.g. "Yang Wood Rat (甲子)"
}

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEMENTS: Element[] = [
  "Wood", "Wood", "Fire", "Fire", "Earth", "Earth", "Metal", "Metal", "Water", "Water",
];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ANIMALS = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
];

/**
 * Effective Chinese solar year: years begin around Feb 4 (Li Chun).
 * Dates before Feb 4 belong to the previous year's pillar.
 */
export function effectiveYear(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return m < 2 || (m === 2 && d < 4) ? y - 1 : y;
}

export function yearPillar(year: number): YearPillar {
  const stemIdx = (((year - 4) % 10) + 10) % 10;
  const branchIdx = (((year - 4) % 12) + 12) % 12;
  const yin = stemIdx % 2 === 1;
  return {
    year,
    stem: STEMS[stemIdx],
    branch: BRANCHES[branchIdx],
    animal: ANIMALS[branchIdx],
    element: STEM_ELEMENTS[stemIdx],
    yin,
    label: `${yin ? "Yin" : "Yang"} ${STEM_ELEMENTS[stemIdx]} ${ANIMALS[branchIdx]} (${STEMS[stemIdx]}${BRANCHES[branchIdx]})`,
  };
}

export function birthPillar(birthDate: string): YearPillar {
  const [y, m, d] = birthDate.split("-").map(Number);
  return yearPillar(effectiveYear(new Date(y, m - 1, d)));
}

export type BranchRelation =
  | "self" // same branch: Ben Ming Nian — a threshold year, take extra care
  | "trine" // +4 / +8: the harmony triangle, supportive flow
  | "clash" // +6: opposition, friction that forces movement
  | "harm" // six-harm pairs: subtle undermining, mind relationships
  | "combine" // six-combination pairs: alliance, help arrives
  | "neutral";

const SIX_COMBINE: [number, number][] = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
const SIX_HARM: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

export function branchRelation(natalYear: number, transitYear: number): BranchRelation {
  const a = (((natalYear - 4) % 12) + 12) % 12;
  const b = (((transitYear - 4) % 12) + 12) % 12;
  if (a === b) return "self";
  const diff = (b - a + 12) % 12;
  if (diff === 4 || diff === 8) return "trine";
  if (diff === 6) return "clash";
  if (SIX_COMBINE.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return "combine";
  if (SIX_HARM.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return "harm";
  return "neutral";
}

export const RELATION_NOTES: Record<BranchRelation, string> = {
  self: "your own sign returns (Ben Ming Nian) — a threshold year; move deliberately and protect your foundations",
  trine: "harmony-triangle year — allies and opportunities flow toward you more easily",
  clash: "clash year — friction that forces movement; plan changes rather than having them forced",
  harm: "subtle-friction year — mind misunderstandings and quiet erosion in relationships",
  combine: "combination year — cooperation is favored; help arrives through partnership",
  neutral: "a neutral year — outcomes follow effort more than weather",
};
