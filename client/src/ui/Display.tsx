import type { CSSProperties, ElementType, ReactNode } from "react";
import { StarIcon } from "./Icons";
import { initials } from "../lib/date";
import type { BookingStatus } from "../lib/types";

export function Card({
  as: Tag = "div", className = "", children, ...rest
}: { as?: ElementType; className?: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <Tag className={`rounded-card border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({
  eyebrow, title, subtitle, actions,
}: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
        )}
        <h1 className="m-0 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mb-0 mt-2 max-w-2xl text-lg text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="m-0 mb-4 font-display text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

const tones = {
  neutral: "bg-surface-2 text-ink",
  good: "bg-good/15 text-ink",
  warn: "bg-warn/15 text-ink",
  accent: "bg-accent-soft text-ink",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const dot = { neutral: "bg-ink-soft", good: "bg-good", warn: "bg-warn", accent: "bg-accent" }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {children}
    </span>
  );
}

const statusTone: Record<BookingStatus, keyof typeof tones> = {
  upcoming: "accent",
  completed: "good",
  canceled: "warn",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={statusTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
}

export function Rating({ value, count }: { value?: number; count?: number }) {
  if (!value) return <span className="text-sm text-ink-soft">New</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <StarIcon className="text-spark" />
      {value.toFixed(1)}
      {count != null && <span className="font-normal text-ink-soft">({count})</span>}
    </span>
  );
}

const tonesCycle = [
  "bg-accent-soft text-accent",
  "bg-surface-2 text-ink",
  "bg-accent text-accent-ink",
];

/** Initials avatar. `vtName` pairs it with the same avatar on the next page for a View Transition. */
export function Monogram({
  name, index = 0, size = 48, vtName,
}: { name?: string; index?: number; size?: number; vtName?: string }) {
  const style: CSSProperties = { width: size, height: size, fontSize: size * 0.38 };
  if (vtName) style.viewTransitionName = vtName;
  return (
    <span
      aria-hidden
      style={style}
      className={`grid shrink-0 place-items-center rounded-full font-display font-semibold ${tonesCycle[index % 3]}`}
    >
      {initials(name)}
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <p className="m-0 text-sm text-ink-soft">{label}</p>
      <p className="m-0 mt-1 font-display text-4xl font-bold leading-none">{value}</p>
      {hint && <p className="mb-0 mt-2 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** A segmented filter built from real radio inputs. */
export function Segmented<T extends string>({
  legend, value, options, onChange,
}: { legend: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-ui border border-line bg-surface-2 p-1">
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={legend}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="block rounded-ui px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
