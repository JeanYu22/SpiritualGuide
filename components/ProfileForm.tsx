"use client";

import { useState } from "react";
import { Profile } from "@/lib/types";

export default function ProfileForm({ onSubmit }: { onSubmit: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [focus, setFocus] = useState("");

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          name: name.trim() || undefined,
          birthDate,
          birthTime: birthTime || undefined,
          birthPlace: birthPlace.trim() || undefined,
          focus: focus.trim() || undefined,
        });
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor="pf-name">
            Name <span className="opt">(optional)</span>
          </label>
          <input
            id="pf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How shall the oracle address you?"
            autoComplete="given-name"
          />
        </div>
        <div className="field">
          <label htmlFor="pf-date">Date of birth</label>
          <input
            id="pf-date"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-time">
            Time of birth <span className="opt">(optional, sharpens the reading)</span>
          </label>
          <input
            id="pf-time"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-place">
            Place of birth <span className="opt">(optional)</span>
          </label>
          <input
            id="pf-place"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="City, country"
          />
        </div>
        <div className="field full">
          <label htmlFor="pf-focus">
            What is on your mind? <span className="opt">(optional)</span>
          </label>
          <textarea
            id="pf-focus"
            rows={2}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="A question, a decision, a season of life you want to understand…"
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn-primary" type="submit" disabled={!valid}>
          Open my life map
        </button>
      </div>
    </form>
  );
}
