"use client";

import { useEffect, useState } from "react";
import { Profile } from "@/lib/types";
import { Lang, LangContext, useT } from "@/lib/i18n";
import ProfileForm from "@/components/ProfileForm";
import Dashboard from "@/components/Dashboard";
import ChatPanel from "@/components/ChatPanel";

function HomeInner({
  lang,
  toggleLang,
  toggleTheme,
}: {
  lang: Lang;
  toggleLang: () => void;
  toggleTheme: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const t = useT();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden>
            ☯
          </span>
          <div>
            <h1>SpiritualGuide</h1>
            <span className="tagline">{t.tagline}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {profile && (
            <button className="btn-ghost" onClick={() => setProfile(null)}>
              {t.newSeeker}
            </button>
          )}
          <button
            className="btn-ghost lang-toggle"
            onClick={toggleLang}
            aria-label="Switch language"
            title={lang === "en" ? "切換至繁體中文" : "Switch to English"}
          >
            {lang === "en" ? "繁中" : "EN"}
          </button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={t.themeLabel}>
            ☾ · ☀
          </button>
        </div>
      </header>

      {!profile ? (
        <>
          <section className="hero">
            <div className="symbols" aria-hidden>
              ☰ ☱ ☲ ☳ ☴ ☵ ☶ ☷
            </div>
            <h2>
              {t.heroLead}
              <em>{t.heroEm}</em>
              {t.heroTail}
            </h2>
            <p>{t.heroBody}</p>
          </section>

          <div className="lenses">
            <div className="lens">
              <div className="glyph" aria-hidden>
                ☯
              </div>
              <h3>{t.lensSymbolTitle}</h3>
              <p>{t.lensSymbolBody}</p>
            </div>
            <div className="lens">
              <div className="glyph" aria-hidden>
                ◈
              </div>
              <h3>{t.lensSystemTitle}</h3>
              <p>{t.lensSystemBody}</p>
            </div>
            <div className="lens">
              <div className="glyph" aria-hidden>
                ✦
              </div>
              <h3>{t.lensCounselTitle}</h3>
              <p>{t.lensCounselBody}</p>
            </div>
          </div>

          <div className="card begin-card">
            <h2>{t.begin}</h2>
            <p className="sub">{t.beginSub}</p>
            <ProfileForm onSubmit={setProfile} />
          </div>
          <p className="disclaimer">{t.disclaimer}</p>
        </>
      ) : (
        <>
          <main className="grid-main">
            <Dashboard profile={profile} />
            <ChatPanel profile={profile} />
          </main>
          <p className="disclaimer">{t.disclaimer}</p>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sg-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    }
    const savedLang = window.localStorage.getItem("sg-lang");
    if (savedLang === "en" || savedLang === "zh") {
      setLang(savedLang);
    } else if (typeof navigator !== "undefined" && /^zh/i.test(navigator.language)) {
      setLang("zh");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  }, [lang]);

  function toggleTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme ?? (prefersDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("sg-theme", next);
  }

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    window.localStorage.setItem("sg-lang", next);
  }

  return (
    <LangContext.Provider value={lang}>
      <HomeInner lang={lang} toggleLang={toggleLang} toggleTheme={toggleTheme} />
    </LangContext.Provider>
  );
}
