import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "./Icons";

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

export function TextField({
  label, hint, error, className, hideLabel, ...rest
}: Shell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, className, hideLabel }}>
      <input id={id} className={control} {...describe(id, hint, error)} {...rest} />
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
          className={`${control} pr-11`}
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

export function SelectField({
  label, hint, error, className, hideLabel, children, ...rest
}: Shell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} {...{ label, hint, error, className, hideLabel }}>
      <select id={id} className={control} {...describe(id, hint, error)} {...rest}>
        {children}
      </select>
    </Shell>
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
