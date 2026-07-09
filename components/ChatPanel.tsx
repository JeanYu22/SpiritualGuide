"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AspectId, ChartDirective, ChatMessage, Profile, ASPECTS } from "@/lib/types";
import { transitSeries } from "@/lib/divination/cycles";
import TransitChart from "./TransitChart";

/* ---------- markdown-lite ---------- */

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={k++}>{m[1]}</strong>);
    else out.push(<em key={k++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderBlocks(lines: string[], keyBase: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`${keyBase}-${key++}`}>
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={`${keyBase}-${key++}`}>{inline(para.join(" "))}</p>);
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^>\s?/.test(line)) {
      flushList();
      flushPara();
      blocks.push(
        <blockquote key={`${keyBase}-${key++}`}>{inline(line.replace(/^>\s?/, ""))}</blockquote>
      );
    } else if (line.trim() === "") {
      flushList();
      flushPara();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushList();
  flushPara();
  return blocks;
}

// the four counsel factors (plus next steps) render as distinct advisory cards
const FACTOR_META: [RegExp, { kind: string; icon: string }][] = [
  [/^opportunit/i, { kind: "opp", icon: "☀" }],
  [/^obstacle/i, { kind: "obs", icon: "⛰" }],
  [/^supporting|^resources|^allies/i, { kind: "res", icon: "◈" }],
  [/^watch|^drawback|^risk/i, { kind: "watch", icon: "⚠" }],
  [/^next step/i, { kind: "next", icon: "➤" }],
];

function renderText(text: string): React.ReactNode[] {
  // split into sections at markdown headings so factor sections can be styled as cards
  const lines = text.split("\n");
  const sections: { title: string | null; lines: string[] }[] = [{ title: null, lines: [] }];
  for (const raw of lines) {
    const m = raw.match(/^#{1,4}\s+(.*)/);
    if (m) sections.push({ title: m[1].trim(), lines: [] });
    else sections[sections.length - 1].lines.push(raw);
  }

  const out: React.ReactNode[] = [];
  sections.forEach((sec, i) => {
    const body = renderBlocks(sec.lines, `s${i}`);
    if (sec.title == null) {
      out.push(...body);
      return;
    }
    const meta = FACTOR_META.find(([re]) => re.test(sec.title!))?.[1];
    if (meta) {
      out.push(
        <section className={`factor factor-${meta.kind}`} key={`sec${i}`}>
          <div className="factor-head">
            <span className="f-icon" aria-hidden>
              {meta.icon}
            </span>
            {inline(sec.title)}
          </div>
          <div className="factor-body">{body}</div>
        </section>
      );
    } else {
      out.push(<h3 key={`h${i}`}>{inline(sec.title)}</h3>, ...body);
    }
  });
  return out;
}

/* ---------- chart-directive parsing ---------- */

type Segment = { type: "text"; text: string } | { type: "chart"; directive: ChartDirective };

function parseSegments(content: string): Segment[] {
  const segs: Segment[] = [];
  const re = /```chart\s*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m.index > last) segs.push({ type: "text", text: content.slice(last, m.index) });
    try {
      const d = JSON.parse(m[1]);
      if (d && d.kind === "transit") segs.push({ type: "chart", directive: d });
    } catch {
      // incomplete or malformed JSON (e.g. mid-stream): skip silently
    }
    last = m.index + m[0].length;
  }
  // hide an unterminated fence while it is still streaming
  const rest = content.slice(last);
  const openFence = rest.indexOf("```chart");
  segs.push({ type: "text", text: openFence >= 0 ? rest.slice(0, openFence) : rest });
  return segs;
}

function ChartEmbed({ directive, profile }: { directive: ChartDirective; profile: Profile }) {
  const now = new Date().getFullYear();
  const start = directive.startYear ?? now;
  const end = Math.min(start + 15, directive.endYear ?? now + 9);
  const validIds = new Set(ASPECTS.map((a) => a.id));
  const aspects = (directive.aspects ?? []).filter((a): a is AspectId => validIds.has(a));
  const series = useMemo(
    () => transitSeries(profile.birthDate, aspects, start, Math.max(start + 2, end)),
    [profile.birthDate, aspects, start, end]
  );
  return (
    <div className="chart-embed">
      <TransitChart
        series={series}
        title={directive.title}
        annotations={directive.annotations}
        currentYear={now}
        birthDate={profile.birthDate}
      />
    </div>
  );
}

/* ---------- chat panel ---------- */

const SUGGESTIONS = [
  "What should I focus on this year?",
  "When is a supportive window for a career change?",
  "How do the next three years look for relationships?",
  "Which year ahead asks for the most care?",
];

export default function ChatPanel({ profile }: { profile: Profile }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // canonical conversation state lives in refs so questions asked while the
  // oracle is still answering are queued and answered next, never dropped
  const historyRef = useRef<ChatMessage[]>([]);
  const queueRef = useRef<string[]>([]);
  const streamRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function render() {
    const streaming: ChatMessage[] =
      streamRef.current != null ? [{ role: "assistant", content: streamRef.current }] : [];
    const queued: ChatMessage[] = queueRef.current.map((q) => ({ role: "user", content: q }));
    setMessages([...historyRef.current, ...streaming, ...queued]);
    setQueuedCount(queueRef.current.length);
  }

  async function runQueue() {
    busyRef.current = true;
    setBusy(true);
    try {
      while (queueRef.current.length) {
        const question = queueRef.current.shift()!;
        historyRef.current = [...historyRef.current, { role: "user", content: question }];
        streamRef.current = "";
        render();
        try {
          const res = await fetch("/api/oracle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile, messages: historyRef.current }),
          });
          if (!res.ok || !res.body) throw new Error(`oracle returned ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let acc = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += decoder.decode(value, { stream: true });
            streamRef.current = acc;
            render();
          }
          historyRef.current = [...historyRef.current, { role: "assistant", content: acc }];
        } catch {
          historyRef.current = [
            ...historyRef.current,
            {
              role: "assistant",
              content: "*The oracle's connection wavered — please try again in a moment.*",
            },
          ];
        } finally {
          streamRef.current = null;
          render();
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    setInput("");
    queueRef.current.push(question);
    render();
    if (!busyRef.current) void runQueue();
  }

  // opening reading: ask once on mount, seeded by the profile's focus
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    send(
      profile.focus
        ? `Here is what is on my mind: ${profile.focus}. Please give me an opening reading.`
        : "Please give me an opening reading of where I stand in my life cycles."
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card chat">
      <h2>Consult the oracle</h2>
      <p className="sub">
        The interpretive lens — ask about any aspect, year or decision. The oracle chooses the
        tradition that fits your question.
      </p>
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div className="msg user" key={i}>
              {m.content}
            </div>
          ) : (
            <div className="msg assistant" key={i}>
              <div className="who">✦ Oracle</div>
              {m.content === "" && busy ? (
                <span className="typing">the oracle is contemplating</span>
              ) : (
                parseSegments(m.content).map((seg, j) =>
                  seg.type === "text" ? (
                    <div key={j}>{renderText(seg.text)}</div>
                  ) : (
                    <ChartEmbed key={j} directive={seg.directive} profile={profile} />
                  )
                )
              )}
            </div>
          )
        )}
      </div>
      {messages.length <= 2 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="chat-input">
        <textarea
          rows={2}
          value={input}
          placeholder="Ask about a year, an aspect, a decision…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn-primary" onClick={() => send(input)} disabled={!input.trim()}>
          Ask
        </button>
      </div>
      <div className="chat-hint">
        {queuedCount > 0 ? (
          <span className="queued-note">
            ✦ {queuedCount === 1 ? "1 question queued" : `${queuedCount} questions queued`} — the
            oracle will answer next
          </span>
        ) : (
          <span>Enter to ask · Shift+Enter for a new line — follow-up questions welcome anytime</span>
        )}
      </div>
    </div>
  );
}
