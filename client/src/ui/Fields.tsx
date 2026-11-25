import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Select } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, EyeIcon, EyeOffIcon } from "./Icons";

const control =
  "w-full rounded-ui border border-line bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-soft transition-colors hover:border-ink-soft focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60";

interface Shell {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  hideLabel?: boolean;
}

function Shell({
  id,
  label,
  hint,
  error,
  className = "",
  hideLabel,
  children,
}: Shell & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-semibold text-ink"}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="mb-0 mt-1.5 text-sm font-semibold text-warn">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mb-0 mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describe = (id: string, hint?: string, error?: string | null) =>
  hint || error ? { "aria-describedby": `${id}-msg`, "aria-invalid": error ? true : undefined } : {};

/** Single line controls are exactly as tall as a large button, so they line up side by side. */
const line = "h-12";

export function TextField({
  label, hint, error, className, hideLabel, ...rest
}: Shell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, className, hideLabel }}>
      <input id={id} className={`${control} ${line}`} {...describe(id, hint, error)} {...rest} />
    </Shell>
  );
}

export function PasswordField({
  label, hint, error, className, ...rest
}: Shell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <Shell id={id} {...{ label, hint, error, className }}>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          className={`${control} ${line} pr-11`}
          {...describe(id, hint, error)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-ui text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </Shell>
  );
}

export function TextArea({
  label, hint, error, className, ...rest
}: Shell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, className }}>
      <textarea id={id} className={`${control} resize-y`} {...describe(id, hint, error)} {...rest} />
    </Shell>
  );
}

export interface SelectOption { value: string; label: string }

// Base UI treats an empty value as "nothing chosen", so "All" options use a stand-in value.
const NONE = "__none__";

/**
 * A dropdown that matches the page: same height, corners, colours and focus ring as the other
 * fields, with a styled list. Built on Base UI's Select, so the keyboard (arrows, typing to jump,
 * Enter, Escape) and screen readers work like a native select.
 */
export function SelectField({
  label, value, options, onValueChange, className = "", hideLabel,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
}) {
  const items = options.map((o) => ({ value: o.value === "" ? NONE : o.value, label: o.label }));
  return (
    <div className={className}>
      <Select.Root
        items={items}
        value={value === "" ? NONE : value}
        onValueChange={(v) => onValueChange(v == null || v === NONE ? "" : String(v))}
      >
        <Select.Label className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-semibold text-ink"}>{label}</Select.Label>
        <Select.Trigger
          className={`${control} ${line} flex cursor-pointer items-center justify-between gap-2 text-left data-[popup-open]:border-accent`}
        >
          <Select.Value className="truncate" />
          <Select.Icon className="shrink-0 text-ink-soft transition-transform data-[popup-open]:rotate-180">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={6} className="z-[170] select-none outline-none">
            <Select.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-card border border-line bg-surface text-ink shadow-[0_18px_40px_-18px_var(--ink)] outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <Select.List className="max-h-[var(--available-height)] overflow-y-auto p-1.5">
                {items.map((o) => (
                  <Select.Item
                    key={o.value}
                    value={o.value}
                    className="grid cursor-pointer grid-cols-[1.25rem_1fr] items-center gap-2 rounded-ui px-2.5 py-2.5 text-base outline-none data-[highlighted]:bg-accent-soft data-[selected]:font-semibold"
                  >
                    <Select.ItemIndicator className="text-accent">
                      <CheckIcon width={18} height={18} />
                    </Select.ItemIndicator>
                    <Select.ItemText className="col-start-2">{o.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

/** A real checkbox with switch semantics, so keyboard and screen readers behave. */
export function SwitchField({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
        {hint && <p id={`${id}-msg`} className="m-0 text-sm text-ink-soft">{hint}</p>}
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? `${id}-msg` : undefined}
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full border border-line bg-surface-2 transition-colors checked:border-transparent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-ink-soft transition-transform peer-checked:translate-x-5 peer-checked:bg-accent-ink"
        />
      </span>
    </div>
  );
}
