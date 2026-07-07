"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TransitSeries } from "@/lib/types";

interface Props {
  series: TransitSeries[];
  title?: string;
  annotations?: { year: number; label: string }[];
  currentYear?: number;
}

/** Monotone cubic (Fritsch–Carlson) path — smooth without overshooting the data. */
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    d.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
  }
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  }
  m.push(d[n - 2]);
  // limit tangents so the curve stays monotone between points
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        m[i] = t * a * d[i];
        m[i + 1] = t * b * d[i];
      }
    }
  }
  let path = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) / 3;
    path += ` C${(pts[i].x + dx).toFixed(1)},${(pts[i].y + m[i] * dx).toFixed(1)} ${(
      pts[i + 1].x - dx
    ).toFixed(1)},${(pts[i + 1].y - m[i + 1] * dx).toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[
      i + 1
    ].y.toFixed(1)}`;
  }
  return path;
}

export default function TransitChart({ series, title, annotations = [], currentYear }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [W, setW] = useState(720);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setW(Math.max(300, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = W < 480 ? 250 : 300;
  const M = { top: 14, right: W < 480 ? 26 : 46, bottom: 30, left: 34 };

  const years = useMemo(() => {
    const ys = new Set<number>();
    series.forEach((s) => s.points.forEach((p) => ys.add(p.year)));
    return [...ys].sort((a, b) => a - b);
  }, [series]);

  if (!series.length || !years.length) return null;

  const x0 = years[0];
  const x1 = years[years.length - 1];
  const xOf = (year: number) =>
    M.left + ((year - x0) / Math.max(1, x1 - x0)) * (W - M.left - M.right);
  const yOf = (v: number) => M.top + (1 - v / 100) * (H - M.top - M.bottom);

  const color = (slot: number) => `var(--series-${slot})`;
  const single = series.length === 1;

  const pathOf = (s: TransitSeries) =>
    smoothPath(s.points.map((p) => ({ x: xOf(p.year), y: yOf(p.value) })));

  const areaOf = (s: TransitSeries) =>
    `${pathOf(s)} L${xOf(s.points[s.points.length - 1].year).toFixed(1)},${yOf(0)} L${xOf(
      s.points[0].year
    ).toFixed(1)},${yOf(0)} Z`;

  // pick tick years: fewer labels on narrow screens; keep the last label collision-free
  const step = Math.max(1, Math.ceil(years.length / (W < 480 ? 5 : 8)));
  const tickYears = years.filter((_, i) => i % step === 0 || i === years.length - 1);
  if (
    tickYears.length >= 2 &&
    tickYears[tickYears.length - 1] - tickYears[tickYears.length - 2] < step
  ) {
    tickYears.splice(tickYears.length - 2, 1);
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    if (vx < M.left - 8 || vx > W - M.right + 8) {
      setHoverYear(null);
      return;
    }
    const t = (vx - M.left) / (W - M.left - M.right);
    const year = Math.round(x0 + t * (x1 - x0));
    setHoverYear(Math.min(x1, Math.max(x0, year)));
    const wrapRect = wrap.getBoundingClientRect();
    setTipPos({
      x: Math.min(wrapRect.width - 150, Math.max(4, e.clientX - wrapRect.left + 14)),
      y: Math.max(0, e.clientY - wrapRect.top - 10),
    });
  }

  const hovered =
    hoverYear == null
      ? null
      : series.map((s) => ({
          name: s.name,
          slot: s.slot,
          value: s.points.find((p) => p.year === hoverYear)?.value,
        }));

  return (
    <div className="viz-root" ref={wrapRef}>
      {title && <p className="viz-title">{title}</p>}
      {series.length > 1 && (
        <div className="viz-legend" role="list">
          {series.map((s) => (
            <span className="key" key={s.aspect} role="listitem">
              <span className="swatch" style={{ background: color(s.slot) }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        className="viz-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title || "Life transit chart"}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverYear(null)}
      >
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={M.left - 8}
              y={yOf(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--ink-muted)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {v}
            </text>
          </g>
        ))}
        {/* baseline */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
        {/* x ticks */}
        {tickYears.map((y) => (
          <text
            key={y}
            x={xOf(y)}
            y={H - 10}
            textAnchor="middle"
            fontSize={11}
            fill="var(--ink-muted)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {y}
          </text>
        ))}
        {/* current-year marker */}
        {currentYear != null && currentYear >= x0 && currentYear <= x1 && (
          <line
            x1={xOf(currentYear)}
            x2={xOf(currentYear)}
            y1={M.top}
            y2={yOf(0)}
            stroke="var(--baseline)"
            strokeWidth={1}
            strokeDasharray="none"
            opacity={0.9}
          />
        )}
        {/* annotations */}
        {annotations
          .filter((a) => a.year >= x0 && a.year <= x1)
          .map((a) => (
            <g key={`${a.year}-${a.label}`}>
              <line
                x1={xOf(a.year)}
                x2={xOf(a.year)}
                y1={M.top}
                y2={yOf(0)}
                stroke="var(--accent)"
                strokeWidth={1}
                opacity={0.45}
              />
              <text
                x={xOf(a.year)}
                y={M.top + 2}
                textAnchor="middle"
                fontSize={10.5}
                fill="var(--ink-2)"
              >
                {a.label}
              </text>
            </g>
          ))}
        {/* area wash for single series */}
        {single && <path d={areaOf(series[0])} fill={color(series[0].slot)} opacity={0.1} />}
        {/* series lines */}
        {series.map((s) => (
          <path
            key={s.aspect}
            d={pathOf(s)}
            fill="none"
            stroke={color(s.slot)}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {/* end markers with surface ring */}
        {series.map((s) => {
          const last = s.points[s.points.length - 1];
          return (
            <circle
              key={s.aspect}
              cx={xOf(last.year)}
              cy={yOf(last.value)}
              r={4}
              fill={color(s.slot)}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          );
        })}
        {/* hover crosshair + markers */}
        {hoverYear != null && (
          <g>
            <line
              x1={xOf(hoverYear)}
              x2={xOf(hoverYear)}
              y1={M.top}
              y2={yOf(0)}
              stroke="var(--ink-muted)"
              strokeWidth={1}
              opacity={0.6}
            />
            {series.map((s) => {
              const p = s.points.find((q) => q.year === hoverYear);
              if (!p) return null;
              return (
                <circle
                  key={s.aspect}
                  cx={xOf(p.year)}
                  cy={yOf(p.value)}
                  r={4.5}
                  fill={color(s.slot)}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
      </svg>
      {hoverYear != null && hovered && (
        <div className="viz-tooltip" style={{ left: tipPos.x, top: tipPos.y }}>
          <div className="t-year">
            {hoverYear}
            {currentYear === hoverYear ? " · now" : ""}
          </div>
          {hovered.map(
            (h) =>
              h.value != null && (
                <div className="t-row" key={h.name}>
                  <span className="dot" style={{ background: color(h.slot) }} />
                  <span>{h.name}</span>
                  <span className="val">{h.value}</span>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
