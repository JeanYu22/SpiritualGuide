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

// Traditional-Chinese life-path and personal-year themes
export const LIFE_PATH_THEMES_ZH: Record<number, string> = {
  1: "獨立、開拓、自我定義",
  2: "合作、圓融、細膩體察",
  3: "表達、創造、溝通",
  4: "結構、堅忍、奠定根基",
  5: "自由、變化、多元歷練",
  6: "關懷、責任、家的和諧",
  7: "探問、內省、內在的洞見",
  8: "抱負、掌理權力與資源",
  9: "圓成、慈悲、服務眾生",
  11: "直覺、啟發、照亮他人",
  22: "大匠築夢，化宏願為現實",
  33: "大師之師，以奉獻療癒",
};

export const PERSONAL_YEAR_THEMES_ZH: Record<number, string> = {
  1: "播種——啟始開創，種下往後九年將生長的種子",
  2: "萌芽——耐心、結盟，靜靜醞釀",
  3: "抽長——表達、嶄露，創意舒展",
  4: "扎根——勤懇、有序，奠定根基與作息",
  5: "分枝——變動、遊走，自由與冒險",
  6: "開花——責任、家庭，調和各方承諾",
  7: "成熟——沉潛進修，向內校準",
  8: "收成——權力、財務，成果與肯定",
  9: "化育——放下、寬宥，清出迎新的空間",
};

/** Short keyword (the part before "——") for a personal year, in Traditional Chinese. */
export const PERSONAL_YEAR_WORD_ZH: Record<number, string> = {
  1: "播種",
  2: "萌芽",
  3: "抽長",
  4: "扎根",
  5: "分枝",
  6: "開花",
  7: "成熟",
  8: "收成",
  9: "化育",
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

export function lifePathThemeZh(n: number): string {
  return LIFE_PATH_THEMES_ZH[n] ?? LIFE_PATH_THEMES_ZH[reduce(n, false)];
}
