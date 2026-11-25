import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: ReactNode;
}

/** Native radio inputs, so keyboard and screen reader behaviour comes for free. */
export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1 rounded-ui border border-line bg-surface-2 p-1">
        {options.map((o) => (
          <label key={o.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="flex items-center gap-2 rounded-ui px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:text-ink peer-checked:hover:text-accent-ink">
              {o.hint}
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
