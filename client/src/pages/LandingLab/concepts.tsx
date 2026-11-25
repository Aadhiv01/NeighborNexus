import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import type { Provider } from "../../lib/types";
import { addDays, describeNext, formatTime, isoDate } from "../../lib/date";
import { LinkButton } from "../../ui/Button";
import { Neighbourhood } from "../../ui/Neighbourhood";
import { EmptyState } from "../../ui/Feedback";
import { CountUp, ForProviders, HeroSearch, HowItWorks, Promises, categoriesOfAll } from "./parts";

interface P { providers: Provider[]; loading: boolean }

const NoData = () => (
  <EmptyState title="No live data yet">
    This page shows real providers from the API. Start the API and run <code>npm run seed</code> to see it filled in.
  </EmptyState>
);

/* ───────── A. Editorial: words first, calm ───────── */
export function EditorialConcept({ providers }: P) {
  const cats = categoriesOfAll(providers);
  return (
    <>
      <section className="grid grid-cols-1 items-center gap-10 py-10 md:grid-cols-[1.15fr_1fr] md:py-16">
        <div>
          <p className="m-0 mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Local services, booked in a minute</p>
          <h1 className="m-0 font-display text-5xl font-bold leading-[1.03] tracking-tight md:text-7xl">
            Good help lives <span className="text-accent">down the street.</span>
          </h1>
          <p className="mb-8 mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
            Plumbers, cleaners and fixers from your own neighbourhood. See real openings, book in under a minute, and
            change your mind without a phone call.
          </p>
          <HeroSearch categories={cats} />
        </div>
        <Neighbourhood className="w-full max-w-[560px] justify-self-center" />
      </section>

      <dl className="m-0 grid grid-cols-3 gap-4 border-y border-line py-6 text-center">
        {[
          [providers.length, "neighbours listed"],
          [cats.length, "kinds of help"],
          [providers.filter((p) => p.nextAvailable).length, "free to book this week"],
        ].map(([n, l]) => (
          <div key={l as string}>
            <dd className="m-0 font-display text-4xl font-bold"><CountUp value={n as number} /></dd>
            <dt className="text-sm text-ink-soft">{l}</dt>
          </div>
        ))}
      </dl>
      <HowItWorks />
      <ForProviders />
      <Promises />
    </>
  );
}

/* ───────── B. Live board: the data is the hero ───────── */
const DAYS = 14;

function Timeline({ providers }: { providers: Provider[] }) {
  const reduce = useReducedMotion();
  const today = isoDate(new Date());
  const ticks = Array.from({ length: DAYS }, (_, i) => addDays(new Date(), i));
  const dayIndex = (date: string) => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
  const rows = [...providers].sort((a, b) => (a.nextAvailable ? dayIndex(a.nextAvailable.date) : 99) - (b.nextAvailable ? dayIndex(b.nextAvailable.date) : 99));

  return (
    <div>
      <div className="grid grid-cols-[8rem_1fr] gap-3 text-xs text-ink-soft sm:grid-cols-[11rem_1fr]">
        <span />
        <div className="grid grid-cols-[repeat(14,1fr)] text-center" aria-hidden>
          {ticks.map((d, i) => (
            <span key={i} className={i === 0 ? "font-bold text-ink" : ""}>{i === 0 ? "Today" : d.getDate()}</span>
          ))}
        </div>
      </div>
      <ul className="m-0 mt-2 grid list-none gap-2 p-0">
        {rows.map((p, r) => {
          const i = p.nextAvailable ? dayIndex(p.nextAvailable.date) : -1;
          return (
            <li key={p._id} className="grid grid-cols-[8rem_1fr] items-center gap-3 sm:grid-cols-[11rem_1fr]">
              <Link to={`/services/${p.userId}`} viewTransition className="truncate font-semibold hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
                {p.name}
                <span className="block truncate text-xs font-normal text-ink-soft">{p.services[0]?.category}</span>
              </Link>
              <div
                className="relative h-9 rounded-ui bg-surface-2"
                style={{ backgroundImage: "linear-gradient(to right, var(--line) 1px, transparent 1px)", backgroundSize: `${100 / DAYS}% 100%` }}
              >
                {p.nextAvailable && i >= 0 && i < DAYS ? (
                  <motion.span
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: reduce ? 0 : 0.15 + r * 0.12, type: "spring", stiffness: 380, damping: 22 }}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink shadow-md"
                    style={{ left: `${((i + 0.5) / DAYS) * 100}%` }}
                  >
                    {formatTime(p.nextAvailable.start)}
                  </motion.span>
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-xs text-ink-soft">No openings in 2 weeks</span>
                )}
                <span className="sr-only">{p.nextAvailable ? `Next free ${describeNext(p.nextAvailable)}` : "No openings in the next two weeks"}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LiveBoardConcept({ providers, loading }: P) {
  const soonest = providers.filter((p) => p.nextAvailable).sort((a, b) => `${a.nextAvailable!.date} ${a.nextAvailable!.start}`.localeCompare(`${b.nextAvailable!.date} ${b.nextAvailable!.start}`))[0];
  return (
    <>
      <section className="py-10 md:py-14">
        <p className="m-0 mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold">
          <span className="nn-motion h-2 w-2 rounded-full bg-good" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden /> Live from the neighbourhood
        </p>
        <h1 className="m-0 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          {soonest ? (
            <>The soonest opening is <span className="text-accent">{describeNext(soonest.nextAvailable!)}</span>.</>
          ) : (
            <>See who is free <span className="text-accent">before you call.</span></>
          )}
        </h1>
        <p className="mb-8 mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Every dot is a real next free time, taken from each provider's own hours and bookings.
        </p>
        <div className="rounded-card border border-line bg-surface p-5 md:p-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-display text-2xl font-semibold">Next free, over two weeks</h2>
            <span className="text-sm text-ink-soft">Select a name to see their times</span>
          </div>
          {providers.length ? <Timeline providers={providers} /> : loading ? <p className="m-0 text-ink-soft">Loading…</p> : <NoData />}
        </div>
        <div className="mt-8 max-w-2xl"><HeroSearch categories={categoriesOfAll(providers)} /></div>
      </section>
      <HowItWorks />
      <Promises />
      <ForProviders />
    </>
  );
}

/* ───────── C. The street: an interactive neighbourhood ───────── */
const ROOFS = ["var(--accent)", "var(--spark)", "var(--ink)", "var(--accent)", "var(--spark)"];
const HEIGHTS = [150, 120, 165, 130, 145];

export function StreetConcept({ providers }: P) {
  const shown = providers.slice(0, 5);
  const [id, setId] = useState<string | null>(null);
  const current = shown.find((p) => p._id === id) ?? shown[0];
  return (
    <>
      <section className="py-10 md:py-14">
        <h1 className="m-0 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Knock on a <span className="text-accent">door</span> near you.
        </h1>
        <p className="mb-8 mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Each house is a real provider in the neighbourhood. Pick one to see what they do and when they are next free.
        </p>

        {shown.length ? (
          <div className="rounded-card border border-line bg-surface p-5 md:p-8">
            <div role="group" aria-label="Providers on the street" className="flex items-end justify-center gap-2 border-b-2 border-line pb-0 sm:gap-6">
              {shown.map((p, i) => {
                const on = p._id === current?._id;
                const h = HEIGHTS[i % HEIGHTS.length];
                return (
                  <button
                    key={p._id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setId(p._id)}
                    className="group relative flex flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    <span className="sr-only">{p.name}, {p.services[0]?.category ?? "provider"}</span>
                    <svg viewBox="0 0 120 190" width="100%" style={{ maxWidth: 120, height: h + 30 }} aria-hidden className={`transition-transform duration-200 ${on ? "-translate-y-2" : "group-hover:-translate-y-1"}`}>
                      <path d={`M10 ${190 - 0}V${190 - h + 40}L60 ${190 - h}l50 40V190z`} fill={on ? "var(--accent-soft)" : "var(--surface-2)"} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
                      <path d={`M0 ${190 - h + 46}L60 ${190 - h - 6}l60 52`} fill="none" stroke={ROOFS[i % ROOFS.length]} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="46" y={190 - 56} width="28" height="56" rx="4" fill={ROOFS[i % ROOFS.length]} />
                      <circle cx="68" cy={190 - 28} r="2.5" fill="var(--bg)" />
                      <rect x="20" y={190 - h + 62} width="22" height="22" rx="4" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2.5" />
                      <rect x="78" y={190 - h + 62} width="22" height="22" rx="4" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2.5" />
                    </svg>
                    <span className={`absolute left-1/2 top-[55%] -translate-x-1/2 rounded-full px-2 py-0.5 font-display text-sm font-bold ${on ? "bg-accent text-accent-ink" : "bg-bg text-ink"}`} aria-hidden>
                      {p.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                  </button>
                );
              })}
            </div>
            {current && (
              <motion.div key={current._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mt-6 flex flex-wrap items-center justify-between gap-4" aria-live="polite">
                <div className="min-w-0">
                  <h2 className="m-0 font-display text-2xl font-semibold">{current.name}</h2>
                  <p className="m-0 text-ink-soft">{[...new Set(current.services.map((s) => s.category))].join(" · ")}{current.location ? ` · ${current.location}` : ""}</p>
                  <p className="mb-0 mt-2 inline-flex rounded-ui bg-accent-soft px-3 py-1.5 text-sm font-semibold">
                    {current.nextAvailable ? `Next free: ${describeNext(current.nextAvailable)}` : "No openings in the next 2 weeks"}
                  </p>
                </div>
                <LinkButton to={`/services/${current.userId}`} size="lg">View times</LinkButton>
              </motion.div>
            )}
          </div>
        ) : (
          <NoData />
        )}
        <div className="mt-8 max-w-2xl"><HeroSearch categories={categoriesOfAll(providers)} /></div>
      </section>
      <HowItWorks />
      <ForProviders />
      <Promises />
    </>
  );
}
