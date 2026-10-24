import { useState, type ReactNode } from "react";
import type { Level } from "@/lib/aeriday/data";
import { IconChevron } from "./icons";

export type Variant = "A" | "B" | "C";
export type IconCmp = (p: { className?: string }) => ReactNode;

export const levelText: Record<Level, string> = {
  good: "text-aeri-good",
  watch: "text-aeri-blue",
  high: "text-aeri-amber",
  unknown: "text-aeri-slate",
};

export const levelSoft: Record<Level, string> = {
  good: "bg-aeri-good/10",
  watch: "bg-aeri-blue/10",
  high: "bg-aeri-amber/12",
  unknown: "bg-aeri-mist",
};

const levelRank: Record<Level, number> = { good: 1, watch: 2, high: 3, unknown: 0 };

/** Circular tinted icon chip — the core motif of the modern layout. */
export function IconChip({
  Icon,
  level = "watch",
  className = "",
}: {
  Icon: IconCmp;
  level?: Level;
  className?: string;
}) {
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-full ${levelSoft[level]} ${levelText[level]} ${className}`}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** 3-segment severity scale — reads level at a glance without words. */
export function SeverityBars({ level, className = "" }: { level: Level; className?: string }) {
  const rank = levelRank[level];
  return (
    <span className={`flex items-end gap-0.5 ${levelText[level]} ${className}`} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${i <= rank ? "bg-current" : "bg-current/20"}`}
          style={{ height: `${4 + i * 3}px` }}
        />
      ))}
    </span>
  );
}

export function LevelDot({ level }: { level: Level }) {
  return (
    <span
      className={`size-2 shrink-0 rounded-full bg-current ${levelText[level]}`}
      aria-hidden="true"
    />
  );
}

/** Soft floating surface — rounded, white, feather-light shadow. */
export function Card({
  variant,
  children,
  className = "",
}: {
  variant: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`aeri-soft rounded-3xl bg-aeri-surface px-4 ${className}`}
      data-variant={variant}
    >
      {children}
    </section>
  );
}

/** Collapsible group: overview row always visible, detail on demand. */
export function Group({
  variant,
  Icon,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  labels,
  children,
}: {
  variant: Variant;
  Icon: IconCmp;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  labels: { expand: string; collapse: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card variant={variant} className="py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5 text-left"
      >
        <IconChip Icon={Icon} />
        <span className="min-w-0">
          <span className="t-body block truncate font-semibold">{title}</span>
          {subtitle ? (
            <span className="t-meta block truncate text-aeri-slate">{subtitle}</span>
          ) : null}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <span className="grid size-7 place-items-center rounded-full bg-aeri-mist">
            <IconChevron
              className={`size-4 text-aeri-slate transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </span>
      </button>
      <span className="sr-only">{open ? labels.collapse : labels.expand}</span>
      {open ? <div className="border-t border-aeri-line pt-3 pb-4">{children}</div> : null}
    </Card>
  );
}

export function Tag({ tone, children }: { tone: Level; children: ReactNode }) {
  return (
    <span
      className={`t-cap rounded-full px-2.5 py-1 normal-case tracking-normal ${levelSoft[tone]} ${levelText[tone]}`}
    >
      {children}
    </span>
  );
}

/** Segmented tick meter — reads as a precise gauge rather than a plain bar. */
export function Meter({ pct, tone, ticks = 24 }: { pct: number; tone: Level; ticks?: number }) {
  const filled = Math.round((pct / 100) * ticks);
  return (
    <span className="mt-2 flex h-3.5 w-full items-end gap-[2px]" aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className={`h-full flex-1 rounded-full ${
            i < filled ? `bg-current ${levelText[tone]}` : "bg-aeri-line"
          }`}
        />
      ))}
    </span>
  );
}

/** Radial gauge with a ticked rim and a value in the middle. */
export function Ring({
  pct,
  tone,
  label,
  className = "size-24",
}: {
  pct: number;
  tone: Level;
  label: string;
  className?: string;
}) {
  const ticks = 40;
  const filled = Math.round((pct / 100) * ticks);
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`}>
      <svg viewBox="0 0 100 100" className={`size-full ${levelText[tone]}`} aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const r1 = 36;
          const r2 = i < filled ? 47 : 43;
          return (
            <line
              key={i}
              x1={Number((50 + r1 * Math.cos(a)).toFixed(2))}
              y1={Number((50 + r1 * Math.sin(a)).toFixed(2))}
              x2={Number((50 + r2 * Math.cos(a)).toFixed(2))}
              y2={Number((50 + r2 * Math.sin(a)).toFixed(2))}

              stroke={i < filled ? "currentColor" : "var(--aeri-line)"}
              strokeWidth={i < filled ? 3.5 : 2.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <span className="absolute t-body font-semibold tabular-nums">{label}</span>
    </span>
  );
}

/** Tiny trend line for supporting metrics. */
export function Sparkline({
  points,
  tone = "watch",
  className = "h-5 w-16",
}: {
  points: number[];
  tone?: Level;
  className?: string;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 60;
      const y = 18 - ((p - min) / span) * 16;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 60 20"
      className={`${className} ${levelText[tone]}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy={(18 - ((points[points.length - 1]! - min) / span) * 16).toFixed(1)} r="2" fill="currentColor" />
    </svg>
  );
}


/** Titled section block. */
export function Panel({
  variant,
  title,
  action,
  children,
}: {
  variant: Variant;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card variant={variant} className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-body font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/** Tappable list row with leading icon chip and trailing chevron. */
export function Row({
  Icon,
  title,
  subtitle,
  trailing,
  tone = "text-aeri-teal",
  chevron = true,
}: {
  Icon?: IconCmp;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  tone?: string;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left"
    >
      {Icon ? (
        <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-aeri-mist ${tone}`}>
          <Icon className="size-4" />
        </span>
      ) : (
        <span className="size-0" />
      )}
      <span className="min-w-0">
        <span className="t-body block truncate">{title}</span>
        {subtitle ? (
          <span className="t-meta block truncate text-aeri-slate">{subtitle}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {trailing}
        {chevron ? <IconChevron className="size-4 -rotate-90 text-aeri-slate" /> : null}
      </span>
    </button>
  );
}

export function Divider() {
  return <span className="block h-px w-full bg-aeri-line" />;
}

/** Half-arc day path with lo/hi ends and a marker at the current position. */
export function DayArc({
  pct,
  tone = "good",
  lo,
  hi,
  className = "",
}: {
  pct: number;
  tone?: Level;
  lo: string;
  hi: string;
  className?: string;
}) {
  const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  const cx = Number((30 + 26 * Math.cos(a)).toFixed(2));
  const cy = Number((30 - 26 * Math.sin(a)).toFixed(2));
  return (
    <span className={`flex items-end gap-1.5 ${className}`} aria-hidden="true">
      <span className="t-cap shrink-0 tabular-nums text-aeri-slate">{lo}</span>
      <svg viewBox="0 0 60 34" className={`h-9 w-full ${levelText[tone]}`} fill="none" preserveAspectRatio="none" vectorEffect="non-scaling-stroke">
        <path d="M4 30 A26 26 0 0 1 56 30" stroke="var(--aeri-line)" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M4 30 A26 26 0 0 1 56 30"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="82"
          strokeDashoffset={(82 * (1 - pct / 100)).toFixed(1)}
        />
        <circle cx={cx} cy={cy} r="3.4" fill="currentColor" />
        <circle cx={cx} cy={cy} r="1.4" fill="var(--aeri-surface)" />
      </svg>
      <span className="t-cap shrink-0 tabular-nums text-aeri-slate">{hi}</span>
    </span>
  );
}

/** Category scale with a pointer — for banded indexes like AQI. */
export function ScaleBar({
  pct,
  bands = 5,
  tone = "watch",
  className = "",
}: {
  pct: number;
  bands?: number;
  tone?: Level;
  className?: string;
}) {
  const active = Math.min(bands - 1, Math.floor((pct / 100) * bands));
  return (
    <span className={`block ${className}`} aria-hidden="true">
      <span className="relative block h-1.5">
        <span className="flex h-full w-full gap-[2px]">
          {Array.from({ length: bands }, (_, i) => (
            <span
              key={i}
              className={`h-full flex-1 rounded-full ${
                i === active ? `bg-current ${levelText[tone]}` : "bg-aeri-line"
              }`}
            />
          ))}
        </span>
        <span
          className={`absolute -top-[5px] size-0 -translate-x-1/2 border-x-[3.5px] border-t-[4px] border-x-transparent ${levelText[tone]}`}
          style={{ left: `${Math.min(Math.max(pct, 3), 97)}%`, borderTopColor: "currentColor" }}
        />
      </span>
    </span>
  );
}

/** Discrete pips — for small counted scales such as pollen 0–10. */
export function Pips({
  value,
  total = 10,
  tone = "high",
  className = "",
}: {
  value: number;
  total?: number;
  tone?: Level;
  className?: string;
}) {
  const filled = Math.round(value);
  return (
    <span className={`flex items-end gap-[3px] ${levelText[tone]} ${className}`} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-full rounded-full ${i < filled ? "bg-current" : "bg-aeri-line"}`}
          style={{ height: `${5 + (i / (total - 1)) * 11}px` }}
        />
      ))}
    </span>
  );
}

/** Trend line drawn inside a shaded "usual range" band. */
export function BandLine({
  points,
  band,
  tone = "good",
  className = "",
}: {
  points: number[];
  band: [number, number];
  tone?: Level;
  className?: string;
}) {
  const all = [...points, ...band];
  const max = Math.max(...all);
  const min = Math.min(...all);
  const span = max - min || 1;
  const y = (v: number) => Number((22 - ((v - min) / span) * 20).toFixed(1));
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 58).toFixed(1)} ${y(p)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 60 24" className={`${className} ${levelText[tone]}`} fill="none" aria-hidden="true">
      <rect x="0" y={y(band[1])} width="60" height={(y(band[0]) - y(band[1])).toFixed(1)} rx="2" fill="currentColor" opacity="0.12" />
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="58" cy={y(points[points.length - 1]!)} r="2.2" fill="currentColor" />
    </svg>
  );
}

export function StatTile({
  Icon,
  label,
  value,
  unit,
  detail,
  level = "unknown",
  pct,
  spark,
  viz,
  variant,
}: {
  Icon: IconCmp;
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  level?: Level;
  pct?: number;
  spark?: number[];
  viz?: ReactNode;
  variant: Variant;
}) {
  return (
    <button
      type="button"
      className="aeri-soft-sm min-w-0 rounded-2xl bg-aeri-surface px-3.5 py-3.5 text-left transition active:scale-[0.99]"
      data-variant={variant}
    >
      <div className="flex items-start justify-between gap-2">
        <IconChip Icon={Icon} level={level} className="size-9" />
        <SeverityBars level={level} className="mt-1" />
      </div>
      <p className="t-meta mt-2.5 break-words text-aeri-slate">{label}</p>
      <p className="t-title font-semibold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="t-meta font-normal text-aeri-slate">
            {"\u2009"}
            {unit}
          </span>
        ) : null}
      </p>
      {detail ? <p className={`t-meta break-words ${levelText[level]}`}>{detail}</p> : null}
      {viz ? (
        <div className="mt-2">{viz}</div>
      ) : spark ? (
        <Sparkline points={spark} tone={level} className="mt-2 h-5 w-full" />
      ) : pct !== undefined ? (
        <Meter pct={pct} tone={level} ticks={14} />
      ) : null}
    </button>
  );
}



export function PrimaryButton({
  children,
  outline = false,
  onClick,
}: {
  children: ReactNode;
  outline?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        outline
          ? "t-body flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-aeri-line bg-aeri-mist px-4 py-3 font-medium text-aeri-teal"
          : "t-body flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-aeri-teal px-4 py-3 font-medium text-aeri-teal-fg"
      }
    >
      {children}
    </button>
  );
}

/**
 * Compact personal-range band with a current-value marker.
 * Endpoints are intentionally unlabelled on Today — this is the user's own
 * recent range, not a clinical threshold.
 */
export function RangeMarker({
  band,
  value,
  tone = "watch",
  className = "",
}: {
  band: [number, number];
  value: number;
  tone?: Level;
  className?: string;
}) {
  const pad = (band[1] - band[0] || 1) * 0.9;
  const min = band[0] - pad;
  const max = band[1] + pad;
  const pos = (v: number) => Math.max(2, Math.min(98, ((v - min) / (max - min)) * 100));
  return (
    <span className={`relative block h-4 w-full ${className}`} aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-aeri-line" />
      <span
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-aeri-slate/35"
        style={{ left: `${pos(band[0])}%`, width: `${pos(band[1]) - pos(band[0])}%` }}
      />
      <span
        className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-aeri-surface bg-current ${levelText[tone]}`}
        style={{ left: `${pos(value)}%` }}
      />
    </span>
  );
}

/**
 * Full trend chart for detail sheets only: labelled time axis, personal-range
 * band, and explicit gaps for days without data.
 */
export function TrendChart({
  points,
  band,
  tone = "good",
  startLabel,
  endLabel,
  className = "",
}: {
  points: (number | null)[];
  band?: [number, number] | undefined;
  tone?: Level;
  startLabel: string;
  endLabel: string;
  className?: string;
}) {
  const vals = points.filter((p): p is number => p !== null);
  const all = band ? [...vals, ...band] : vals;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const span = max - min || 1;
  const y = (v: number) => Number((44 - ((v - min) / span) * 38).toFixed(1));
  const x = (i: number) => Number(((i / (points.length - 1)) * 236).toFixed(1));

  const segments: string[] = [];
  let cur: string[] = [];
  points.forEach((p, i) => {
    if (p === null) {
      if (cur.length) segments.push(cur.join(" "));
      cur = [];
      return;
    }
    cur.push(`${cur.length === 0 ? "M" : "L"}${x(i)} ${y(p)}`);
  });
  if (cur.length) segments.push(cur.join(" "));

  return (
    <span className={`block ${className}`}>
      <svg viewBox="0 0 236 52" className={`w-full ${levelText[tone]}`} fill="none" aria-hidden="true">
        {band ? (
          <rect
            x="0"
            y={y(band[1])}
            width="236"
            height={(y(band[0]) - y(band[1])).toFixed(1)}
            rx="2"
            fill="currentColor"
            opacity="0.12"
          />
        ) : null}
        <path d="M0 48H236" className="text-aeri-line" stroke="currentColor" strokeWidth="1" />
        {points.map((p, i) =>
          p === null ? (
            <circle key={i} cx={x(i)} cy="24" r="1.2" className="text-aeri-line" fill="currentColor" />
          ) : null,
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <span className="t-meta mt-1 flex justify-between text-aeri-slate">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </span>
    </span>
  );
}
