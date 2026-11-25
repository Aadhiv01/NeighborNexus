import { useMemo } from "react";
import { motion } from "motion/react";
import { addDays, formatBookingDate, formatTime, isoDate, timeRange } from "../lib/date";
import type { Slot } from "../lib/types";
import { Skeleton } from "./Feedback";

const choiceBase =
  "relative block cursor-pointer rounded-ui border px-3 py-2.5 text-center text-sm font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent";

const DAYS_AHEAD = 14;

/** Day strip plus time grid, shared by booking and rescheduling. */
export default function SlotPicker({
  name, dateStr, onDate, slots, loading, selected, onSelect, dayLegend, timeLegend,
}: {
  /** Makes radio group names unique when two pickers are on screen. */
  name: string;
  dateStr: string;
  onDate: (d: Date) => void;
  slots: Slot[];
  loading: boolean;
  selected: Slot | null;
  onSelect: (s: Slot) => void;
  dayLegend: string;
  timeLegend: string;
}) {
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, n) => addDays(new Date(), n)), []);

  return (
    <>
      <fieldset className="m-0 mt-6 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">{dayLegend}</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => {
            const key = isoDate(d);
            return (
              <label key={key} className="relative shrink-0 cursor-pointer">
                <input type="radio" name={`${name}-day`} checked={key === dateStr} onChange={() => onDate(d)} className="peer sr-only" />
                <span className={`${choiceBase} min-w-[4.5rem] border-line bg-bg hover:border-ink-soft peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink`}>
                  <span className="block text-xs font-medium">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className="block text-lg leading-tight">{d.getDate()}</span>
                </span>
              </label>
            );
          })}
        </div>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-ink-soft">
          Or choose another date
          <input
            type="date"
            value={dateStr}
            min={isoDate(new Date())}
            onChange={(e) => {
              const next = new Date(`${e.target.value}T00:00:00`);
              if (!Number.isNaN(next.getTime())) onDate(next);
            }}
            className="rounded-ui border border-line bg-bg px-2 py-1.5 text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>
      </fieldset>

      <fieldset className="m-0 mt-6 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">{timeLegend}</legend>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-label="Checking availability">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11" />)}
          </div>
        ) : slots.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <label key={s.start} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={`${name}-slot`}
                  checked={selected?.start === s.start}
                  onChange={() => onSelect(s)}
                  aria-label={timeRange(s.start, s.end)}
                  className="peer sr-only"
                />
                <span className={`${choiceBase} tabular-nums border-line bg-bg hover:border-ink-soft peer-checked:border-transparent peer-checked:text-accent-ink`}>
                  {selected?.start === s.start && (
                    <motion.span layoutId={`${name}-pill`} className="absolute inset-0 rounded-ui bg-accent" transition={{ type: "spring", stiffness: 420, damping: 32 }} aria-hidden />
                  )}
                  <span className="relative">{formatTime(s.start)}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-ui bg-surface-2 p-4 text-ink-soft">
            Nothing open on {formatBookingDate(dateStr + "T00:00:00Z")}. Try another day.
          </p>
        )}
        <p className="mb-0 mt-3 text-xs text-ink-soft">Times are in the provider’s local time.</p>
      </fieldset>
    </>
  );
}
