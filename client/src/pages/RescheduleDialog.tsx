import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, qk } from "../lib/api";
import { formatBookingDate, formatTime, isoDate } from "../lib/date";
import type { Booking, Slot } from "../lib/types";
import { Button } from "../ui/Button";
import { FormDialog } from "../ui/Dialogs";
import { ErrorNote, useToast } from "../ui/Feedback";
import SlotPicker from "../ui/SlotPicker";

const providerIdOf = (b: Booking) =>
  typeof b.serviceProviderId === "object" ? (b.serviceProviderId?._id ?? "") : (b.serviceProviderId ?? "");

function RescheduleForm({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const providerId = providerIdOf(booking);
  const currentDate = booking.date.slice(0, 10);

  const [date, setDate] = useState(() => new Date(`${currentDate}T00:00:00`));
  const [slot, setSlot] = useState<Slot | null>(null);
  const dateStr = isoDate(date);

  // The booking's own time is passed as excluded, so it shows as free and can be shifted by 30 minutes.
  const { data, isPending, isFetching } = useQuery({
    queryKey: qk.slots(providerId, booking.serviceId, dateStr, booking._id),
    queryFn: () => api.slots(providerId, booking.serviceId, dateStr, booking._id),
    enabled: Boolean(providerId),
  });

  const move = useMutation({
    mutationFn: () => api.rescheduleBooking(booking._id, { date: dateStr, startTime: slot!.start, endTime: slot!.end }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.bookings });
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      toast({ tone: "success", title: "Booking moved", detail: "Your provider has been told, and your reminder is reset." });
      onClose();
    },
    // If someone just took the time, refresh so it disappears from the grid.
    onError: () => queryClient.invalidateQueries({ queryKey: qk.slotsAll }),
  });

  const unchanged = slot && dateStr === currentDate && slot.start === booking.startTime;

  return (
    <div>
      <p className="m-0 rounded-ui bg-surface-2 px-4 py-3 text-sm">
        <span className="text-ink-soft">Now: </span>
        <strong>{formatBookingDate(booking.date, "long")} at {formatTime(booking.startTime)}</strong>
        {slot && !unchanged && (
          <>
            <br />
            <span className="text-ink-soft">Moving to: </span>
            <strong>{formatBookingDate(dateStr + "T00:00:00Z", "long")} at {formatTime(slot.start)}</strong>
          </>
        )}
      </p>

      <SlotPicker
        name="move"
        dateStr={dateStr}
        onDate={(d) => { setDate(d); setSlot(null); move.reset(); }}
        slots={data?.slots ?? []}
        loading={isPending || isFetching}
        selected={slot}
        onSelect={(s) => { setSlot(s); move.reset(); }}
        dayLegend="Pick a new day"
        timeLegend="Pick a new time"
      />

      {move.isError && <div className="mt-4"><ErrorNote>{errorMessage(move.error)}</ErrorNote></div>}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Keep current time</Button>
        <Button loading={move.isPending} disabled={!slot || Boolean(unchanged)} onClick={() => move.mutate()}>
          {slot && !unchanged ? `Move to ${formatTime(slot.start)}` : "Choose a new time"}
        </Button>
      </div>
    </div>
  );
}

/** Lets a member move their own upcoming booking to another open time. */
export default function RescheduleDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  return (
    <FormDialog
      open={Boolean(booking)}
      onOpenChange={(open) => !open && onClose()}
      title="Reschedule booking"
      description={booking ? `${booking.serviceName || "Your booking"}. Pick a new time and we’ll tell your provider.` : undefined}
      wide
    >
      {booking && <RescheduleForm key={booking._id} booking={booking} onClose={onClose} />}
    </FormDialog>
  );
}
