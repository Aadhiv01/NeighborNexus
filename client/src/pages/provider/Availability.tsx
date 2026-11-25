import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../../lib/api";
import type { DayAvailability, Slot, Weekday } from "../../lib/types";
import Page from "../../layout/Page";
import { Card, PageHeader } from "../../ui/Display";
import { Button } from "../../ui/Button";
import { Skeleton, useToast } from "../../ui/Feedback";
import { PlusIcon, TrashIcon } from "../../ui/Icons";

/**
 * Availability is a recurring weekly template, not a calendar of dates. Booking
 * slots are derived on the server by subtracting bookings from these ranges.
 */
const DAYS: { key: Weekday; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];
const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

type Week = Record<Weekday, Slot[]>;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const emptyWeek = (): Week => Object.fromEntries(DAYS.map((d) => [d.key, []])) as unknown as Week;

const fromServer = (availability: DayAvailability[] = []): Week => {
  const week = emptyWeek();
  for (const d of DAYS) {
    week[d.key] = (availability.find((a) => a.day === d.key)?.slots ?? []).map((s) => ({ start: s.start, end: s.end }));
  }
  return week;
};

/** Returns an error message, or null when the whole week is valid. */
function validate(week: Week) {
  for (const { key, label } of DAYS) {
    const sorted = [...week[key]].sort((a, b) => toMinutes(a.start || "00:00") - toMinutes(b.start || "00:00"));
    for (let i = 0; i < sorted.length; i += 1) {
      const { start, end } = sorted[i];
      if (!start || !end) return `${label}: pick a start and end time.`;
      if (toMinutes(end) <= toMinutes(start)) return `${label}: ${start} to ${end} ends before it starts.`;
      if (i > 0 && toMinutes(start) < toMinutes(sorted[i - 1].end)) {
        return `${label}: ${sorted[i - 1].start} to ${sorted[i - 1].end} overlaps ${start} to ${end}.`;
      }
    }
  }
  return null;
}

const timeInput =
  "rounded-ui border border-line bg-bg px-3 py-2 text-base tabular-nums text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export default function ProviderAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [week, setWeek] = useState<Week>(emptyWeek);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({ queryKey: qk.availability, queryFn: api.availability });

  // Seed the editor from the server whenever there are no unsaved edits.
  useEffect(() => {
    if (data && !dirty) setWeek(fromServer(data));
  }, [data, dirty]);

  const edit = (day: Weekday, slots: Slot[]) => {
    setWeek((w) => ({ ...w, [day]: slots }));
    setDirty(true);
    setError(null);
  };

  const addSlot = (day: Weekday) => {
    const slots = week[day];
    const last = slots[slots.length - 1];
    edit(day, [...slots, { start: last?.end || "09:00", end: "17:00" }]);
  };

  const applyWeekdays = () => {
    setWeek((w) => {
      const next = { ...w };
      for (const d of WEEKDAYS) next[d] = [{ start: "09:00", end: "17:00" }];
      return next;
    });
    setDirty(true);
    setError(null);
  };

  const save = useMutation({
    mutationFn: async (draft: Week) => {
      const invalid = validate(draft);
      if (invalid) throw new Error(invalid);
      // One request per day: the API replaces that day's whole slot list.
      for (const { key } of DAYS) await api.saveDay(key, draft[key]);
    },
    onSuccess: () => {
      setDirty(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: qk.availability });
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      queryClient.invalidateQueries({ queryKey: qk.providerProfile });
      toast({ tone: "success", title: "Availability saved", detail: "Members can now book inside these hours." });
    },
    onError: (err) => setError(err instanceof Error && !("response" in err) ? err.message : errorMessage(err)),
  });

  const total = DAYS.reduce((n, d) => n + week[d.key].length, 0);

  return (
    <Page title="Availability">
      <PageHeader
        eyebrow="Availability"
        title="Weekly availability"
        subtitle="Members can only book inside these hours. A day with no hours is unbookable."
        actions={<Button variant="secondary" onClick={applyWeekdays}>Set weekdays 9 to 5</Button>}
      />

      {isPending ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {DAYS.map(({ key, label }) => {
            const slots = week[key];
            return (
              <li key={key}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="m-0 font-display text-xl font-semibold">{label}</h2>
                      <p className="m-0 text-sm text-ink-soft">
                        {slots.length ? `${slots.length} ${slots.length === 1 ? "window" : "windows"}` : "Unavailable"}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" icon={<PlusIcon width={16} height={16} />} onClick={() => addSlot(key)} aria-label={`Add hours on ${label}`}>
                      Add hours
                    </Button>
                  </div>

                  {slots.length > 0 && (
                    <ul className="m-0 mt-4 grid list-none gap-3 p-0">
                      {slots.map((slot, index) => (
                        <li key={index} className="flex flex-wrap items-center gap-3">
                          <input
                            type="time"
                            className={timeInput}
                            value={slot.start}
                            aria-label={`${label} window ${index + 1} start`}
                            onChange={(e) => edit(key, slots.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)))}
                          />
                          <span className="text-ink-soft">to</span>
                          <input
                            type="time"
                            className={timeInput}
                            value={slot.end}
                            aria-label={`${label} window ${index + 1} end`}
                            onChange={(e) => edit(key, slots.map((s, i) => (i === index ? { ...s, end: e.target.value } : s)))}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<TrashIcon width={16} height={16} />}
                            aria-label={`Remove ${label} window ${index + 1}`}
                            onClick={() => edit(key, slots.filter((_, i) => i !== index))}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface/95 p-4 shadow-lg backdrop-blur">
        <Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(week)}>
          Save availability
        </Button>
        <span className="text-sm text-ink-soft" aria-live="polite">
          {total} {total === 1 ? "window" : "windows"} per week{dirty ? " · unsaved changes" : ""}
        </span>
        {error && <span role="alert" className="text-sm font-semibold text-warn">{error}</span>}
      </div>
    </Page>
  );
}
