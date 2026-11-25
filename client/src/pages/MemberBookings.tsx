import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../lib/api";
import { formatBookingDate, formatTime, money, nameOf, timeRange } from "../lib/date";
import type { Booking } from "../lib/types";
import Page from "../layout/Page";
import { Card, PageHeader, Segmented, StatusBadge } from "../ui/Display";
import { Button, LinkButton } from "../ui/Button";
import { ConfirmDialog } from "../ui/Dialogs";
import { EmptyState, Skeleton, useToast } from "../ui/Feedback";
import RescheduleDialog from "./RescheduleDialog";

type Filter = "upcoming" | "past" | "all";

const canReschedule = (b: Booking) => !b.rescheduleDeadline || new Date(b.rescheduleDeadline) > new Date();

export default function MemberBookings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [toMove, setToMove] = useState<Booking | null>(null);

  const { data: bookings = [], isPending } = useQuery({ queryKey: qk.bookings, queryFn: api.myBookings });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.bookings });
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      toast({ tone: "success", title: "Booking canceled", detail: "The time is available to others again." });
      setToCancel(null);
    },
    onError: (err) => {
      toast({ tone: "error", title: "Couldn’t cancel", detail: errorMessage(err) });
      setToCancel(null);
    },
  });

  const upcomingCount = bookings.filter((b) => b.status === "upcoming").length;
  const shown = bookings
    .filter((b) => (filter === "all" ? true : filter === "upcoming" ? b.status === "upcoming" : b.status !== "upcoming"))
    .sort((a, b) =>
      filter === "upcoming"
        ? a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
        : b.date.localeCompare(a.date)
    );

  return (
    <Page title="My bookings">
      <PageHeader
        eyebrow="Bookings"
        title="My bookings"
        subtitle={`${bookings.length} in total, ${upcomingCount} coming up.`}
        actions={<LinkButton to="/services" variant="secondary">Book another</LinkButton>}
      />

      <div className="mb-6">
        <Segmented<Filter>
          legend="Show bookings"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {isPending && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-card" />)}</div>}

      {!isPending && shown.length === 0 && (
        <EmptyState
          title={bookings.length === 0 ? "You haven’t booked anything yet" : `No ${filter} bookings`}
          action={bookings.length === 0 ? <LinkButton to="/services">Browse providers</LinkButton> : undefined}
        >
          {bookings.length === 0 ? "When you book a neighbour, it will show up here." : "Try another filter."}
        </EmptyState>
      )}

      <ul className="m-0 grid list-none gap-3 p-0">
        {shown.map((b) => (
          <li key={b._id}>
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <h2 className="m-0 font-display text-xl font-semibold">{b.serviceName || "Service"}</h2>
                <p className="m-0 mt-1">
                  {nameOf(b.serviceProviderId, "Provider")} · {formatBookingDate(b.date)} · {timeRange(b.startTime, b.endTime)}
                </p>
                {b.price ? <p className="m-0 mt-0.5 text-sm text-ink-soft">{money(b.price)}</p> : null}
                {b.status === "upcoming" && b.rescheduleDeadline && canReschedule(b) ? (
                  <p className="m-0 mt-0.5 text-sm text-ink-soft">
                    You can reschedule until {formatBookingDate(b.rescheduleDeadline)} at {new Date(b.rescheduleDeadline).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.
                  </p>
                ) : null}
                {b.reschedules?.length ? (
                  <p className="m-0 mt-0.5 text-sm text-ink-soft">
                    Moved from {formatBookingDate(b.reschedules[0].date)} at {formatTime(b.reschedules[0].startTime)}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                {b.status === "upcoming" && (
                  <>
                    {canReschedule(b) ? (
                      <Button variant="secondary" size="sm" onClick={() => setToMove(b)} aria-label={`Reschedule ${b.serviceName || "booking"}`}>
                        Reschedule
                      </Button>
                    ) : (
                      <span className="max-w-[11rem] text-right text-xs text-ink-soft">Rescheduling has closed. You can still cancel.</span>
                    )}
                    <Button variant="danger" size="sm" onClick={() => setToCancel(b)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <RescheduleDialog booking={toMove} onClose={() => setToMove(null)} />

      <ConfirmDialog
        open={Boolean(toCancel)}
        onOpenChange={(open) => !open && setToCancel(null)}
        title="Cancel this booking?"
        description={
          toCancel
            ? `${toCancel.serviceName || "Your booking"} with ${nameOf(toCancel.serviceProviderId, "your provider")} on ${formatBookingDate(toCancel.date, "long")}. The time goes back on offer.`
            : ""
        }
        confirmLabel="Cancel booking"
        loading={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel._id)}
      />
    </Page>
  );
}
