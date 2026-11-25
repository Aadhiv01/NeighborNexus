import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import type { Provider, Stats } from "../../lib/types";
import { addDays, describeNext, formatTime, isoDate } from "../../lib/date";
import { LinkButton } from "../../ui/Button";
import { EmptyState } from "../../ui/Feedback";
import { HeroSearch, HowItWorks, categoriesOfAll } from "./parts";
import { Band, Faq, FinalCta, FoundingNote, H2, Kicker, Metric, OpeningsChart, PriceRanges, ProviderBand, StickySteps } from "./blocks";
import { Neighbourhood } from "../../ui/Neighbourhood";

interface P { providers: Provider[]; stats?: Stats; loading: boolean }

const NoData = () => (
  <EmptyState title="No live data yet">
    This page shows real providers from the API. Start the API and run <code>npm run seed</code> to see it filled in.
  </EmptyState>
);

const totalOpen = (s?: Stats) => s?.openings.reduce((n, o) => n + o.slots, 0) ?? 0;
const freeToday = (s?: Stats) => s?.openings[0]?.providers ?? 0;

/* ───────── A. The story: scroll it, light and editorial ───────── */
export function EditorialConcept({ providers, stats }: P) {
  const cats = stats?.categories.map((c) => c.name) ?? categoriesOfAll(providers);
  return (
    <>
      <Band label="Welcome" className="overflow-hidden">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <Kicker>Local services, booked in a minute</Kicker>
            <h1 className="m-0 font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
              Good help lives <span className="text-accent">down the street.</span>
            </h1>
            <p className="mb-8 mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              Plumbers, cleaners and fixers from your own neighbourhood. See real openings, book in under a minute, and
              change your mind without a phone call.
            </p>
            <HeroSearch categories={cats} />
            <FoundingNote count={stats?.providers ?? providers.length} />
          </div>
          <Neighbourhood className="w-full max-w-[560px] justify-self-center" />
        </div>
      </Band>
      <Band tone="tint" label="The neighbourhood in numbers">
        <div><Kicker>Right now</Kicker><H2>The neighbourhood, in numbers.</H2></div>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <Metric value={stats?.providers ?? providers.length} label="neighbours listed" />
          <Metric value={cats.length} label="kinds of help" />
          <Metric value={totalOpen(stats)} label="open times this week" />
          <Metric value={freeToday(stats)} label="free to book today" />
        </div>
        <div className="mt-14 rounded-card bg-surface p-6 md:p-10"><OpeningsChart stats={stats} /></div>
      </Band>
      <Band label="How it works">
        <div><Kicker>How it works</Kicker><H2>Three steps, no phone calls.</H2></div>
        <div className="mt-14"><StickySteps providers={providers} /></div>
      </Band>
      <Band tone="tint" label="Typical prices">
        <div><Kicker>Know before you book</Kicker><H2>What things cost around here.</H2></div>
        <p className="mb-10 mt-4 max-w-2xl text-lg text-ink-soft">The bar runs from the lowest to the highest price listed. The dark tick is the average.</p>
        <PriceRanges stats={stats} />
      </Band>
      <ProviderBand />
      <Band label="Questions"><div><Kicker>Good to know</Kicker><H2>Questions, answered plainly.</H2></div><div className="mt-10"><Faq /></div></Band>
      <FinalCta />
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

/* ───────── B. Live board: the data is the hero, dark and bold ───────── */
export function LiveBoardConcept({ providers, stats, loading }: P) {
  const cats = stats?.categories.map((c) => c.name) ?? categoriesOfAll(providers);
  const soonest = providers.filter((p) => p.nextAvailable).sort((a, b) => `${a.nextAvailable!.date} ${a.nextAvailable!.start}`.localeCompare(`${b.nextAvailable!.date} ${b.nextAvailable!.start}`))[0];
  return (
    <>
      <Band tone="ink" label="Live availability">
        <p className="m-0 mb-4 inline-flex items-center gap-2 rounded-full border border-bg px-3 py-1 text-xs font-semibold text-bg">
          <span className="nn-motion h-2 w-2 rounded-full bg-good" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden /> Live from the neighbourhood
        </p>
        <h1 className="m-0 max-w-4xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-bg md:text-7xl">
          {soonest ? (<>The soonest opening is <span className="text-accent-soft">{describeNext(soonest.nextAvailable!)}</span>.</>) : (<>See who is free <span className="text-accent-soft">before you call.</span></>)}
        </h1>
        <p className="mb-10 mt-5 max-w-2xl text-lg leading-relaxed text-bg">Every dot is a real next free time, worked out from each provider's own hours and bookings.</p>
        <div className="rounded-card bg-surface p-5 text-ink md:p-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-display text-2xl font-semibold">Next free, over two weeks</h2>
            <span className="text-sm text-ink-soft">Select a name to see their times</span>
          </div>
          {providers.length ? <Timeline providers={providers} /> : loading ? <p className="m-0 text-ink-soft">Loading…</p> : <NoData />}
        </div>
        <div className="mt-8 max-w-2xl"><HeroSearch categories={cats} tone="ink" /><FoundingNote tone="ink" count={stats?.providers ?? providers.length} /></div>
      </Band>
      <Band label="Openings this week">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1.4fr_1fr]">
          <div><div className="rounded-card border border-line bg-surface p-6 md:p-8"><OpeningsChart stats={stats} /></div></div>
          <div>
            <Kicker>This week</Kicker>
            <H2>{totalOpen(stats)} open times, waiting.</H2>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <Metric value={stats?.providers ?? providers.length} label="neighbours" />
              <Metric value={freeToday(stats)} label="free today" />
            </div>
          </div>
        </div>
      </Band>
      <Band tone="tint" label="Typical prices">
        <div><Kicker>Price check</Kicker><H2>The going rate, by kind of help.</H2></div>
        <div className="mt-10"><PriceRanges stats={stats} /></div>
      </Band>
      <Band label="How it works">
        <div><Kicker>How it works</Kicker><H2>Pick, book, done.</H2></div>
        <div className="mt-10"><HowItWorks /></div>
      </Band>
      <ProviderBand />
      <Band tone="tint" label="Questions"><div><Kicker>Good to know</Kicker><H2>Questions, answered plainly.</H2></div><div className="mt-10"><Faq /></div></Band>
      <FinalCta />
    </>
  );
}

/* ───────── C. The street: an interactive neighbourhood ───────── */
const ROOFS = ["var(--accent)", "var(--spark)", "var(--ink)", "var(--accent)", "var(--spark)"];
const HEIGHTS = [150, 120, 165, 130, 145];

/* ───────── C. The street: play with it ───────── */
export function StreetConcept({ providers, stats }: P) {
  const shown = providers.slice(0, 5);
  const [id, setId] = useState<string | null>(null);
  const current = shown.find((p) => p._id === id) ?? shown[0];
  const cats = stats?.categories.map((c) => c.name) ?? categoriesOfAll(providers);
  return (
    <>
      <Band tone="tint" label="Providers on the street">
        <h1 className="m-0 max-w-3xl font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
          Knock on a <span className="text-accent">door</span> near you.
        </h1>
        <p className="mb-10 mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
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
        <div className="mt-8 max-w-2xl"><HeroSearch categories={cats} /><FoundingNote count={stats?.providers ?? providers.length} /></div>
      </Band>
      <Band label="In numbers">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <Metric value={stats?.providers ?? providers.length} label="neighbours listed" />
          <Metric value={cats.length} label="kinds of help" />
          <Metric value={totalOpen(stats)} label="open times this week" />
          <Metric value={freeToday(stats)} label="free to book today" />
        </div>
      </Band>
      <Band tone="tint" label="How it works">
        <div><Kicker>How it works</Kicker><H2>Three steps, no phone calls.</H2></div>
        <div className="mt-10"><HowItWorks /></div>
      </Band>
      <Band label="Openings and prices">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div><Kicker>When</Kicker><h2 className="mb-6 mt-0 font-display text-3xl font-bold">Open times, day by day.</h2><OpeningsChart stats={stats} /></div>
          <div><Kicker>How much</Kicker><h2 className="mb-6 mt-0 font-display text-3xl font-bold">What things cost.</h2><PriceRanges stats={stats} /></div>
        </div>
      </Band>
      <ProviderBand />
      <Band tone="tint" label="Questions"><div><Kicker>Good to know</Kicker><H2>Questions, answered plainly.</H2></div><div className="mt-10"><Faq /></div></Band>
      <FinalCta />
    </>
  );
}
