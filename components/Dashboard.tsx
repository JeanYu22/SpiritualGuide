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
        The systematic lens — nine-year, twelve-year and seven-year rhythms blended into one
        supportiveness curve per life aspect. Weather, not verdicts.
      </p>

      <div className="profile-facts">
        <div className="fact">
          <div className="k">Year pillar</div>
          <div className="v">{ctx.natal.label.replace(/\s*\(.*\)/, "")}</div>
          <div className="note">{ctx.natal.stem}{ctx.natal.branch} · born {profile.birthDate}</div>
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

      <div className="chips" style={{ marginBottom: 14 }}>
        {ASPECTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="chip"
            data-on={active.includes(a.id)}
            onClick={() => toggle(a.id)}
          >
            <span className="dot" style={{ background: `var(--series-${a.slot})` }} />
            {a.name}
          </button>
        ))}
      </div>

      <TransitChart
        series={series}
        title={`Supportiveness by year, ${startYear}–${endYear}`}
        currentYear={ctx.currentYear}
      />

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <p className="sub" style={{ marginBottom: 10 }}>
          The symbolic lens — cast at the moment you arrived:
        </p>
        <Hexagram cast={ctx.cast} />
      </div>
    </div>
  );
}
