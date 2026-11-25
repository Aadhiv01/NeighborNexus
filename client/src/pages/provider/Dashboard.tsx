import { useQuery } from "@tanstack/react-query";
import { api, qk } from "../../lib/api";
import { formatBookingDate, nameOf, timeRange } from "../../lib/date";
import { useUser } from "../../auth/UserContext";
import Page from "../../layout/Page";
import { Card, PageHeader, SectionTitle, Stat } from "../../ui/Display";
import { LinkButton } from "../../ui/Button";
import { EmptyState, Skeleton } from "../../ui/Feedback";
import Donut from "../../ui/Donut";
import { BoltIcon, CalendarIcon, ListIcon, ToolboxIcon, UserIcon } from "../../ui/Icons";
import { Link } from "react-router-dom";

const ACTIONS = [
  { to: "/dashboard/serviceprovider/bookings", label: "Bookings", text: "Complete or cancel", icon: ListIcon },
  { to: "/dashboard/serviceprovider/services", label: "My services", text: "What people can book", icon: ToolboxIcon },
  { to: "/dashboard/serviceprovider/availability", label: "Availability", text: "Your weekly hours", icon: CalendarIcon },
  { to: "/dashboard/serviceprovider/profile", label: "Profile", text: "Bio, area and contact", icon: UserIcon },
];

export default function ProviderDashboard() {
  const { user } = useUser();
  const profile = useQuery({ queryKey: qk.providerProfile, queryFn: api.myProfile, enabled: Boolean(user) });
  const bookingsQ = useQuery({ queryKey: qk.providerBookings, queryFn: api.providerBookings, enabled: Boolean(user) });

  const bookings = bookingsQ.data ?? [];
  const count = (s: string) => bookings.filter((b) => b.status === s).length;
  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const byYou = bookings.filter((b) => b.status === "canceled" && b.canceledBy === "provider");
  const lateByYou = byYou.filter((b) => (b.canceledHoursBefore ?? 99) < 24).length;
  const services = profile.data?.services ?? [];
  const hasHours = (profile.data?.availability ?? []).some((a) => a.slots.length > 0);
  const rating = profile.data?.rating ?? 0;
  const reviewCount = profile.data?.reviews?.length ?? 0;
  const needsSetup = profile.isSuccess && (!services.length || !hasHours);

  return (
    <Page title="Dashboard">
      <PageHeader
        eyebrow="Provider dashboard"
        title={`Welcome back, ${(profile.data?.name || user?.name || "").split(" ")[0]}.`}
        subtitle="Who is coming up, how things are going, and what to do next."
      />

      {needsSetup && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-accent bg-accent-soft p-6">
          <div>
            <h2 className="m-0 flex items-center gap-2 font-display text-2xl font-semibold">
              <BoltIcon className="text-accent" /> Finish setting up
            </h2>
            <p className="mb-0 mt-1 text-ink">
              Members can’t book you until you have{" "}
              {!services.length && !hasHours ? "a service and weekly hours" : !services.length ? "a service" : "weekly hours"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!services.length && <LinkButton to="/dashboard/serviceprovider/services">Add a service</LinkButton>}
            {!hasHours && <LinkButton to="/dashboard/serviceprovider/availability" variant={services.length ? "primary" : "secondary"}>Set your hours</LinkButton>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Upcoming" value={bookingsQ.isPending ? "–" : count("upcoming")} />
        <Stat label="Completed" value={bookingsQ.isPending ? "–" : count("completed")} />
        <Stat
          label="Canceled by you"
          value={bookingsQ.isPending ? "–" : byYou.length}
          hint={byYou.length ? `${lateByYou} within 24 hours of the start. Only you can see this.` : "Only you can see this."}
        />
        <Stat label="Services" value={profile.isPending ? "–" : services.length} />
        <Stat
          label="Rating"
          value={rating ? rating.toFixed(1) : "New"}
          hint={reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle>Coming up</SectionTitle>
            <LinkButton to="/dashboard/serviceprovider/bookings" variant="ghost" size="sm">All bookings</LinkButton>
          </div>
          {bookingsQ.isPending ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : upcoming.length === 0 ? (
            <EmptyState title="Nothing booked yet">New bookings will appear here as members book you.</EmptyState>
          ) : (
            <ul className="m-0 list-none divide-y divide-line p-0">
              {upcoming.slice(0, 4).map((b) => (
                <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="m-0 font-semibold">{b.serviceName || "Service"}</p>
                    <p className="m-0 text-sm text-ink-soft">with {nameOf(b.user, "a member")}</p>
                  </div>
                  <p className="m-0 text-sm tabular-nums">
                    {formatBookingDate(b.date)} · {timeRange(b.startTime, b.endTime)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <SectionTitle>Booking mix</SectionTitle>
          <Donut
            title="Bookings by status"
            segments={[
              { label: "Upcoming", value: count("upcoming"), color: "var(--accent)" },
              { label: "Completed", value: count("completed"), color: "var(--good)" },
              { label: "Canceled", value: count("canceled"), color: "var(--warn)" },
            ]}
          />
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="go-h">
        <SectionTitle id="go-h">Go to</SectionTitle>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ to, label, text, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex h-full items-center gap-4 rounded-card border border-line bg-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ui bg-accent-soft text-accent"><Icon /></span>
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-ink-soft">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
