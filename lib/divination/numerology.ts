/**
 * Numerology engine: life path number (with master numbers) and the
 * nine-year personal cycle used by the transit model.
 */

export interface NumerologyProfile {
  lifePath: number;
  isMaster: boolean;
  personalYear: number;
}

const LIFE_PATH_THEMES: Record<number, string> = {
  1: "independence, pioneering, self-definition",
  2: "partnership, diplomacy, sensitivity",
  3: "expression, creativity, communication",
  4: "structure, endurance, building foundations",
  5: "freedom, change, versatile experience",
  6: "care, responsibility, harmony at home",
  7: "inquiry, introspection, inner knowledge",
  8: "ambition, stewardship of power and resources",
  9: "completion, compassion, service to the whole",
  11: "intuition, inspiration, illuminating others",
  22: "the master builder, large visions made real",
  33: "the master teacher, healing through devotion",
};

export const PERSONAL_YEAR_THEMES: Record<number, string> = {
  1: "seeding — begin, initiate, plant what the next nine years will grow",
  2: "germination — patience, alliances, quiet development",
  3: "sprouting — expression, visibility, creative expansion",
  4: "rooting — work, order, foundations and health routines",
  5: "branching — change, movement, freedom and risk",
  6: "flowering — duty, family, harmonizing commitments",
  7: "ripening — study, retreat, inner recalibration",
  8: "harvest — power, finances, results and recognition",
  9: "composting — release, forgiveness, clearing for the new",
};

function digitSum(n: number): number {
  let s = 0;
  while (n > 0) {
    s += n % 10;
    n = Math.floor(n / 10);
  }
  return s;
}

function reduce(n: number, keepMasters = true): number {
  while (n > 9) {
    if (keepMasters && (n === 11 || n === 22 || n === 33)) return n;
    n = digitSum(n);
  }
  return n;
}

export function lifePathNumber(birthDate: string): { lifePath: number; isMaster: boolean } {
  const [y, m, d] = birthDate.split("-").map(Number);
  const total = reduce(reduce(y) + reduce(m) + reduce(d));
  return { lifePath: total, isMaster: total > 9 };
}

/** Personal year for a given calendar year (birth month + day + year, reduced 1-9). */
export function personalYear(birthDate: string, year: number): number {
  const [, m, d] = birthDate.split("-").map(Number);
  const n = reduce(reduce(m) + reduce(d) + reduce(year), false);
  return n === 0 ? 9 : n;
}

export function numerologyProfile(birthDate: string, currentYear: number): NumerologyProfile {
  const { lifePath, isMaster } = lifePathNumber(birthDate);
  return { lifePath, isMaster, personalYear: personalYear(birthDate, currentYear) };
}

export function lifePathTheme(n: number): string {
  return LIFE_PATH_THEMES[n] ?? LIFE_PATH_THEMES[reduce(n, false)];
}
