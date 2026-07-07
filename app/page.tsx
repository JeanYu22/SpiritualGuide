"use client";

import { useEffect, useState } from "react";
import { Profile } from "@/lib/types";
import ProfileForm from "@/components/ProfileForm";
import Dashboard from "@/components/Dashboard";
import ChatPanel from "@/components/ChatPanel";

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("sg-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  function toggleTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme ?? (prefersDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("sg-theme", next);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>SpiritualGuide</h1>
          <span className="tagline">life-transit oracle</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {profile && (
            <button className="btn-ghost" onClick={() => setProfile(null)}>
              New seeker
            </button>
          )}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            ☾ / ☀
          </button>
        </div>
      </header>

      {!profile ? (
        <>
          <section className="hero">
            <div className="symbols" aria-hidden>
              ☯ ✦ ☾ ᛟ ✧
            </div>
            <h2>See the seasons of your life before you plan them</h2>
            <p>
              An oracle that reads your question through I-Ching, Chinese metaphysics, Vedic
              rhythm and numerology — then maps the same cycles as clear, systematic curves. So
              you can prepare for threshold years, and act in the supportive ones.
            </p>
          </section>
          <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2>Begin</h2>
            <p className="sub">
              Your birth data stays in your browser and is used only to compute your reading.
            </p>
            <ProfileForm onSubmit={setProfile} />
          </div>
          <p className="disclaimer">
            SpiritualGuide offers reflective guidance, not predictions or professional advice.
          </p>
        </>
      ) : (
        <>
          <main className="grid-main">
            <Dashboard profile={profile} />
            <ChatPanel profile={profile} />
          </main>
          <p className="disclaimer">
            SpiritualGuide offers reflective guidance, not predictions or professional advice.
          </p>
        </>
      )}
    </div>
  );
}
