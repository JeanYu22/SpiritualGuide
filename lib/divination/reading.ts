/**
 * Builds the divination context shared by the AI oracle (as system-prompt
 * grounding) and the offline "Inner Compass" mode — plus the offline reading
 * generators themselves: a structured opening reading and a question-aware
 * follow-up engine. Every reading closes with concrete guidance on
 * opportunities, obstacles, supporting resources and watch-outs.
 */

import { ASPECTS, AspectId, Profile } from "../types";
import { castHexagram, Cast } from "./iching";
import {
  ANIMAL_ZH,
  birthPillar,
  branchRelation,
  BranchRelation,
  pillarLabelZh,
  RELATION_NOTES,
  RELATION_NOTES_ZH,
  yearPillar,
  YearPillar,
} from "./bazi";
import {
  numerologyProfile,
  lifePathTheme,
  lifePathThemeZh,
  PERSONAL_YEAR_THEMES,
  PERSONAL_YEAR_THEMES_ZH,
  PERSONAL_YEAR_WORD_ZH,
  personalYear,
} from "./numerology";
import {
  aspectScoreDetail,
  keyMoments,
  ScoreDetail,
  transitionPoints,
  TransitionPoint,
} from "./cycles";

type Lang = "en" | "zh";

// aspect display name by language
const aspName = (lang: Lang, meta: (typeof ASPECTS)[number]) =>
  lang === "zh" ? meta.nameZh : meta.name;

const RELATION_SHORT_ZH: Record<BranchRelation, string> = {
  self: "本命年",
  trine: "三合",
  clash: "相沖",
  harm: "相害",
  combine: "六合",
  neutral: "平順",
};

// a compact Traditional-Chinese "why" for a transition point, from raw drivers
function whyZh(tp: TransitionPoint): string {
  if (tp.aspect === null && tp.relation) return RELATION_NOTES_ZH[tp.relation];
  const word = PERSONAL_YEAR_WORD_ZH[tp.personalYearNumber ?? 1] ?? "";
  const animal = ANIMAL_ZH[tp.animal ?? ""] ?? tp.animal ?? "";
  const relPart =
    tp.relation && tp.relation !== "neutral"
      ? `，適逢${animal}年${RELATION_SHORT_ZH[tp.relation]}`
      : "";
  return `個人流年 ${tp.personalYearNumber}（${word}）${relPart}`;
}

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
const scoreTag = (lang: Lang, v?: number) =>
  v == null ? "" : lang === "zh" ? `（${v}/100）` : ` (${v}/100)`;

const KIND_SHORT_ZH: Record<string, string> = {
  peak: "高峰",
  trough: "整固",
  surge: "動能上升",
  drop: "潮水轉向",
  threshold: "關卡",
};

const branchLabelZh = (year: number, rel: BranchRelation) =>
  `${ANIMAL_ZH[yearPillar(year).animal]}年${rel === "neutral" ? "・平順" : RELATION_SHORT_ZH[rel]}`;

// short Traditional-Chinese label for a transition marker
function markerShortZh(tp: TransitionPoint): string {
  if (tp.aspect === null) return tp.relation === "self" ? "本命年" : "相沖之年";
  const meta = ASPECTS.find((a) => a.id === tp.aspect);
  return `${meta ? meta.nameZh : ""}${KIND_SHORT_ZH[tp.kind]}`;
}

// the strongest force in a year, in Traditional Chinese
function dominantZh(d: ScoreDetail): string {
  const rows = [
    { k: "py", pts: d.personalYear.points },
    { k: "br", pts: d.branch.points },
    { k: "ry", pts: d.rhythm.points },
  ].sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts));
  const top = rows[0];
  if (top.k === "py")
    return `個人流年 ${d.personalYear.number}（${PERSONAL_YEAR_WORD_ZH[d.personalYear.number]}）${
      top.pts >= 0 ? "抬升" : "要求耐心於"
    }此面向`;
  if (top.k === "br")
    return `${ANIMAL_ZH[yearPillar(d.year).animal]}年：${
      d.branch.relation === "neutral" ? "與你的生肖平順" : RELATION_SHORT_ZH[d.branch.relation]
    }`;
  return `七年身心節律運行${top.pts >= 0 ? "偏高" : "偏低"}`;
}

function factorBlock(
  birthDate: string,
  aspects: AspectId[],
  startYear: number,
  endYear: number,
  currentYear: number,
  lang: Lang = "en"
): string {
  const pts = transitionPoints(birthDate, aspects, startYear, endYear);
  const peaks = pts.filter((p) => p.kind === "peak" || p.kind === "surge");
  const lows = pts.filter((p) => p.kind === "trough" || p.kind === "drop");
  const thresholds = pts.filter((p) => p.kind === "threshold");
  const zh = lang === "zh";
  const aName = (p: TransitionPoint) => {
    const meta = ASPECTS.find((a) => a.id === p.aspect);
    return meta ? aspName(lang, meta) : "";
  };

  const opp = peaks.length
    ? peaks
        .map((p) =>
          zh
            ? p.kind === "peak"
              ? `- **${p.year} 年 · ${aName(p)}**${scoreTag(lang, p.value)}：${whyZh(p)}。是啟動、承諾或談判的良窗。`
              : `- **${p.year} 年 · ${aName(p)}**：動能在此翻升——此時打下的根基，日後將複利累積。`
            : p.kind === "peak"
              ? `- **${p.year} — ${p.aspectName}**${num(p.value)}: ${p.why}. A window to launch, commit or negotiate.`
              : `- **${p.year} — ${p.aspectName}**: momentum turns upward here — groundwork laid now compounds.`
        )
        .join("\n")
    : zh
      ? "- 這段期間沒有明顯的高峰——進展來自穩定的耕耘，而非時機。"
      : "- No sharp peaks in this window — progress comes from steady effort rather than timing.";

  const obs = [
    ...lows.map((p) =>
      zh
        ? p.kind === "trough"
          ? `- **${p.year} 年 · ${aName(p)}**${scoreTag(lang, p.value)}：${whyZh(p)}。回報較慢，切莫強行躍進。`
          : `- **${p.year} 年之後 · ${aName(p)}**：潮水將轉——要緊之事宜在此之前收束穩妥。`
        : p.kind === "trough"
          ? `- **${p.year} — ${p.aspectName}**${num(p.value)}: ${p.why}. Expect slower returns; don't force leaps.`
          : `- **after ${p.year} — ${p.aspectName}**: the tide turns; finish and secure what matters beforehand.`
    ),
    ...thresholds.map((t) =>
      zh
        ? `- **${t.year} 年 · 各面向**：${t.relation === "self" ? "本命年" : "相沖之年"}——${whyZh(t)}。`
        : `- **${t.year} — all aspects**: ${t.title.toLowerCase()} — ${t.why.split(" — ")[1] ?? t.why}.`
    ),
  ].join("\n");

  // supporting resources: cooperative years + strongest aspect now + relational personal years
  const resources: string[] = [];
  for (let y = startYear; y <= Math.min(endYear, startYear + 4); y++) {
    const natal = birthPillar(birthDate);
    const rel = branchRelation(natal.year, y);
    if (rel === "combine" || rel === "trine") {
      resources.push(
        zh
          ? `- **${y} 年**是${rel === "combine" ? "六合" : "三合"}之年：宜於合作——夥伴、貴人與盟友，能為你打開單憑一己之力難開的門。`
          : `- **${y}** is a ${rel === "combine" ? "combination" : "harmony-triangle"} year: cooperation is favored — partnerships, mentors and allies open doors that effort alone cannot.`
      );
      break;
    }
  }
  const strongestNow = [...ASPECTS]
    .map((a) => aspectScoreDetail(birthDate, a.id, currentYear))
    .sort((x, y) => y.value - x.value)[0];
  const strongMeta = ASPECTS.find((a) => a.id === strongestNow.aspect)!;
  resources.push(
    zh
      ? `- 你此刻最穩固的立足點是**${strongMeta.nameZh}**（${strongestNow.value}/100）——倚靠它，去支撐並穩住較弱面向的行動。`
      : `- Your strongest current ground is **${strongMeta.name}** (${strongestNow.value}/100) — lean on it to fund and steady moves in weaker aspects.`
  );
  const pyNow = personalYear(birthDate, currentYear);
  if (zh) {
    if ([2, 6].includes(pyNow))
      resources.push(`- 個人流年 ${pyNow} 利於結盟——開口求助，這一年會比平常更容易得到回應。`);
    else if (pyNow === 8) resources.push(`- 個人流年 8 招來支持與肯定——讓你的成果被看見。`);
    else
      resources.push(
        `- 個人流年 ${pyNow}（${PERSONAL_YEAR_WORD_ZH[pyNow]}）自有其動能——把你的請求與它對齊。`
      );
  } else {
    if ([2, 6].includes(pyNow))
      resources.push(`- Personal year ${pyNow} favors alliances — ask for help; it will come more easily than usual.`);
    else if (pyNow === 8)
      resources.push(`- Personal year 8 attracts backers and recognition — make your results visible.`);
    else
      resources.push(
        `- Personal year ${pyNow} (${PERSONAL_YEAR_THEMES[pyNow].split(" — ")[0]}) supplies its own fuel — align your asks with it.`
      );
  }

  const watch: string[] = [];
  if (thresholds.length) {
    watch.push(
      zh
        ? `- 盡量別把重大而難以回頭的決定，安排在 **${thresholds.map((t) => `${t.year} 年`).join("與")}**；能的話，挪前或延後一年。`
        : `- Keep large irreversible commitments out of **${thresholds.map((t) => t.year).join(" and ")}** where possible; move them a year earlier or later.`
    );
  }
  if (peaks.some((p) => p.kind === "peak")) {
    watch.push(
      zh
        ? `- 在高峰之年，風險在於過度承接——只挑那一兩件真正要緊的事，其餘婉拒。`
        : `- In peak years, the risk is overcommitment — choose the one or two moves that matter and decline the rest.`
    );
  }
  if ([7, 9].includes(pyNow)) {
    watch.push(
      zh
        ? `- 這是${pyNow === 7 ? "成熟（7）" : "化育（9）"}的個人流年：能量傾向反思${pyNow === 9 ? "與放下" : ""}——此時硬推成長，往往事倍功半。`
        : `- This is a ${pyNow === 7 ? "ripening (7)" : "composting (9)"} personal year: energy wants reflection${pyNow === 9 ? " and release" : ""} — pushing hard growth now tends to under-deliver.`
    );
  }
  if (!watch.length)
    watch.push(
      zh
        ? `- 沒有結構性的隱憂——主要的風險，是在順遂之年裡漫無計畫地空過。`
        : `- Nothing structural — the main risk is drifting through supportive years without a plan.`
    );

  if (zh) {
    return `### 機遇

${opp}

### 阻礙

${obs || "- 這段期間沒有硬性的阻礙。"}

### 助力資源

${resources.join("\n")}

### 需留意

${watch.join("\n")}`;
  }

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
export function localReading(
  profile: Profile,
  question: string,
  ctx: DivinationContext,
  lang: Lang = "en"
): string {
  const c = ctx.cast;

  if (lang === "zh") {
    const name = profile.name ? `${profile.name}，` : "";
    const rel = branchRelation(ctx.natal.year, ctx.currentYear);
    const changingText = c.changingLines.length
      ? `第 ${c.changingLines.join("、")} 爻正在變動：局勢正轉向**第 ${c.resulting!.number} 卦「${c.resulting!.chinese}」**——${c.resulting!.themeZh}。`
      : `六爻皆靜，卦象已定——先安住於眼前的格局，再尋下一步。`;
    return `### 此刻的問卜

${name}歡迎你。我以兩重目光來讀你的提問——象徵之目，以感其時機；系統之目，以觀其形勢。

錢幣落成了**第 ${c.primary.number} 卦「${c.primary.chinese}（${c.primary.pinyin}）」**：${c.primary.themeZh}。${changingText}

### 你所處的位置

你生於**${pillarLabelZh(ctx.natal)}**之柱；${ctx.currentYear} 年為**${pillarLabelZh(ctx.current)}**——${RELATION_NOTES_ZH[rel]}。你的生命靈數為 **${ctx.lifePath}**（${lifePathThemeZh(ctx.lifePath)}），此刻正行於**個人流年 ${ctx.personalYearNow}**：${PERSONAL_YEAR_THEMES_ZH[ctx.personalYearNow]}。

${chartFence([], ctx.currentYear, ctx.currentYear + 9, "十年流年地圖")}

圖上的標記，就是你的關鍵轉折點——把游標移上去，便知每一個各自要求你什麼。以下是同一張圖，化為建言：

${factorBlock(profile.birthDate, [], ctx.currentYear, ctx.currentYear + 9, ctx.currentYear, "zh")}

### 下一步

- 挑出這一季對你最重要的**那一個面向**，問我它最順遂的時機——我們會從那裡倒推規劃。
- 現在就把關卡之年記進行事曆；靠近那些年份的決定，值得多一分準備。
- 今夜再讀一次此卦：「${c.primary.chinese}」所示的品質，正是此刻最值得你修習的。

> 這是啟發反思的指引，而非預言——是天氣，不是斷語。重要的決定，也值得同時尋求專業的意見。`;
  }

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
  [/career|job|work|business|profession|promotion|startup|purpose|vocation|事業|工作|職涯|職業|事業|升遷|創業|志向|生意/i, "career"],
  [/wealth|money|financ|invest|saving|income|property|buy.*(house|home)|salary|財富|錢財|金錢|財務|投資|理財|收入|存款|買房|房產|薪水|薪資/i, "wealth"],
  [/relationship|love|partner|marri|romance|family|friend|dating|spouse|感情|戀愛|愛情|伴侶|婚姻|結婚|姻緣|家庭|家人|朋友|交往|對象|配偶/i, "relationships"],
  [/health|body|energy|illness|fitness|stress|vitality|sleep|健康|身體|體力|精力|生病|疾病|壓力|睡眠|活力/i, "health"],
  [/growth|study|learn|wisdom|spirit|education|degree|skill|travel|成長|學習|進修|智慧|靈性|修行|教育|學位|技能|旅行|求學/i, "growth"],
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
  if (/this year|今年/i.test(q)) ys.add(currentYear);
  if (/next year|明年/i.test(q)) ys.add(currentYear + 1);
  return [...ys].sort();
}

function yearBreakdown(
  birthDate: string,
  aspects: AspectId[],
  year: number,
  lang: Lang = "en"
): string {
  const ids = aspects.length ? aspects : ASPECTS.map((a) => a.id);
  const zh = lang === "zh";
  return ids
    .map((id) => {
      const meta = ASPECTS.find((a) => a.id === id)!;
      const d = aspectScoreDetail(birthDate, id, year);
      const rows = [
        {
          label: zh
            ? `個人流年 ${d.personalYear.number}（${PERSONAL_YEAR_WORD_ZH[d.personalYear.number]}）`
            : d.personalYear.label,
          points: d.personalYear.points,
        },
        {
          label: zh ? branchLabelZh(year, d.branch.relation) : d.branch.label,
          points: d.branch.points,
        },
        {
          label: zh ? `七年節律${d.rhythm.points >= 0 ? "上揚" : "沉息"}` : d.rhythm.label,
          points: d.rhythm.points,
        },
      ].sort((x, y) => Math.abs(y.points) - Math.abs(x.points));
      const [first, second] = rows;
      if (zh) {
        const fmt = (v: { label: string; points: number }) =>
          `${v.label}（${v.points > 0 ? "+" : ""}${v.points} 分）`;
        return `- **${meta.nameZh}：${d.value}/100** — 主要由${fmt(first)}帶動，其次為${fmt(second)}。`;
      }
      const fmt = (v: { label: string; points: number }) =>
        `${v.label.toLowerCase()} (${v.points > 0 ? "+" : ""}${v.points} pts)`;
      return `- **${meta.name}: ${d.value}/100** — driven by ${fmt(first)}, then ${fmt(second)}.`;
    })
    .join("\n");
}

export function answerFollowUp(
  profile: Profile,
  question: string,
  ctx: DivinationContext,
  lang: Lang = "en"
): string {
  const bd = profile.birthDate;
  const yearNow = ctx.currentYear;
  const aspects = detectAspects(question);
  const years = detectYears(question, yearNow);
  const isTiming =
    /\bwhen\b|best time|good time|right time|window|which year|what year|timing|什麼時候|甚麼時候|何時|幾時|哪一年|那一年|哪年|時機|時間點|良機|窗口/i.test(
      question
    );
  const horizonEnd = yearNow + 9;
  const zh = lang === "zh";

  // fresh cast for this specific question — the symbolic voice stays present
  const cast = castHexagram(question, new Date());
  const castLine = zh
    ? `*就這個提問，錢幣給出**第 ${cast.primary.number} 卦「${cast.primary.chinese}」**——${cast.primary.themeZh}${cast.resulting ? `，並轉向**「${cast.resulting.chinese}」**` : ""}。*`
    : `*For this question the coins give **#${cast.primary.number} ${cast.primary.english}** — ${cast.primary.theme}${cast.resulting ? `, turning toward **${cast.resulting.english}**` : ""}.*`;

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
    const py = personalYear(bd, peak?.year ?? yearNow);

    if (zh) {
      return `### ${meta.nameZh}的時機

${castLine}

未來最順遂的窗口在 **${peak?.year} 年**${scoreTag(lang, peak?.value)}——${peak ? whyZh(peak) : ""}。動能自 **${prep} 年**開始蓄積，那是你的布局之年：彼時默默耕耘，${peak?.year} 年再做出檯面上的動作。

${yearBreakdown(bd, targets, peak?.year ?? yearNow, "zh")}

${chartFence(targets, yearNow, horizonEnd, `${meta.nameZh}——通往 ${peak?.year} 年之路`)}

${lowsBefore.length ? `**沿途需知：**${lowsBefore.map((p) => `${p.year} 年 · ${markerShortZh(p)}`).join("；")}。${lowsBefore.length > 1 ? "這些年份" : "這一年"}宜用於準備、儲蓄與磨練本事，而非啟動大局。` : `通往 ${peak?.year} 年的路相對清朗——穩紮穩打即可。`}

### 如何善用這個窗口

- **${peak?.year} 年之前：** 清償時間與金錢的欠帳；在合作之年裡備妥盟友與資歷。
- **${peak?.year} 年當中：** 讓動作被看見——談判、啟動、承諾。${KIND_HINT_ZH[py]}
- **之後：** 迅速鞏固；未經喘息，別在一次躍進上再疊一次。

> 是天氣，不是斷語——窗口對你有利，但不能取代準備。`;
    }

    return `### Timing for ${meta.name.toLowerCase()}

${castLine}

The most supportive window ahead is **${peak?.year}**${num(peak?.value)} — ${peak?.why}. Momentum starts building from **${prep}**, which is your positioning year: quiet groundwork then, visible moves in ${peak?.year}.

${yearBreakdown(bd, targets, peak?.year ?? yearNow)}

${chartFence(targets, yearNow, horizonEnd, `${meta.name} — the road to ${peak?.year}`)}

${lowsBefore.length ? `**On the way there:** ${lowsBefore.map((p) => `${p.year} — ${p.title.replace(/\s*\(.*\)/, "").toLowerCase()}`).join("; ")}. Use ${lowsBefore.length > 1 ? "these years" : "this year"} for preparation, saving and skill-building rather than launches.` : `The road to ${peak?.year} is fairly clear — steady building is enough.`}

### How to use this window

- **Before ${peak?.year}:** clear debts of time and money; line up allies and credentials in the cooperative years.
- **In ${peak?.year}:** make the move visible — negotiate, launch, commit. ${KIND_HINT[py]}
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

    if (zh) {
      return `### ${y} 年，細細一讀

${castLine}

對你而言，${y} 年為**${pillarLabelZh(yearPillar(y))}**——${RELATION_NOTES_ZH[rel]}。在你的九年節律中，這是**個人流年 ${py}**：${PERSONAL_YEAR_THEMES_ZH[py]}。

${yearBreakdown(bd, targets, y, "zh")}

${pts.length ? `**落在 ${y} 年的轉折標記：**${pts.map((p) => `${markerShortZh(p)}（${whyZh(p)}）`).join("；")}。` : ""}

${chartFence(targets, Math.max(yearNow, y - 3), y + 3, `${y} 年前後`)}

${factorBlock(bd, targets, y, y + 1, yearNow, "zh")}

> 輕輕握住 ${y} 年：這些是它底下的潮汐——而你的選擇，始終是那條船。`;
    }

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

    if (zh) {
      return `### ${meta.nameZh}：更深一層的解讀

${castLine}

此刻這個面向落在 **${nowD.value}/100**——${dominantZh(nowD)}。往前看：最順遂的一年是 **${peak?.year} 年**${scoreTag(lang, peak?.value)}，而沉潛最深的整固之年是 **${trough?.year} 年**${scoreTag(lang, trough?.value)}。

${chartFence([id], yearNow, horizonEnd, `${meta.nameZh}，${yearNow}–${horizonEnd}`)}

${factorBlock(bd, [id], yearNow, horizonEnd, yearNow, "zh")}

### 下一步

- 把你最大膽的${meta.nameZh}行動，安排在 **${peak?.year} 年**，並用前一年來布局。
- 提早把 ${trough?.year} 年預留為養護之年——修補、學習、儲蓄。
- 就這條曲線上的某一年問我，我會為你拆解其中的力量。

> 是天氣，不是斷語。`;
    }

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

  if (zh) {
    const bestMeta = ASPECTS.find((a) => a.id === bestPeak?.aspect);
    return `### 為你的提問解卦

${castLine}

你的提問沒有點名某個面向，那我就以你十年地圖中最強的訊號來回應：

- 未來最順遂的單一窗口，是 **${bestPeak?.year} 年的${bestMeta ? bestMeta.nameZh : ""}**${scoreTag(lang, bestPeak?.value)}——${bestPeak ? whyZh(bestPeak) : ""}。
${km.thresholds.length ? `- 最需要謹慎以待的年份是 **${km.thresholds.map((t) => `${t.year} 年`).join("與")}**（${km.thresholds[0].relation === "self" ? "本命年" : "相沖之年"}）——只宜審慎行動。` : ""}
- 你此刻正處於**個人流年 ${ctx.personalYearNow}**：${PERSONAL_YEAR_THEMES_ZH[ctx.personalYearNow]}。

${factorBlock(bd, [], yearNow, horizonEnd, yearNow, "zh")}

若你告訴我提問落在哪個面向——事業、財富、感情、健康或成長——或指定一個年份，我便能讀得更細。

> 是天氣，不是斷語。`;
  }

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

const KIND_HINT_ZH: Record<number, string> = {
  1: "這是播種之年——開端格外有份量。",
  2: "把一位夥伴或盟友帶進這步棋。",
  3: "讓它公開——這一年，能見度會加倍放大。",
  4: "把這步棋的架構立好；合約與細節值得用心。",
  5: "保持彈性——機會的形貌，可能中途生變。",
  6: "把這步棋與家庭的承諾明白地權衡。",
  7: "讓這步棋搭配進修或認證，增添厚度。",
  8: "放膽談判——這一年敬重企圖心。",
  9: "讓某件事乾淨地了結，好騰出空間。",
};
