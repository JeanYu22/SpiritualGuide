"use client";

/**
 * Bilingual (English / Traditional Chinese) support.
 *
 * `LangContext` carries the active language; `useLang()` reads it and
 * `useT()` returns the string table for that language. Static UI copy lives
 * in the `EN` / `ZH` tables (same shape, enforced by the `Strings` type).
 * Divination *labels* (aspect names, elements, zodiac animals, cycle themes,
 * branch relations) are translated via helpers that source the shared
 * Traditional-Chinese data living in the divination modules, so the chart,
 * dashboard facts, tooltips and offline readings stay in one voice.
 */

import { createContext, useContext } from "react";
import { ASPECTS, AspectId } from "./types";
import {
  ANIMAL_ZH,
  BranchRelation,
  ELEMENT_ZH,
  RELATION_NOTES_ZH,
} from "./divination/bazi";
import { LIFE_PATH_THEMES_ZH, PERSONAL_YEAR_WORD_ZH } from "./divination/numerology";
import { TransitionKind } from "./divination/cycles";

export type Lang = "en" | "zh";

export const LangContext = createContext<Lang>("en");
export const useLang = () => useContext(LangContext);
export const useT = () => STRINGS[useContext(LangContext)];

/* ------------------------------------------------------------------ */
/* Static UI copy                                                      */
/* ------------------------------------------------------------------ */

interface Strings {
  langName: string;
  tagline: string;
  newSeeker: string;
  themeLabel: string;

  // hero / landing
  heroLead: string;
  heroEm: string;
  heroTail: string;
  heroBody: string;
  lensSymbolTitle: string;
  lensSymbolBody: string;
  lensSystemTitle: string;
  lensSystemBody: string;
  lensCounselTitle: string;
  lensCounselBody: string;
  begin: string;
  beginSub: string;
  disclaimer: string;

  // form
  optional: string;
  fName: string;
  fNamePh: string;
  fDate: string;
  fTime: string;
  fTimeHint: string;
  fPlace: string;
  fPlacePh: string;
  fFocus: string;
  fFocusPh: string;
  openMap: string;

  // dashboard
  lifeMap: string;
  lifeMapSub: string;
  factYearPillar: string;
  factLifePath: string;
  factPersonalYear: (y: number) => string;
  bornOn: (d: string) => string;
  focusMap: string;
  supportRange: (a: number, b: number) => string;
  explainerSummary: string;
  explainerLead: string;
  explainerNine: string;
  explainerTwelve: string;
  explainerSeven: string;
  hexPanelSub: string;

  // hexagram chrome
  hexagram: string;
  changingToward: string;
  changingLine: string;

  // chat
  consult: string;
  consultSub: string;
  oracle: string;
  contemplating: string;
  suggestions: string[];
  askPh: string;
  ask: string;
  hintDefault: string;
  queued: (n: number) => string;
  wavered: string;
  openingWithFocus: (focus: string) => string;
  openingPlain: string;

  // chart
  now: string;
  criticalTransitions: string;
  hoverForAsk: string;
  keyPeak: string;
  keyTrough: string;
  keyThreshold: string;
  focusToSeeTurns: string;
  whyThisLevel: string;
  forcesThisYear: string;
  tenYearMap: string;

  // driver reconstruction
  personalYearWord: (n: number) => string; // "Personal year N — theme"
  sevenRhythm: (rising: boolean) => string;
  neutralToSign: string;
  animalYearSuffix: (animal: string) => string; // "<animal> year"
}

const EN: Strings = {
  langName: "English",
  tagline: "life-transit oracle",
  newSeeker: "New seeker",
  themeLabel: "Toggle theme",

  heroLead: "See the ",
  heroEm: "seasons of your life",
  heroTail: " before you plan them",
  heroBody:
    "An oracle that reads your question through ancient traditions, then maps the same cycles as clear, systematic curves — so you can prepare for the threshold years and act in the supportive ones.",
  lensSymbolTitle: "The symbolic lens",
  lensSymbolBody:
    "I-Ching hexagrams, Chinese year pillars, Vedic rhythm and numerology — the oracle chooses the tradition that fits your question, and tells you why.",
  lensSystemTitle: "The systematic lens",
  lensSystemBody:
    "Your nine-, twelve- and seven-year cycles rendered as transit curves, with every critical transition point marked and explained.",
  lensCounselTitle: "The counsel",
  lensCounselBody:
    "Every reading closes with opportunities, obstacles, supporting resources and watch-outs — and concrete next steps you can plan around.",
  begin: "Begin",
  beginSub: "Your birth data stays in your browser and is used only to compute your reading.",
  disclaimer: "SpiritualGuide offers reflective guidance, not predictions or professional advice.",

  optional: "(optional)",
  fName: "Name",
  fNamePh: "How shall the oracle address you?",
  fDate: "Date of birth",
  fTime: "Time of birth",
  fTimeHint: "(optional, sharpens the reading)",
  fPlace: "Place of birth",
  fPlacePh: "City, country",
  fFocus: "What is on your mind?",
  fFocusPh: "A question, a decision, a season of life you want to understand…",
  openMap: "Open my life map",

  lifeMap: "Your life map",
  lifeMapSub:
    "Nine-, twelve- and seven-year rhythms blended into one supportiveness curve per life aspect — with your critical transition points marked. Weather, not verdicts.",
  factYearPillar: "Year pillar",
  factLifePath: "Life path",
  factPersonalYear: (y) => `Personal year ${y}`,
  bornOn: (d) => `born ${d}`,
  focusMap: "Focus the map",
  supportRange: (a, b) => `Supportiveness by year, ${a}–${b}`,
  explainerSummary: "What moves these curves?",
  explainerLead:
    "Each year's score blends three deterministic cycles computed from your birth date — hover any year or marker on the chart to see which one dominates:",
  explainerNine:
    "The nine-year personal cycle (numerology): seed → growth → harvest → release. Each aspect thrives in different phases — career peaks in years 1 and 8, relationships in 2 and 6, inner growth in 7.",
  explainerTwelve:
    "The twelve-year branch cycle (Chinese metaphysics): how each year's animal sign relates to yours — harmony-triangle and combination years lift the curves; clash, harm and own-sign years pull them down and mark thresholds.",
  explainerSeven:
    "The seven-year renewal rhythm: a slow bodily and energetic tide anchored to your age, phase-shifted per aspect.",
  hexPanelSub: "The symbolic lens — cast at the moment you arrived:",

  hexagram: "Hexagram",
  changingToward: "changing toward",
  changingLine: "changing line",

  consult: "Consult the oracle",
  consultSub:
    "The interpretive lens — ask about any aspect, year or decision. The oracle chooses the tradition that fits your question.",
  oracle: "Oracle",
  contemplating: "the oracle is contemplating",
  suggestions: [
    "What should I focus on this year?",
    "When is a supportive window for a career change?",
    "How do the next three years look for relationships?",
    "Which year ahead asks for the most care?",
  ],
  askPh: "Ask about a year, an aspect, a decision…",
  ask: "Ask",
  hintDefault: "Enter to ask · Shift+Enter for a new line — follow-up questions welcome anytime",
  queued: (n) =>
    `✦ ${n === 1 ? "1 question queued" : `${n} questions queued`} — the oracle will answer next`,
  wavered: "*The oracle's connection wavered — please try again in a moment.*",
  openingWithFocus: (focus) =>
    `Here is what is on my mind: ${focus}. Please give me an opening reading.`,
  openingPlain: "Please give me an opening reading of where I stand in my life cycles.",

  now: "now",
  criticalTransitions: "Critical transitions",
  hoverForAsk: "hover for what each asks of you",
  keyPeak: "supportive window",
  keyTrough: "consolidation",
  keyThreshold: "threshold year",
  focusToSeeTurns: "focus 1–2 aspects to see every turn",
  whyThisLevel: "Why this level:",
  forcesThisYear: "Forces this year:",
  tenYearMap: "Ten-year life transit map",

  personalYearWord: (n) => `Personal year ${n}`,
  sevenRhythm: (rising) => `Seven-year rhythm ${rising ? "rising" : "resting"}`,
  neutralToSign: "neutral to your sign",
  animalYearSuffix: (animal) => `${animal} year`,
};

const ZH: Strings = {
  langName: "繁體中文",
  tagline: "人生流年神諭",
  newSeeker: "新的問卜者",
  themeLabel: "切換明暗主題",

  heroLead: "在規劃人生之前，先看見它的",
  heroEm: "四季流轉",
  heroTail: "",
  heroBody:
    "祂以古老傳統解讀你的提問，再將同一套生命循環化為清晰而有條理的曲線——讓你能為關卡之年預作準備，並在順遂之年把握時機、果斷而行。",
  lensSymbolTitle: "象徵之鏡",
  lensSymbolBody:
    "《易經》卦象、中國年柱、吠陀節律與生命靈數——神諭會挑選最貼合你提問的傳統，並告訴你為何如此。",
  lensSystemTitle: "系統之鏡",
  lensSystemBody:
    "將你的九年、十二年與七年循環化為流年曲線，一一標示並說明每一個關鍵轉折。",
  lensCounselTitle: "行動的建言",
  lensCounselBody:
    "每一次解讀，都以機遇、阻礙、助力資源與需留意之處作結，並附上你可以據以規劃的具體行動。",
  begin: "開始",
  beginSub: "你的出生資料只會留在你的瀏覽器裡，僅用於推算你的解讀。",
  disclaimer: "SpiritualGuide 提供的是啟發反思的指引，而非預測或專業建議。",

  optional: "（可選）",
  fName: "姓名",
  fNamePh: "神諭該如何稱呼你？",
  fDate: "出生日期",
  fTime: "出生時間",
  fTimeHint: "（可選，能使解讀更精準）",
  fPlace: "出生地",
  fPlacePh: "城市、國家",
  fFocus: "你心中在想什麼？",
  fFocusPh: "一個問題、一個抉擇，或一段你想理解的人生時節……",
  openMap: "開啟我的人生地圖",

  lifeMap: "你的人生地圖",
  lifeMapSub:
    "九年、十二年與七年的節律，交融成每個人生面向的一條順遂度曲線，並為你標出關鍵的轉折點。這是天氣，不是斷語。",
  factYearPillar: "年柱",
  factLifePath: "生命靈數",
  factPersonalYear: (y) => `${y} 個人流年`,
  bornOn: (d) => `生於 ${d}`,
  focusMap: "聚焦地圖",
  supportRange: (a, b) => `${a}–${b} 年度順遂度`,
  explainerSummary: "是什麼牽動這些曲線？",
  explainerLead:
    "每一年的分數，都由三種依你出生日期推算的循環交織而成——把游標移到圖上任一年份或標記，就能看見當年由何者主導：",
  explainerNine:
    "九年個人循環（生命靈數）：播種 → 生長 → 收成 → 放下。各面向在不同階段各擅勝場——事業在第 1、8 年登峰，感情在第 2、6 年，內在成長在第 7 年。",
  explainerTwelve:
    "十二年地支循環（中國術數）：每一年的生肖與你本命的關係——三合與六合之年抬升曲線；相沖、相害與本命年則使其下沉，並標記為關卡。",
  explainerSeven:
    "七年更新節律：一道以你年齡為錨、緩慢起伏的身心能量之潮，於各面向之間錯位相移。",
  hexPanelSub: "象徵之鏡——於你到來的此刻起卦：",

  hexagram: "第",
  changingToward: "變爻趨向",
  changingLine: "變爻",

  consult: "求問神諭",
  consultSub:
    "詮釋之鏡——任何面向、年份或抉擇都可以問。神諭會挑選最貼合你提問的傳統來回應。",
  oracle: "神諭",
  contemplating: "神諭正在沉思",
  suggestions: [
    "今年我該把重心放在哪裡？",
    "轉換事業的順遂之窗在何時？",
    "未來三年的感情關係如何？",
    "未來哪一年最需要謹慎以待？",
  ],
  askPh: "詢問某一年、某個面向、某個抉擇……",
  ask: "求問",
  hintDefault: "按 Enter 送出 · Shift+Enter 換行——歡迎隨時追問",
  queued: (n) => `✦ 已排入 ${n} 個問題——神諭將接續回答`,
  wavered: "*神諭的連結一時飄搖——請稍候再試。*",
  openingWithFocus: (focus) => `我心中所念：${focus}。請為我作一段開場的解讀。`,
  openingPlain: "請為我解讀此刻我在人生循環中所處的位置。",

  now: "現在",
  criticalTransitions: "關鍵轉折",
  hoverForAsk: "移上游標即可了解各自的課題",
  keyPeak: "順遂之窗",
  keyTrough: "沉潛整固",
  keyThreshold: "關卡之年",
  focusToSeeTurns: "聚焦 1–2 個面向以顯示每個轉折",
  whyThisLevel: "何以是此水平：",
  forcesThisYear: "今年的力量：",
  tenYearMap: "十年流年地圖",

  personalYearWord: (n) => `個人流年 ${n}`,
  sevenRhythm: (rising) => `七年節律${rising ? "上揚" : "沉息"}`,
  neutralToSign: "與你的生肖中性",
  animalYearSuffix: (animal) => `${animal}年`,
};

const STRINGS: Record<Lang, Strings> = { en: EN, zh: ZH };

/* ------------------------------------------------------------------ */
/* Divination label maps                                               */
/* ------------------------------------------------------------------ */

export function aspectName(lang: Lang, id: AspectId): string {
  const a = ASPECTS.find((x) => x.id === id)!;
  return lang === "zh" ? a.nameZh : a.name;
}

export const animalLabel = (lang: Lang, animal: string): string =>
  lang === "zh" ? ANIMAL_ZH[animal] ?? animal : animal;

export const elementLabel = (lang: Lang, element: string): string =>
  lang === "zh" ? ELEMENT_ZH[element as keyof typeof ELEMENT_ZH] ?? element : element;

/** Localized natal/year pillar label, e.g. "陰火蛇" or "Yin Fire Snake". */
export function pillarLabel(
  lang: Lang,
  yin: boolean,
  element: string,
  animal: string
): string {
  if (lang === "zh") {
    return `${yin ? "陰" : "陽"}${ELEMENT_ZH[element as keyof typeof ELEMENT_ZH] ?? element}${
      ANIMAL_ZH[animal] ?? animal
    }`;
  }
  return `${yin ? "Yin" : "Yang"} ${element} ${animal}`;
}

export function personalYearWord(lang: Lang, n: number, enWord: string): string {
  return lang === "zh" ? PERSONAL_YEAR_WORD_ZH[n] ?? enWord : enWord;
}

export function lifePathLabel(lang: Lang, n: number, enText: string): string {
  return lang === "zh" ? LIFE_PATH_THEMES_ZH[n] ?? enText : enText;
}

const RELATION_SHORT_ZH: Record<BranchRelation, string> = {
  self: "本命年",
  trine: "三合",
  clash: "相沖",
  harm: "相害",
  combine: "六合",
  neutral: "平順",
};

export function relationNote(lang: Lang, rel: BranchRelation, enNote: string): string {
  return lang === "zh" ? RELATION_NOTES_ZH[rel] : enNote;
}

export function relationShort(lang: Lang, rel: BranchRelation, enShort: string): string {
  return lang === "zh" ? RELATION_SHORT_ZH[rel] : enShort;
}

// transition-kind short labels used on the strip pills
const KIND_SHORT_ZH: Record<TransitionKind, string> = {
  peak: "高峰",
  trough: "整固",
  surge: "動能上升",
  drop: "潮水轉向",
  threshold: "關卡",
};

const KIND_SHORT_EN: Record<TransitionKind, string> = {
  peak: "peak",
  trough: "consolidation",
  surge: "momentum up",
  drop: "tide turns",
  threshold: "threshold",
};

export function kindShort(lang: Lang, kind: TransitionKind): string {
  return lang === "zh" ? KIND_SHORT_ZH[kind] : KIND_SHORT_EN[kind];
}
