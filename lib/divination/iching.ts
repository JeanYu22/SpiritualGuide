/**
 * I-Ching engine: casts a hexagram deterministically from a seed built out of
 * the question text and the moment of asking, then resolves it to the King Wen
 * sequence, including changing lines and the resulting (transformed) hexagram.
 */

export interface Hexagram {
  number: number;
  chinese: string;
  pinyin: string;
  english: string;
  theme: string;
  themeZh: string;
}

export interface Cast {
  /** six lines bottom-to-top; 6 = old yin, 7 = young yang, 8 = young yin, 9 = old yang */
  lines: number[];
  primary: Hexagram;
  changingLines: number[]; // 1-based positions, bottom-to-top
  resulting?: Hexagram;
}

// name data in King Wen order (1..64)
const H: [string, string, string, string][] = [
  ["乾", "Qián", "The Creative", "initiative, creative force, leading with clarity"],
  ["坤", "Kūn", "The Receptive", "receptivity, devotion, supporting what grows"],
  ["屯", "Zhūn", "Difficulty at the Beginning", "early struggle that precedes growth"],
  ["蒙", "Méng", "Youthful Folly", "learning humbly, seeking guidance"],
  ["需", "Xū", "Waiting", "patient timing, nourishing while you wait"],
  ["訟", "Sòng", "Conflict", "tension to resolve, avoid escalation"],
  ["師", "Shī", "The Army", "discipline, organized collective effort"],
  ["比", "Bǐ", "Holding Together", "alliance, belonging, choosing your people"],
  ["小畜", "Xiǎo Chù", "Small Taming", "small restraints, gentle accumulation"],
  ["履", "Lǚ", "Treading", "careful conduct in delicate situations"],
  ["泰", "Tài", "Peace", "harmony, flow, favorable exchange"],
  ["否", "Pǐ", "Standstill", "stagnation, withdraw and preserve integrity"],
  ["同人", "Tóng Rén", "Fellowship", "community, shared purpose"],
  ["大有", "Dà Yǒu", "Great Possession", "abundance carried with modesty"],
  ["謙", "Qiān", "Modesty", "humility that quietly succeeds"],
  ["豫", "Yù", "Enthusiasm", "momentum, inspiring readiness"],
  ["隨", "Suí", "Following", "adapting, joining the right current"],
  ["蠱", "Gǔ", "Work on the Decayed", "repairing what was neglected"],
  ["臨", "Lín", "Approach", "advancing goodwill, a favorable window"],
  ["觀", "Guān", "Contemplation", "observing deeply before acting"],
  ["噬嗑", "Shì Kè", "Biting Through", "decisive resolution of an obstacle"],
  ["賁", "Bì", "Grace", "form and beauty, refine the surface honestly"],
  ["剝", "Bō", "Splitting Apart", "erosion, let go of the unsound"],
  ["復", "Fù", "Return", "the turning point, renewal begins"],
  ["無妄", "Wú Wàng", "Innocence", "act without ulterior motive"],
  ["大畜", "Dà Chù", "Great Taming", "storing power, disciplined potential"],
  ["頤", "Yí", "Nourishment", "mind what you feed body and mind"],
  ["大過", "Dà Guò", "Great Excess", "extraordinary pressure, act with courage"],
  ["坎", "Kǎn", "The Abysmal Water", "danger navigated by sincerity"],
  ["離", "Lí", "The Clinging Fire", "clarity, illumination, dependence on light"],
  ["咸", "Xián", "Influence", "attraction, mutual responsiveness"],
  ["恆", "Héng", "Duration", "endurance, consistent commitment"],
  ["遯", "Dùn", "Retreat", "strategic withdrawal at the right time"],
  ["大壯", "Dà Zhuàng", "Great Power", "strength governed by what is right"],
  ["晉", "Jìn", "Progress", "advancing recognition, rising light"],
  ["明夷", "Míng Yí", "Darkening of the Light", "protect your light in adversity"],
  ["家人", "Jiā Rén", "The Family", "roles, warmth, order at home"],
  ["睽", "Kuí", "Opposition", "estrangement, seek small alignments"],
  ["蹇", "Jiǎn", "Obstruction", "obstacles, pause and gather allies"],
  ["解", "Xiè", "Deliverance", "release, forgiveness, tension dissolving"],
  ["損", "Sǔn", "Decrease", "simplifying, giving up the lesser"],
  ["益", "Yì", "Increase", "expansion, generosity multiplies"],
  ["夬", "Guài", "Breakthrough", "resolute declaration, expose what's false"],
  ["姤", "Gòu", "Coming to Meet", "an unexpected encounter, stay discerning"],
  ["萃", "Cuì", "Gathering Together", "convergence, collect around a center"],
  ["升", "Shēng", "Pushing Upward", "steady ascent through effort"],
  ["困", "Kùn", "Oppression", "exhaustion, conserve and keep faith"],
  ["井", "Jǐng", "The Well", "shared resources, tend the source"],
  ["革", "Gé", "Revolution", "molting, deliberate transformation"],
  ["鼎", "Dǐng", "The Cauldron", "nourishing culture, refining value"],
  ["震", "Zhèn", "The Arousing Thunder", "shock that wakens, keep composure"],
  ["艮", "Gèn", "Keeping Still", "stillness, knowing where to stop"],
  ["漸", "Jiàn", "Development", "gradual progress, step by step"],
  ["歸妹", "Guī Mèi", "The Marrying Maiden", "entering bonds, mind the terms"],
  ["豐", "Fēng", "Abundance", "zenith of fullness, act while it lasts"],
  ["旅", "Lǚ", "The Wanderer", "transition, travel light and courteous"],
  ["巽", "Xùn", "The Gentle Wind", "penetrating influence, subtle persistence"],
  ["兌", "Duì", "The Joyous Lake", "joy, open exchange, encouragement"],
  ["渙", "Huàn", "Dispersion", "dissolving rigidity, reuniting the scattered"],
  ["節", "Jié", "Limitation", "healthy limits, measured rhythm"],
  ["中孚", "Zhōng Fú", "Inner Truth", "sincerity that reaches others"],
  ["小過", "Xiǎo Guò", "Small Excess", "small deeds, stay modest in transition"],
  ["既濟", "Jì Jì", "After Completion", "completion, guard the details"],
  ["未濟", "Wèi Jì", "Before Completion", "the threshold, order before the crossing"],
];

// Traditional-Chinese theme for each hexagram, King Wen order (1..64)
const THEME_ZH: string[] = [
  "創始的力量，以清明領導、開創新局", // 1 乾
  "柔順承載，以厚德滋養所生", // 2 坤
  "草創維艱，是成長之前的積蓄", // 3 屯
  "謙卑受教，其要在於尋求指引", // 4 蒙
  "靜候時機，於等待中養精蓄銳", // 5 需
  "爭訟宜解，切莫激化衝突", // 6 訟
  "紀律與組織，眾志同行", // 7 師
  "親比相輔，擇善而從、歸屬有依", // 8 比
  "小有蓄積，以柔緩緩積累", // 9 小畜
  "臨淵履薄，於微妙處謹慎而行", // 10 履
  "天地交泰，和暢通達", // 11 泰
  "閉塞不通，退守以全其正", // 12 否
  "與人和同，志同道合", // 13 同人
  "大有豐盛，盈而能謙", // 14 大有
  "謙遜自處，靜默而有成", // 15 謙
  "順勢而動，鼓舞振奮", // 16 豫
  "隨順時勢，順應正道之流", // 17 隨
  "整飭積弊，修復久廢之事", // 18 蠱
  "臨事以誠，善意漸進的良機", // 19 臨
  "靜觀深察，而後有所行", // 20 觀
  "果決排除梗阻，斷然而行", // 21 噬嗑
  "文飾之美，誠實地修其外", // 22 賁
  "剝落侵蝕，捨去不固之物", // 23 剝
  "一陽來復，轉機與更新之始", // 24 復
  "無妄至誠，不懷私心而行", // 25 無妄
  "大有蓄養，蘊蓄而能自律", // 26 大畜
  "頤養之道，慎其所養之身心", // 27 頤
  "非常之時，臨重壓而以勇擔之", // 28 大過
  "重險之水，以誠信涉險", // 29 坎
  "附麗之火，光明而有所依", // 30 離
  "交感相應，兩情相通", // 31 咸
  "恆久如一，持守而不變", // 32 恆
  "見機而退，適時的策略性退避", // 33 遯
  "剛健之力，以正制強", // 34 大壯
  "晉升向上，光明漸盛", // 35 晉
  "明入地中，逆境裡韜光養晦", // 36 明夷
  "家人有序，溫暖而各安其分", // 37 家人
  "睽違乖離，於小處求其同", // 38 睽
  "蹇難險阻，暫止而聚眾", // 39 蹇
  "舒解釋放，寬宥而緊張消融", // 40 解
  "損之又損，捨小以就大", // 41 損
  "增益擴展，慷慨而倍增", // 42 益
  "剛毅決斷，揭破虛偽", // 43 夬
  "不期而遇，仍須保持明辨", // 44 姤
  "萃聚會集，環繞核心而凝聚", // 45 萃
  "積步上升，以恆力漸進", // 46 升
  "困頓受制，養精蓄力而守其信", // 47 困
  "井養不窮，善護共享之源", // 48 井
  "變革除舊，審慎而蛻變", // 49 革
  "鼎新化育，涵養而提煉價值", // 50 鼎
  "震動驚醒，處變而不失其守", // 51 震
  "止而後靜，知所當止", // 52 艮
  "循序漸進，步步為營", // 53 漸
  "締結之際，慎其名分與分際", // 54 歸妹
  "豐盛之極，趁其盛時而為", // 55 豐
  "行旅過渡，輕裝而謙和", // 56 旅
  "巽風入微，柔而能持之以恆", // 57 巽
  "和樂之悅，坦誠交流、彼此鼓舞", // 58 兌
  "化解僵滯，聚合離散", // 59 渙
  "節制有度，張弛得宜", // 60 節
  "中心誠信，誠意感通於人", // 61 中孚
  "小有踰越，過渡中守其謙小", // 62 小過
  "既濟已成，謹守其細節", // 63 既濟
  "將成未成，渡河之前先立其序", // 64 未濟
];

export const HEXAGRAMS: Hexagram[] = H.map(([chinese, pinyin, english, theme], i) => ({
  number: i + 1,
  chinese,
  pinyin,
  english,
  theme,
  themeZh: THEME_ZH[i],
}));

// trigram key: 3 bits, bottom line = least significant bit, yang = 1
// index order used in the King Wen matrix below
const TRIGRAM_ORDER = [0b111, 0b001, 0b010, 0b100, 0b000, 0b110, 0b101, 0b011];
// KING_WEN[lower][upper] with trigram order: Qian Zhen Kan Gen Kun Xun Li Dui
const KING_WEN = [
  [1, 34, 5, 26, 11, 9, 14, 43],
  [25, 51, 3, 27, 24, 42, 21, 17],
  [6, 40, 29, 4, 7, 59, 64, 47],
  [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16, 8, 23, 2, 20, 35, 45],
  [44, 32, 48, 18, 46, 57, 50, 28],
  [13, 55, 63, 22, 36, 37, 30, 49],
  [10, 54, 60, 41, 19, 61, 38, 58],
];

function trigramIndex(bits: number): number {
  return TRIGRAM_ORDER.indexOf(bits);
}

/** lines: 6 booleans bottom-to-top, true = yang */
export function hexagramFromLines(yang: boolean[]): Hexagram {
  const lower = (yang[0] ? 1 : 0) | (yang[1] ? 2 : 0) | (yang[2] ? 4 : 0);
  const upper = (yang[3] ? 1 : 0) | (yang[4] ? 2 : 0) | (yang[5] ? 4 : 0);
  const n = KING_WEN[trigramIndex(lower)][trigramIndex(upper)];
  return HEXAGRAMS[n - 1];
}

/** Small deterministic PRNG (mulberry32) so the same question at the same moment casts the same hexagram. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Three-coin cast: each line sums three coins (heads=3, tails=2) -> 6,7,8,9.
 * Seeded from the question and the moment of asking.
 */
export function castHexagram(question: string, when: Date = new Date()): Cast {
  const seed = hashString(`${question.trim().toLowerCase()}|${Math.floor(when.getTime() / 60000)}`);
  const rnd = mulberry32(seed);
  const lines: number[] = [];
  for (let i = 0; i < 6; i++) {
    let sum = 0;
    for (let c = 0; c < 3; c++) sum += rnd() < 0.5 ? 2 : 3;
    lines.push(sum);
  }
  const primaryYang = lines.map((v) => v === 7 || v === 9);
  const primary = hexagramFromLines(primaryYang);
  const changingLines = lines
    .map((v, i) => (v === 6 || v === 9 ? i + 1 : 0))
    .filter((v) => v > 0);
  let resulting: Hexagram | undefined;
  if (changingLines.length > 0) {
    const transformed = lines.map((v) => (v === 6 ? true : v === 9 ? false : v === 7));
    resulting = hexagramFromLines(transformed);
  }
  return { lines, primary, changingLines, resulting };
}
