"use client";

import { useMemo, useState } from "react";
import { ASPECTS, AspectId, Profile } from "@/lib/types";
import { transitSeries } from "@/lib/divination/cycles";
import { buildContext } from "@/lib/divination/reading";
import {
  aspectName,
  lifePathLabel,
  personalYearWord,
  pillarLabel,
  useLang,
  useT,
} from "@/lib/i18n";
import TransitChart from "./TransitChart";
import Hexagram from "./Hexagram";

/** Bold the label portion before the first parenthesis, then the rest. */
function ExplainerItem({ text }: { text: string }) {
  const m = text.match(/^(.*?)([（(].*)$/s);
  if (!m) return <>{text}</>;
  return (
    <>
      <strong>{m[1].trim()}</strong> {m[2]}
    </>
  );
}

export default function Dashboard({ profile }: { profile: Profile }) {
  const lang = useLang();
  const t = useT();
  const [active, setActive] = useState<AspectId[]>(ASPECTS.map((a) => a.id));

  const ctx = useMemo(
    () => buildContext(profile, profile.focus || "life outlook"),
    [profile]
  );
  const startYear = ctx.currentYear;
  const endYear = ctx.currentYear + 9;

  const series = useMemo(
    () => transitSeries(profile.birthDate, active, startYear, endYear),
    [profile.birthDate, active, startYear, endYear]
  );

  function toggle(id: AspectId) {
    setActive((cur) => {
      if (cur.includes(id)) {
        return cur.length === 1 ? cur : cur.filter((a) => a !== id);
      }
      return ASPECTS.map((a) => a.id).filter((a) => cur.includes(a) || a === id);
    });
  }

  const pillar = pillarLabel(lang, ctx.natal.yin, ctx.natal.element, ctx.natal.animal);
  const personalWord = personalYearWord(
    lang,
    ctx.personalYearNow,
    ctx.personalYearNote.split(" — ")[0]
  );

  return (
    <div className="card">
      <h2>{t.lifeMap}</h2>
      <p className="sub">{t.lifeMapSub}</p>

      <div className="profile-facts">
        <div className="fact">
          <div className="k">{t.factYearPillar}</div>
          <div className="v">{pillar}</div>
          <div className="note">
            {ctx.natal.stem}
            {ctx.natal.branch} · {t.bornOn(profile.birthDate)}
          </div>
        </div>
        <div className="fact">
          <div className="k">{t.factLifePath}</div>
          <div className="v">{ctx.lifePath}</div>
          <div className="note">{lifePathLabel(lang, ctx.lifePath, ctx.lifePathNote)}</div>
        </div>
        <div className="fact">
          <div className="k">{t.factPersonalYear(ctx.currentYear)}</div>
          <div className="v">{ctx.personalYearNow}</div>
          <div className="note">{personalWord}</div>
        </div>
      </div>

      <div className="chips-row">
        <span className="chips-label">{t.focusMap}</span>
        <div className="chips">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chip"
              data-on={active.includes(a.id)}
              onClick={() => toggle(a.id)}
              title={aspectName(lang, a.id)}
            >
              <span className="dot" style={{ background: `var(--series-${a.slot})` }} />
              {aspectName(lang, a.id)}
            </button>
          ))}
        </div>
      </div>

      <TransitChart
        series={series}
        title={t.supportRange(startYear, endYear)}
        currentYear={ctx.currentYear}
        birthDate={profile.birthDate}
      />

      <details className="explainer" open>
        <summary>{t.explainerSummary}</summary>
        <div className="body">
          {t.explainerLead}
          <ul>
            <li>
              <ExplainerItem text={t.explainerNine} />
            </li>
            <li>
              <ExplainerItem text={t.explainerTwelve} />
            </li>
            <li>
              <ExplainerItem text={t.explainerSeven} />
            </li>
          </ul>
        </div>
      </details>

      <div className="hex-panel">
        <p className="sub">{t.hexPanelSub}</p>
        <Hexagram cast={ctx.cast} />
      </div>
    </div>
  );
}
