"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TransitSeries, AspectId } from "@/lib/types";
import {
  aspectScoreDetail,
  transitionPoints,
  TransitionPoint,
} from "@/lib/divination/cycles";

const KIND_SHORT: Record<string, string> = {
  peak: "peak",
  trough: "consolidation",
  surge: "momentum up",
  drop: "tide turns",
  threshold: "threshold",
};

interface Props {
  series: TransitSeries[];
  title?: string;
  annotations?: { year: number; label: string }[];
  currentYear?: number;
  /** when provided, the chart marks critical transition points and explains drivers on hover */
  birthDate?: string;
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

export default function TransitChart({
  series,
  title,
  annotations = [],
  currentYear,
  birthDate,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [marker, setMarker] = useState<TransitionPoint | null>(null);
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

  const H = W < 480 ? 260 : 310;
  const M = { top: 18, right: W < 480 ? 26 : 46, bottom: 34, left: 34 };

  const years = useMemo(() => {
    const ys = new Set<number>();
    series.forEach((s) => s.points.forEach((p) => ys.add(p.year)));
    return [...ys].sort((a, b) => a - b);
  }, [series]);

  const transitions = useMemo(() => {
    if (!birthDate || !years.length) return [];
    return transitionPoints(
      birthDate,
      series.map((s) => s.aspect as AspectId),
      years[0],
      years[years.length - 1]
    );
  }, [birthDate, series, years]);

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

  // with many curves visible, mark the extremes (peaks + troughs + thresholds)
  // so the critical transitions stay readable; focused views get every marker
  const crowded = series.length > 2;
  const seriesMarkers = transitions.filter(
    (t) =>
      t.aspect !== null &&
      series.some((s) => s.aspect === t.aspect) &&
      (!crowded || t.kind === "peak" || t.kind === "trough")
  );
  const thresholds = transitions.filter((t) => t.aspect === null);
  const stripPoints = [...seriesMarkers, ...thresholds].sort((a, b) => a.year - b.year);

  function placeTip(clientX: number, clientY: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    setTipPos({
      x: Math.min(wrapRect.width - 230, Math.max(4, clientX - wrapRect.left + 14)),
      y: Math.max(0, clientY - wrapRect.top - 12),
    });
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    // keep tracking even while a marker tooltip is up, so the crosshair
    // reappears the instant the pointer leaves the marker
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    if (vx < M.left - 8 || vx > W - M.right + 8) {
      setHoverYear(null);
      return;
    }
    const t = (vx - M.left) / (W - M.left - M.right);
    const year = Math.round(x0 + t * (x1 - x0));
    setHoverYear(Math.min(x1, Math.max(x0, year)));
    if (!marker) placeTip(e.clientX, e.clientY);
  }

  // hovered rows carry each curve's value AND its strongest driver this year,
  // so every level on the chart comes with its supporting reason
  const hovered =
    hoverYear == null
      ? null
      : series.map((s) => {
          const detail = birthDate
            ? aspectScoreDetail(birthDate, s.aspect as AspectId, hoverYear)
            : null;
          return {
            name: s.name,
            slot: s.slot,
            value: s.points.find((p) => p.year === hoverYear)?.value,
            dominant: detail?.dominant,
          };
        });

  const hoverDrivers =
    hoverYear != null && birthDate
      ? aspectScoreDetail(birthDate, series[0].aspect as AspectId, hoverYear)
      : null;

  const markerShape = (t: TransitionPoint) => {
    const cx = xOf(t.year);
    const cy = yOf(t.value ?? 0);
    const c = color(t.slot ?? 5);
    switch (t.kind) {
      case "peak":
        return <circle cx={cx} cy={cy} r={5.5} fill={c} stroke="var(--surface)" strokeWidth={2} />;
      case "trough":
        return <circle cx={cx} cy={cy} r={5} fill="var(--surface)" stroke={c} strokeWidth={2} />;
      case "surge":
        return (
          <path
            d={`M${cx},${cy - 6.5} L${cx + 6},${cy + 4.5} L${cx - 6},${cy + 4.5} Z`}
            fill={c}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        );
      case "drop":
        return (
          <path
            d={`M${cx},${cy + 6.5} L${cx + 6},${cy - 4.5} L${cx - 6},${cy - 4.5} Z`}
            fill="var(--surface)"
            stroke={c}
            strokeWidth={2}
          />
        );
      default:
        return null;
    }
  };

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
        onPointerLeave={() => {
          setHoverYear(null);
          setMarker(null);
        }}
      >
        {/* threshold-year bands (own-sign / clash years) */}
        {thresholds.map((t) => (
          <rect
            key={`band-${t.year}`}
            x={xOf(t.year) - Math.min(14, (xOf(x0 + 1) - xOf(x0)) / 2 || 14)}
            width={Math.min(28, xOf(x0 + 1) - xOf(x0) || 28)}
            y={M.top}
            height={yOf(0) - M.top}
            fill="var(--accent)"
            opacity={0.05}
          />
        ))}
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
        <line
          x1={M.left}
          x2={W - M.right}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
        {tickYears.map((y) => (
          <text
            key={y}
            x={xOf(y)}
            y={H - 12}
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
          <g>
            <line
              x1={xOf(currentYear)}
              x2={xOf(currentYear)}
              y1={M.top}
              y2={yOf(0)}
              stroke="var(--baseline)"
              strokeWidth={1}
            />
            <text
              x={xOf(currentYear)}
              y={M.top - 6}
              textAnchor="middle"
              fontSize={10.5}
              fill="var(--ink-muted)"
            >
              now
            </text>
          </g>
        )}
        {/* free annotations from chart directives */}
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
        {single && <path d={areaOf(series[0])} fill={color(series[0].slot)} opacity={0.1} />}
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
        {/* hover crosshair */}
        {hoverYear != null && !marker && (
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
        {/* threshold-year diamonds on the baseline */}
        {thresholds.map((t) => {
          const cx = xOf(t.year);
          const cy = yOf(0);
          const active = marker === t;
          return (
            <g
              key={`th-${t.year}`}
              onPointerEnter={(e) => {
                setMarker(t);
                placeTip(e.clientX, e.clientY);
              }}
              onPointerLeave={() => setMarker(null)}
              style={{ cursor: "help" }}
            >
              <circle cx={cx} cy={cy} r={13} fill="transparent" />
              <circle className="viz-halo" cx={cx} cy={cy} r={10} fill="var(--accent)" />
              <path
                d={`M${cx},${cy - 6} L${cx + 6},${cy} L${cx},${cy + 6} L${cx - 6},${cy} Z`}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2}
                opacity={active ? 1 : 0.9}
              />
            </g>
          );
        })}
        {/* per-aspect transition markers */}
        {seriesMarkers.map((t, i) => (
          <g
            key={`${t.aspect}-${t.kind}-${t.year}-${i}`}
            onPointerEnter={(e) => {
              setMarker(t);
              placeTip(e.clientX, e.clientY);
            }}
            onPointerLeave={() => setMarker(null)}
            style={{ cursor: "help" }}
          >
            <circle cx={xOf(t.year)} cy={yOf(t.value ?? 0)} r={13} fill="transparent" />
            {t.kind === "peak" && (
              <circle
                className="viz-halo"
                cx={xOf(t.year)}
                cy={yOf(t.value ?? 0)}
                r={10}
                fill={color(t.slot ?? 5)}
              />
            )}
            {markerShape(t)}
          </g>
        ))}
      </svg>

      {/* critical transitions strip — every marked point, hoverable for guidance */}
      {stripPoints.length > 0 && (
        <div className="viz-transitions">
          <div className="viz-transitions-head">
            Critical transitions
            <span className="hint">hover for what each asks of you</span>
          </div>
          <div className="viz-transitions-row">
            {stripPoints.map((t, i) => (
              <button
                key={`strip-${t.year}-${t.kind}-${t.aspect ?? "all"}-${i}`}
                type="button"
                className={`tp-pill tp-${t.kind}`}
                onPointerEnter={(e) => {
                  setMarker(t);
                  placeTip(e.clientX, e.clientY);
                }}
                onPointerLeave={() => setMarker(null)}
                onClick={(e) => {
                  setMarker(marker === t ? null : t);
                  placeTip(e.clientX, e.clientY);
                }}
              >
                {t.aspect !== null && (
                  <span className="dot" style={{ background: color(t.slot ?? 5) }} />
                )}
                {t.aspect === null && <span className="th-glyph">◆</span>}
                <b>{t.year}</b>
                <span className="lbl">
                  {t.aspect === null
                    ? t.title.replace(/\s*\(.*\)/, "").toLowerCase()
                    : `${t.aspectName} ${KIND_SHORT[t.kind]}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* marker legend */}
      {transitions.length > 0 && (
        <div className="viz-markerkey">
          <span><i className="mk mk-peak" /> supportive window</span>
          <span><i className="mk mk-trough" /> consolidation</span>
          <span><i className="mk mk-threshold" /> threshold year</span>
          {crowded && <span className="hint">focus 1–2 aspects to see every turn</span>}
        </div>
      )}

      {/* marker elaboration tooltip */}
      {marker && (
        <div className="viz-tooltip viz-tooltip-marker" style={{ left: tipPos.x, top: tipPos.y }}>
          <div className="t-kicker">
            {marker.year}
            {marker.value != null ? ` · ${marker.value}/100` : ""}
          </div>
          <div className="t-title">{marker.title}</div>
          <div className="t-why">Why: {marker.why}.</div>
          <div className="t-advice">{marker.advice}</div>
        </div>
      )}

      {/* crosshair tooltip */}
      {hoverYear != null && !marker && hovered && (
        <div className="viz-tooltip" style={{ left: tipPos.x, top: tipPos.y }}>
          <div className="t-year">
            {hoverYear}
            {currentYear === hoverYear ? " · now" : ""}
          </div>
          {hovered.map(
            (h) =>
              h.value != null && (
                <div className="t-block" key={h.name}>
                  <div className="t-row">
                    <span className="dot" style={{ background: color(h.slot) }} />
                    <span>{h.name}</span>
                    <span className="val">{h.value}</span>
                  </div>
                  {!single && h.dominant && <div className="t-dom">{h.dominant}</div>}
                </div>
              )
          )}
          {hoverDrivers && single && (
            <div className="t-drivers">
              <div className="t-drivers-head">Why this level:</div>
              {[hoverDrivers.personalYear, hoverDrivers.branch, hoverDrivers.rhythm]
                .slice()
                .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
                .map((d) => (
                  <div className="t-driver-row" key={d.label}>
                    <span>{d.label}</span>
                    <span className={`pts ${d.points >= 0 ? "up" : "down"}`}>
                      {d.points >= 0 ? "+" : ""}
                      {d.points}
                    </span>
                  </div>
                ))}
            </div>
          )}
          {hoverDrivers && !single && (
            <div className="t-drivers">
              <div className="t-drivers-head">Forces this year:</div>
              <div>{hoverDrivers.personalYear.label}</div>
              <div>{hoverDrivers.branch.label}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
