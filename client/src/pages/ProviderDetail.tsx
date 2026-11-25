import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, isConflict, qk } from "../lib/api";
import { useLiveSlots } from "../lib/useLiveSlots";
import { addDays, formatBookingDate, formatTime, isoDate, money } from "../lib/date";
import type { Booking, Slot } from "../lib/types";
import { useUser } from "../auth/UserContext";
import Page from "../layout/Page";
import { Badge, Card, Monogram, Rating, SectionTitle } from "../ui/Display";
import { Button, LinkButton } from "../ui/Button";
import { ErrorNote, PageLoading } from "../ui/Feedback";
import SlotPicker from "../ui/SlotPicker";
import { ArrowLeftIcon, CheckIcon, PinIcon } from "../ui/Icons";

export default function ProviderDetail() {
  const { providerId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [serviceChoice, setServiceChoice] = useState<string | null>(null);
  const [date, setDate] = useState(() => addDays(new Date(), 1));
  const [slot, setSlot] = useState<Slot | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [takenNotice, setTakenNotice] = useState(false);

  const { data: provider, isPending, isError } = useQuery({
    queryKey: qk.provider(providerId),
    queryFn: () => api.publicProfile(providerId),
  });

  const serviceId = serviceChoice ?? provider?.services[0]?._id ?? null;
  const service = provider?.services.find((s) => s._id === serviceId);
  const dateStr = isoDate(date);
  const isProviderUser = user?.type === "Service Provider";
  const isOwnPage = Boolean(user && provider && user.id === provider.userId);

  const slotsQuery = useQuery({
    queryKey: qk.slots(provider?._id, serviceId, dateStr),
    queryFn: () => api.slots(provider!._id, serviceId!, dateStr),
    enabled: Boolean(provider?._id && serviceId),
  });

  const live = useLiveSlots(provider?._id);

  const book = useMutation({
    mutationFn: api.createBooking,
    onSuccess: (booking) => {
      setConfirmed(booking);
      setSlot(null);
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      queryClient.invalidateQueries({ queryKey: qk.bookings });
    },
    // Someone else may have taken the slot first. Refresh so it disappears.
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: qk.slotsAll });
      if (isConflict(err)) {
        setSlot(null);
        setTakenNotice(true);
      }
    },
  });

  // If the time someone has chosen disappears from a fresh list, somebody else just took it.
  const freshSlots = slotsQuery.data?.slots;
  useEffect(() => {
    if (slot && freshSlots && !slotsQuery.isFetching && !freshSlots.some((s) => s.start === slot.start)) {
      setSlot(null);
      setTakenNotice(true);
    }
  }, [slot, freshSlots, slotsQuery.isFetching]);

  if (isPending) return <PageLoading label="Loading provider" />;

  if (isError || !provider) {
    return (
      <Page title="Provider not found">
        <p className="text-lg">We couldn’t find that provider.</p>
        <LinkButton to="/services" variant="secondary">Back to all providers</LinkButton>
      </Page>
    );
  }

  const chooseService = (id: string) => {
    setServiceChoice(id);
    setSlot(null);
    setConfirmed(null);
    setTakenNotice(false);
  };
  const chooseDate = (d: Date) => {
    setDate(d);
    setSlot(null);
    setConfirmed(null);
  };

  const submit = () => {
    if (!slot || !serviceId) return;
    book.mutate({
      serviceProviderId: provider._id,
      serviceId,
      date: dateStr,
      startTime: slot.start,
      endTime: slot.end,
    });
  };

  const slots = slotsQuery.data?.slots ?? [];
  const loadingSlots = slotsQuery.isPending || slotsQuery.isFetching;

  return (
    <Page title={provider.name} wide>
      <Link
        to="/services"
        viewTransition
        className="inline-flex items-center gap-1.5 rounded-ui text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ArrowLeftIcon width={16} height={16} /> All providers
      </Link>

      <Card className="mt-4 p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <Monogram name={provider.name} size={76} vtName={`avatar-${provider.userId}`} />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-display text-4xl font-bold leading-tight tracking-tight">{provider.name}</h1>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <PinIcon width={16} height={16} /> {provider.location || "Area not set"}
              </span>
              <span>{provider.experience || 0} years experience</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Rating value={provider.rating} count={provider.reviews?.length || undefined} />
            {provider.availableForEmergency && <Badge tone="warn">Emergency call-outs</Badge>}
          </div>
        </div>
        <p className="mb-0 mt-5 max-w-3xl text-lg leading-relaxed">
          {provider.bio || "This neighbour hasn’t added a description yet."}
        </p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="min-w-0 p-6">
          <SectionTitle>Book a service</SectionTitle>

          {!provider.services.length ? (
            <p className="m-0 text-ink-soft">This provider hasn’t listed any services yet.</p>
          ) : (
            <>
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-2 text-sm font-semibold">1. Choose a service</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {provider.services.map((s) => (
                    <label key={s._id} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="service"
                        checked={s._id === serviceId}
                        onChange={() => chooseService(s._id)}
                        className="peer sr-only"
                      />
                      <span className="block h-full rounded-card border border-line bg-bg p-4 transition-colors hover:border-ink-soft peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                        <span className="block font-semibold">{s.name}</span>
                        <span className="block text-sm text-ink-soft">
                          {s.category} · {s.durationMinutes || 60} min
                        </span>
                        <span className="mt-2 block text-lg font-semibold">{money(s.price)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <SlotPicker
                name="book"
                dateStr={dateStr}
                onDate={chooseDate}
                slots={slots}
                loading={loadingSlots}
                selected={slot}
                onSelect={(s) => {
                  setSlot(s);
                  setTakenNotice(false);
                }}
                dayLegend="2. Pick a day"
                timeLegend="3. Pick a time"
                live={live}
              />
            </>
          )}
        </Card>

        <aside aria-label="Booking summary" className="lg:sticky lg:top-24 lg:self-start">
          <Card className="bg-surface-2 p-6">
            <h2 className="m-0 font-display text-2xl font-semibold">Your booking</h2>

            {confirmed ? (
              <div role="status" className="mt-4">
                <p className="m-0 flex items-center gap-2 font-semibold text-good">
                  <CheckIcon /> Booked
                </p>
                <p className="mb-0 mt-2">
                  {confirmed.serviceName} on {formatBookingDate(confirmed.date, "long")} at {formatTime(confirmed.startTime)}.
                </p>
                <LinkButton to="/bookings" className="mt-5 w-full">View my bookings</LinkButton>
              </div>
            ) : (
              <>
                <dl className="mb-0 mt-4 space-y-3 text-sm">
                  {[
                    ["Service", service?.name ?? "Choose a service"],
                    ["When", slot ? `${formatBookingDate(dateStr + "T00:00:00Z")}, ${formatTime(slot.start)}` : "Choose a time"],
                    ["Price", service ? money(service.price) : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="m-0 text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mb-0 mt-4 text-sm leading-relaxed text-ink-soft">
                  You can cancel any time from My bookings and the time goes back on offer.
                </p>

                {takenNotice && (
                  <div className="mt-4">
                    <ErrorNote>Someone just booked that time. We’ve refreshed the list, so please pick another.</ErrorNote>
                  </div>
                )}
                {book.isError && !isConflict(book.error) && <div className="mt-4"><ErrorNote>{errorMessage(book.error)}</ErrorNote></div>}

                {isProviderUser ? (
                  <div className="mt-5 rounded-ui bg-surface p-4 text-sm leading-relaxed">
                    {isOwnPage ? (
                      <>
                        <p className="m-0 font-semibold">This is how members see you.</p>
                        <LinkButton to="/dashboard/serviceprovider/profile" variant="secondary" size="sm" className="mt-3">
                          Edit your profile
                        </LinkButton>
                      </>
                    ) : (
                      <p className="m-0">
                        Providers can’t book other providers. Log in with a member account to book {provider.name.split(" ")[0]}.
                      </p>
                    )}
                  </div>
                ) : user ? (
                  <Button size="lg" className="mt-5 w-full" disabled={!slot} loading={book.isPending} onClick={submit}>
                    {slot ? `Confirm ${formatTime(slot.start)}` : "Select a time"}
                  </Button>
                ) : (
                  <div className="mt-5">
                    <p className="mb-3 mt-0 text-sm">Sign in to book {provider.name.split(" ")[0]}.</p>
                    <Button size="lg" className="w-full" onClick={() => navigate("/login")}>Sign in to book</Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </aside>
      </div>

      <section className="mt-10" aria-labelledby="reviews-h">
        <SectionTitle id="reviews-h">Reviews</SectionTitle>
        {provider.reviews?.length ? (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {provider.reviews.map((r) => (
              <li key={r._id}>
                <Card className="p-5">
                  <Rating value={r.rating} />
                  <p className="mb-0 mt-2 leading-relaxed">{r.comment}</p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-ink-soft">No reviews yet. Be the first to book.</p>
        )}
      </section>
    </Page>
  );
}
