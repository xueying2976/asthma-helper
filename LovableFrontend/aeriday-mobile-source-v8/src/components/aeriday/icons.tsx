type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconToday({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconLog({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  );
}

export function IconMeds({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="4" y="3" width="10" height="18" rx="3" />
      <path d="M4 9h10M17 12h4M19 10v4" />
    </svg>
  );
}

export function IconTrends({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 19V5M4 19h16" />
      <path d="M7 15l4-5 3 3 4-6" />
    </svg>
  );
}

export function IconMore({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevron({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconInfo({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function IconAlertLine({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 4.5 21 19H3L12 4.5Z" />
      <path d="M12 10v4M12 16.5h.01" />
    </svg>
  );
}

export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconLeaf({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M19 5c0 8-5 12-11 12H5c0-7 5-12 11-12h3Z" />
      <path d="M5 19c3-4 6-6 10-7.5" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

/** Abstract particle-in-air mark for air quality. */
export function IconAir({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h13a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h6" />
      <circle cx="18.5" cy="9.5" r="0.9" />
    </svg>
  );
}

/** Abstract pollen grain / seed head. */
export function IconPollen({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="3.2" />
      <path d="M12 3v3.2M12 13.2V21M6.4 6.4l2.3 2.3M15.3 11.3l2.3 2.3M17.6 6.4l-2.3 2.3M8.7 11.3l-2.3 2.3" />
    </svg>
  );
}

/** Non-literal breathing mark: an airflow arc with a rhythm dot. */
export function IconBreath({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 15c3-6 6 6 9 0s5-4 9-1" />
      <circle cx="12" cy="6" r="1" />
    </svg>
  );
}

export function IconHeartLine({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 12h4l2-4 3 8 2-5 2 1h5" />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconDrop({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3.5s5.5 6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5Z" />
    </svg>
  );
}

export function IconWind({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h14M3 16h8a2.5 2.5 0 1 1-2.5 2.5" />
    </svg>
  );
}

export function IconSteps({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M7 4c2 0 2.5 2 2.5 4.5S8.5 13 7 13s-2.5-1.5-2.5-4S5 4 7 4Z" />
      <path d="M16.5 8c2 0 2.5 2 2.5 4.5S18 17 16.5 17 14 15.5 14 13s.5-5 2.5-5Z" />
    </svg>
  );
}

export function IconClipboard({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4V3h6v1M9 10h6M9 14h4" />
    </svg>
  );
}

export function IconPin({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

/**
 * Overview status dial: an abstract open arc with a marker.
 * `pct` positions the marker along the arc (0-100).
 */
export function StatusDial({ className, pct = 55 }: IconProps & { pct?: number }) {
  const r = 42;
  const cx = 50;
  const cy = 50;
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const a = start + (sweep * Math.min(100, Math.max(0, pct))) / 100;
  const x = cx + r * Math.cos(a);
  const y = cy + r * Math.sin(a);
  const arc = (from: number, to: number) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    return `M${x1} ${y1}A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path
        d={arc(start, start + sweep)}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        opacity={0.28}
      />
      <path
        d={arc(start, a)}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r={3.2} fill="currentColor" />
      <path
        d="M28 56c6-9 11 8 17 0s10-6 15-2"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.5}
      />
    </svg>
  );
}

/** Original, non-literal airflow-through-a-window line illustration (Variant C). */
export function AirflowIllustration({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 320 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="18" y="12" width="70" height="72" rx="4" />
      <path d="M53 12v72M18 48h70" />
      <circle cx="248" cy="26" r="11" />
      <path d="M248 8v-5M248 49v5M270 26h5M221 26h5M263 11l3-3M233 41l-3 3M263 41l3 3M233 11l-3-3" />
      <path d="M100 34c22-10 44 10 66 0s44-10 66 0" />
      <path d="M100 52c26-9 52 9 78 0s52-9 78 0" opacity="0.75" />
      <path d="M100 70c18-7 36 7 54 0s36-7 54 0" opacity="0.5" />
    </svg>
  );
}

/** Source change — two arrows swapping between endpoints. */
export function IconSourceSwap({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 8h12l-3-3M20 16H8l3 3" />
    </svg>
  );
}

/** Dashed placeholder — missing / stale / insufficient data. */
export function IconDashedCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" strokeDasharray="2.5 3" />
      <path d="M9 12h6" />
    </svg>
  );
}
