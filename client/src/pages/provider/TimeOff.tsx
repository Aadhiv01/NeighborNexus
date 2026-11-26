import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, conflictsOf, errorMessage, qk } from "../../lib/api";
import { addDays, formatBookingDate, formatTime, isoDate, timeRange } from "../../lib/date";
import type { TimeOff, TimeOffConflict } from "../../lib/types";
import { Card, Segmented } from "../../ui/Display";
import { Button } from "../../ui/Button";
import { TextArea, TextField } from "../../ui/Fields";
import { FormDialog } from "../../ui/Dialogs";
import { EmptyState, ErrorNote, Skeleton, useToast } from "../../ui/Feedback";
import { CalendarIcon, PlusIcon, TrashIcon } from "../../ui/Icons";

type Mode = "days" | "hours";

const day = (d: string) => formatBookingDate(`${d}T00:00:00Z`);

export const describeTimeOff = (t: TimeOff) => {
  if (t.startTime && t.endTime) return `${day(t.startDate)}, ${timeRange(t.startTime, t.endTime)}`;
  return t.startDate === t.endDate ? `${day(t.startDate)}, all day` : `${day(t.startDate)} to ${day(t.endDate)}`;
};

function AddForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const tomorrow = isoDate(addDays(new Date(), 1));
  const [mode, setMode] = useState<Mode>("days");
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [conflicts, setConflicts] = useState<TimeOffConflict[] | null>(null);

  const body = (decision?: "keep" | "cancel") => ({
    startDate,
    ...(mode === "days" ? { endDate: endDate < startDate ? startDate : endDate } : { startTime, endTime }),
    note,
    ...(decision ? { bookings: decision } : {}),
  });

  const save = useMutation({
    mutationFn: (decision?: "keep" | "cancel") => api.addTimeOff(body(decision)),
    onSuccess: (res) => {
      for (const key of [qk.timeOff, qk.slotsAll, qk.providerBookings, qk.providerProfile, qk.providers]) queryClient.invalidateQueries({ queryKey: key });
      const detail = res.canceled ? `${res.canceled} ${res.canceled === 1 ? "booking was" : "bookings were"} canceled and the members told.` : res.kept ? `${res.kept} ${res.kept === 1 ? "booking was" : "bookings were"} kept.` : "Members can no longer book that time.";
      toast({ tone: "success", title: "Time off added", detail });
      onDone();
    },
    onError: (err) => {
      const found = conflictsOf(err);
      if (found.length) setConflicts(found);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(undefined);
  };

  if (conflicts) {
    return (
      <div>
        <p className="m-0 text-lg">
          {conflicts.length === 1 ? "A booking is" : `${conflicts.length} bookings are`} already in that time. Nothing has changed yet. What should happen to {conflicts.length === 1 ? "it" : "them"}?
        </p>
        <ul className="m-0 mt-4 grid list-none gap-2 p-0">
          {conflicts.map((c) => (
            <li key={c._id} className="rounded-ui bg-surface-2 px-4 py-3">
              <p className="m-0 font-semibold">{c.member}{c.serviceName ? ` · ${c.serviceName}` : ""}</p>
              <p className="m-0 text-sm text-ink-soft">{formatBookingDate(c.date)} · {formatTime(c.startTime)} to {formatTime(c.endTime)}</p>
            </li>
          ))}
        </ul>
        <p className="mb-0 mt-4 text-sm text-ink-soft">
          If you cancel, each member is told straight away and it counts as a cancellation by you on your private record.
        </p>
        {save.isError && !conflictsOf(save.error).length && <div className="mt-4"><ErrorNote>{errorMessage(save.error)}</ErrorNote></div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConflicts(null)}>Back</Button>
          <Button variant="secondary" loading={save.isPending && save.variables === "keep"} onClick={() => save.mutate("keep")}>
            Keep {conflicts.length === 1 ? "it" : "them"} and block the rest
          </Button>
          <Button variant="danger" loading={save.isPending && save.variables === "cancel"} onClick={() => save.mutate("cancel")}>
            Cancel {conflicts.length === 1 ? "it" : "them"} and tell {conflicts.length === 1 ? "the member" : "the members"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Segmented<Mode>
        legend="What to block"
        value={mode}
        onChange={setMode}
        options={[{ value: "days", label: "Whole days" }, { value: "hours", label: "Some hours" }]}
      />
      <div className={`grid grid-cols-1 gap-4 ${mode === "days" ? "sm:grid-cols-2" : ""}`}>
        <TextField label={mode === "days" ? "First day" : "Day"} type="date" required min={isoDate(new Date())} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} />
        {mode === "days" && <TextField label="Last day" type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} hint="Same as the first day for just one day." />}
      </div>
      {mode === "hours" && (
        <div className="grid grid-cols-2 gap-4">
          <TextField label="From" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <TextField label="Until" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      )}
      <TextArea label="Note to yourself" rows={2} maxLength={200} hint="Optional. Only you can see it." value={note} onChange={(e) => setNote(e.target.value)} />
      {save.isError && !conflictsOf(save.error).length && <ErrorNote>{errorMessage(save.error)}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>Block this time</Button>
      </div>
    </form>
  );
}

/** Days and hours the provider has blocked, such as a holiday. Weekly hours stay as they are. */
export default function TimeOffSection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const { data = [], isPending } = useQuery({ queryKey: qk.timeOff, queryFn: api.timeOff });

  const remove = useMutation({
    mutationFn: (id: string) => api.removeTimeOff(id),
    onSuccess: () => {
      for (const key of [qk.timeOff, qk.slotsAll, qk.providers]) queryClient.invalidateQueries({ queryKey: key });
      toast({ tone: "success", title: "Time off removed", detail: "Members can book that time again." });
    },
    onError: (err) => toast({ tone: "error", title: "Couldn’t remove it", detail: errorMessage(err) }),
  });

  return (
    <section aria-labelledby="timeoff-h" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="timeoff-h" className="m-0 font-display text-2xl font-semibold">Time off</h2>
          <p className="m-0 text-ink-soft">Block a holiday, a sick day or a few hours. Your weekly hours stay as they are.</p>
        </div>
        <Button icon={<PlusIcon width={18} height={18} />} onClick={() => setAdding(true)}>Block time off</Button>
      </div>

      {isPending ? (
        <Skeleton className="h-16 rounded-card" />
      ) : data.length === 0 ? (
        <EmptyState title="No time off planned">Nothing is blocked, so members can book any time inside your weekly hours.</EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {data.map((t) => (
            <li key={t._id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-ui bg-accent-soft text-accent"><CalendarIcon /></span>
                  <div className="min-w-0">
                    <p className="m-0 font-semibold">{describeTimeOff(t)}</p>
                    {t.note && <p className="m-0 text-sm text-ink-soft">{t.note}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={<TrashIcon width={16} height={16} />} loading={remove.isPending && remove.variables === t._id} aria-label={`Remove time off ${describeTimeOff(t)}`} onClick={() => remove.mutate(t._id)}>
                  Remove
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FormDialog open={adding} onOpenChange={setAdding} title="Block time off" description="Members won't be able to book this time.">
        {adding && <AddForm onDone={() => setAdding(false)} />}
      </FormDialog>
    </section>
  );
}
