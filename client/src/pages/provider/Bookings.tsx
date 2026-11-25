import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../../lib/api";
import { emailOf, formatBookingDate, money, nameOf, timeRange } from "../../lib/date";
import type { Booking, BookingStatus } from "../../lib/types";
import Page from "../../layout/Page";
import { Badge, Card, PageHeader, StatusBadge } from "../../ui/Display";
import { Button } from "../../ui/Button";
import { SelectField, TextField } from "../../ui/Fields";
import { ConfirmDialog } from "../../ui/Dialogs";
import { EmptyState, Skeleton, useToast } from "../../ui/Feedback";
import { CheckIcon, XIcon } from "../../ui/Icons";

const PAGE = 10;

export default function ProviderBookings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<"" | BookingStatus>("");
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [visible, setVisible] = useState(PAGE);
  const [toCancel, setToCancel] = useState<Booking | null>(null);

  const { data: bookings = [], isPending } = useQuery({ queryKey: qk.providerBookings, queryFn: api.providerBookings });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => api.setBookingStatus(id, status),
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: qk.providerBookings });
      queryClient.invalidateQueries({ queryKey: qk.providerProfile });
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      toast({ tone: "success", title: "Booking updated", detail: `${b.serviceName || "Booking"} is now ${b.status}.` });
      setToCancel(null);
    },
    onError: (err) => {
      toast({ tone: "error", title: "Update failed", detail: errorMessage(err) });
      setToCancel(null);
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => !status || b.status === status)
      .filter((b) => !q || `${nameOf(b.user, "")} ${emailOf(b.user)} ${b.serviceName ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
        return newestFirst ? -cmp : cmp;
      });
  }, [bookings, status, search, newestFirst]);

  const shown = rows.slice(0, visible);

  return (
    <Page title="Bookings" wide>
      <PageHeader eyebrow="Bookings" title="Bookings" subtitle={`${rows.length} of ${bookings.length} bookings.`} />

      <form onSubmit={(e) => e.preventDefault()} className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <TextField label="Search member or service" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }} />
        <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value as "" | BookingStatus); setVisible(PAGE); }}>
          <option value="">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </SelectField>
        <Button variant="secondary" size="lg" onClick={() => setNewestFirst((n) => !n)} aria-pressed={newestFirst}>
          {newestFirst ? "Newest first" : "Oldest first"}
        </Button>
      </form>

      {isPending ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title={bookings.length ? "No bookings match" : "No bookings yet"}>
          {bookings.length ? "Try clearing the search or status filter." : "When a member books one of your times, it shows up here."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Bookings for your services</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs uppercase tracking-[0.1em] text-ink-soft">
                  {["When", "Service", "Member", "Status", ""].map((h, i) => (
                    <th key={i} scope="col" className="px-5 py-3 font-semibold">{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b._id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 align-top">
                      <p className="m-0 font-semibold">{formatBookingDate(b.date)}</p>
                      <p className="m-0 text-sm tabular-nums text-ink-soft">{timeRange(b.startTime, b.endTime)}</p>
                      {b.reschedules?.length ? <div className="mt-1"><Badge tone="accent">Rescheduled</Badge></div> : null}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="m-0 font-semibold">{b.serviceName || "—"}</p>
                      {b.price != null && <p className="m-0 text-sm text-ink-soft">{money(b.price)}</p>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="m-0">{nameOf(b.user, "Member")}</p>
                      <p className="m-0 text-sm text-ink-soft">{emailOf(b.user)}</p>
                    </td>
                    <td className="px-5 py-4 align-top"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4 align-top">
                      {b.status === "upcoming" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            icon={<CheckIcon width={16} height={16} />}
                            loading={update.isPending && update.variables?.id === b._id && update.variables.status === "completed"}
                            onClick={() => update.mutate({ id: b._id, status: "completed" })}
                            aria-label={`Complete booking for ${nameOf(b.user, "member")}`}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon={<XIcon width={16} height={16} />}
                            onClick={() => setToCancel(b)}
                            aria-label={`Cancel booking for ${nameOf(b.user, "member")}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="block text-right text-ink-soft" aria-label="No actions">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > visible && (
            <div className="border-t border-line p-4 text-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
                Show more ({rows.length - visible} left)
              </Button>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(toCancel)}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Cancel this booking?"
        description={
          toCancel
            ? `${toCancel.serviceName || "Booking"} for ${nameOf(toCancel.user, "the member")} on ${formatBookingDate(toCancel.date, "long")}. The time goes back on offer.`
            : ""
        }
        confirmLabel="Cancel booking"
        loading={update.isPending}
        onConfirm={() => toCancel && update.mutate({ id: toCancel._id, status: "canceled" })}
      />
    </Page>
  );
}
