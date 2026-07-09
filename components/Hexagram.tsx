"use client";

import { Cast } from "@/lib/divination/iching";
import { useLang, useT } from "@/lib/i18n";

export default function Hexagram({ cast }: { cast: Cast }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className="hexagram">
      <div className="hex-lines" aria-hidden>
        {cast.lines.map((v, i) => {
          const yang = v === 7 || v === 9;
          const changing = v === 6 || v === 9;
          return (
            <div className="hex-line" key={i}>
              {yang ? (
                <span className="bar solid" />
              ) : (
                <>
                  <span className="bar half" />
                  <span className="bar half" />
                </>
              )}
              {changing && <span className="changing" title={t.changingLine} />}
            </div>
          );
        })}
      </div>
      <div className="hex-meta">
        <div className="num">
          {lang === "zh"
            ? `第 ${cast.primary.number} 卦`
            : `${t.hexagram} ${cast.primary.number}`}
        </div>
        <div className="name">
          {cast.primary.chinese} {cast.primary.pinyin} — {cast.primary.english}
        </div>
        <div className="theme">
          {cast.primary.theme}
          {cast.resulting && (
            <>
              <br />
              {t.changingToward} #{cast.resulting.number} {cast.resulting.english}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
