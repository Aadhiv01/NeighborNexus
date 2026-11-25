import { useQuery } from "@tanstack/react-query";
import { api, qk } from "../lib/api";
import { formatBookingDate, formatTime, money, nameOf } from "../lib/date";
import { useUser } from "../auth/UserContext";
import Page from "../layout/Page";
import { Card, PageHeader, SectionTitle, Stat } from "../ui/Display";
import { LinkButton } from "../ui/Button";
import { EmptyState, Skeleton } from "../ui/Feedback";
import { ArrowRightIcon, CalendarIcon } from "../ui/Icons";
import ProviderCard from "../ui/ProviderCard";

export default function MemberDashboard() {
  const { user } = useUser();
  const providers = useQuery({ queryKey: qk.providers, queryFn: () => api.providers() });
  const bookings = useQuery({ queryKey: qk.bookings, queryFn: api.myBookings });

  const all = bookings.data ?? [];
  const upcoming = all
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const completed = all.filter((b) => b.status === "completed").length;
  const next = upcoming[0];

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const suggestions = (providers.data ?? []).slice(0, 3);

  return (
    <Page title="Dashboard">
      <PageHeader
        eyebrow="Your dashboard"
        title={`${greeting}, ${firstName}.`}
        subtitle="Your next booking, and a few neighbours worth a look."
        actions={<LinkButton to="/services" icon={<CalendarIcon width={18} height={18} />}>Book something</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="bg-accent-soft p-7">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Next appointment</p>
          {bookings.isPending ? (
            <div className="mt-4 space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>
          ) : next ? (
            <>
              <h2 className="m-0 mt-3 font-display text-3xl font-bold leading-tight">{next.serviceName || "Service"}</h2>
              <p className="mb-0 mt-2 text-lg">
                with <strong>{nameOf(next.serviceProviderId, "your provider")}</strong>
              </p>
              <p className="m-0 mt-1 text-lg">
                {formatBookingDate(next.date, "long")} at {formatTime(next.startTime)}
                {next.price ? ` · ${money(next.price)}` : ""}
              </p>
              <p className="mb-0 mt-3 text-sm text-ink-soft">You’ll get a reminder before it starts. You can reschedule from My bookings.</p>
              <LinkButton to="/bookings" variant="secondary" className="mt-5" icon={<ArrowRightIcon width={18} height={18} />}>
                View all bookings
              </LinkButton>
            </>
          ) : (
            <>
              <h2 className="m-0 mt-3 font-display text-3xl font-bold leading-tight">Nothing booked yet.</h2>
              <p className="mb-0 mt-2 text-lg text-ink-soft">Find someone nearby and pick a time that suits you.</p>
              <LinkButton to="/services" className="mt-5">Find a provider</LinkButton>
            </>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Stat label="Upcoming" value={upcoming.length} hint="bookings on your calendar" />
          <Stat label="Completed" value={completed} hint="jobs done" />
        </div>
      </div>

      <section className="mt-12" aria-labelledby="try-h">
        <SectionTitle id="try-h">Neighbours to try</SectionTitle>
        {providers.isPending ? (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {[0, 1, 2].map((i) => <li key={i}><Skeleton className="h-52 rounded-card" /></li>)}
          </ul>
        ) : suggestions.length ? (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {suggestions.map((p, i) => <ProviderCard key={p._id} provider={p} index={i} />)}
          </ul>
        ) : (
          <EmptyState title="No providers yet">
            Once neighbours sign up as providers they will appear here.
          </EmptyState>
        )}
      </section>
    </Page>
  );
}
