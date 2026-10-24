import { useState, type ReactNode } from "react";
import { IconArrow, IconCheckCircle, IconChevron } from "./icons";

/**
 * Interaction kit: bottom sheet, choice controls and steppers.
 * Everything is keyboard reachable, ≥44 pt, and wraps instead of truncating
 * so Accessibility-3 text stays readable.
 */

export function Sheet({
  title,
  subtitle,
  onClose,
  closeLabel,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-aeri-ink/35"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[94%] min-h-0 flex-col overflow-hidden rounded-t-3xl bg-aeri-surface"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-aeri-line px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="t-title font-semibold">{title}</h2>
            {subtitle ? <p className="t-meta text-aeri-slate">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="t-meta grid min-h-11 min-w-11 place-items-center rounded-full bg-aeri-mist px-3 text-aeri-slate"
          >
            {closeLabel}
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        {footer ? (
          <div className="sticky bottom-0 shrink-0 border-t border-aeri-line bg-aeri-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SheetButton({
  children,
  onClick,
  tone = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "quiet" | "warn";
  disabled?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "bg-aeri-teal text-aeri-teal-fg"
      : tone === "warn"
        ? "border border-aeri-amber text-aeri-amber"
        : "border border-aeri-line text-aeri-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`t-body flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

/** Label + wrapping choice chips. One question per block. */
export function ChoiceGroup<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="t-body font-medium">{label}</legend>
      {hint ? <p className="t-meta text-aeri-slate">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className={`t-meta flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 ${
                on
                  ? "border-aeri-teal bg-aeri-teal/10 font-semibold text-aeri-teal"
                  : "border-aeri-line text-aeri-slate"
              }`}
            >
              {on ? <IconCheckCircle className="size-4 shrink-0" /> : null}
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function MultiChoice({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="t-body font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={`t-meta flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 ${
                on
                  ? "border-aeri-blue bg-aeri-blue/10 font-semibold text-aeri-blue"
                  : "border-aeri-line text-aeri-slate"
              }`}
            >
              {on ? <IconCheckCircle className="size-4 shrink-0" /> : null}
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
  decreaseLabel = "−",
  increaseLabel = "+",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  decreaseLabel?: string;
  increaseLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="t-body min-w-0 font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={decreaseLabel}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="t-title grid size-11 place-items-center rounded-full border border-aeri-line text-aeri-slate"
        >
          −
        </button>
        <span className="t-title w-10 text-center font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={increaseLabel}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="t-title grid size-11 place-items-center rounded-full border border-aeri-line text-aeri-slate"
        >
          +
        </button>
      </span>
    </div>
  );
}

export function TextField({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric";
}) {
  const [id] = useState(() => `f-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="t-body font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="t-body mt-2 min-h-11 w-full rounded-2xl border border-aeri-line bg-aeri-mist px-3.5 py-2.5 placeholder:text-aeri-slate"
      />
    </div>
  );
}

/** Tappable action row used across tabs; wraps rather than truncating. */
export function ActionRow({
  Icon,
  title,
  subtitle,
  trailing,
  onClick,
  tone = "text-aeri-teal",
}: {
  Icon?: (p: { className?: string }) => ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left"
    >
      {Icon ? (
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full bg-aeri-mist ${tone}`}
        >
          <Icon className="size-4" />
        </span>
      ) : (
        <span />
      )}
      <span className="min-w-0">
        <span className="t-body block font-medium">{title}</span>
        {subtitle ? <span className="t-meta block text-aeri-slate">{subtitle}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {trailing}
        <IconChevron className="size-4 -rotate-90 text-aeri-slate" />
      </span>
    </button>
  );
}

export function InlineNote({ children }: { children: ReactNode }) {
  return <p className="t-meta text-aeri-slate">{children}</p>;
}

export function ArrowCta({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="t-body flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-aeri-teal px-4 py-3 font-semibold text-aeri-teal-fg"
    >
      <span>{children}</span>
      <IconArrow className="size-5 shrink-0" />
    </button>
  );
}
