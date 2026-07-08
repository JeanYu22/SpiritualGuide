"use client";

import { useMemo, useState } from "react";
import { ASPECTS, AspectId, Profile } from "@/lib/types";
import { transitSeries } from "@/lib/divination/cycles";
import { buildContext } from "@/lib/divination/reading";
import TransitChart from "./TransitChart";
import Hexagram from "./Hexagram";

export default function Dashboard({ profile }: { profile: Profile }) {
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

  return (
    <div className="card">
      <h2>Your life map</h2>
      <p className="sub">
        Nine-, twelve- and seven-year rhythms blended into one supportiveness curve per life
        aspect — with your critical transition points marked. Weather, not verdicts.
      </p>

      <div className="profile-facts">
        <div className="fact">
          <div className="k">Year pillar</div>
          <div className="v">{ctx.natal.label.replace(/\s*\(.*\)/, "")}</div>
          <div className="note">
            {ctx.natal.stem}
            {ctx.natal.branch} · born {profile.birthDate}
          </div>
        </div>
        <div className="fact">
          <div className="k">Life path</div>
          <div className="v">{ctx.lifePath}</div>
          <div className="note">{ctx.lifePathNote}</div>
        </div>
        <div className="fact">
          <div className="k">Personal year {ctx.currentYear}</div>
          <div className="v">{ctx.personalYearNow}</div>
          <div className="note">{ctx.personalYearNote.split(" — ")[0]}</div>
        </div>
      </div>

      <div className="chips-row">
        <span className="chips-label">Focus the map</span>
        <div className="chips">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chip"
              data-on={active.includes(a.id)}
              onClick={() => toggle(a.id)}
              title={`Toggle ${a.name}`}
            >
              <span className="dot" style={{ background: `var(--series-${a.slot})` }} />
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <TransitChart
        series={series}
        title={`Supportiveness by year, ${startYear}–${endYear}`}
        currentYear={ctx.currentYear}
        birthDate={profile.birthDate}
      />

      <details className="explainer" open>
        <summary>What moves these curves?</summary>
        <div className="body">
          Each year&apos;s score blends three deterministic cycles computed from your birth date —
          hover any year or marker on the chart to see which one dominates:
          <ul>
            <li>
              <strong>The nine-year personal cycle</strong> (numerology): seed → growth → harvest →
              release. Each aspect thrives in different phases — career peaks in years 1 and 8,
              relationships in 2 and 6, inner growth in 7.
            </li>
            <li>
              <strong>The twelve-year branch cycle</strong> (Chinese metaphysics): how each year&apos;s
              animal sign relates to yours — harmony-triangle and combination years lift the
              curves; clash, harm and own-sign years pull them down and mark thresholds.
            </li>
            <li>
              <strong>The seven-year renewal rhythm</strong>: a slow bodily and energetic tide
              anchored to your age, phase-shifted per aspect.
            </li>
          </ul>
        </div>
      </details>

      <div className="hex-panel">
        <p className="sub">The symbolic lens — cast at the moment you arrived:</p>
        <Hexagram cast={ctx.cast} />
      </div>
    </div>
  );
}
