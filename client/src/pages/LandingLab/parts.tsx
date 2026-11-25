import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import type { Provider } from "../../lib/types";
import { Button, LinkButton } from "../../ui/Button";
import { SearchIcon } from "../../ui/Icons";

export const categoriesOfAll = (providers: Provider[]) => [...new Set(providers.flatMap((p) => p.services.map((s) => s.category)))].sort();

/** The search box on every landing concept. It hands over to the discovery page. */
export function HeroSearch({ categories }: { categories: string[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const go = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/services?q=${encodeURIComponent(q.trim())}` : "/services", { viewTransition: true });
  };
  return (
    <div>
      <form onSubmit={go} role="search" aria-label="Search providers" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 sm:flex-row">
        <label htmlFor="hero-q" className="sr-only">What do you need done?</label>
        <span className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            id="hero-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="A leaking tap, a deep clean…"
            className="w-full rounded-ui bg-transparent py-3 pl-10 pr-3 text-base placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-accent"
          />
        </span>
        <Button type="submit" size="lg">Find help</Button>
      </form>
      {categories.length > 0 && (
        <p className="mb-0 mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          Popular:
          {categories.slice(0, 5).map((c) => (
            <Link key={c} to={`/services?category=${encodeURIComponent(c)}`} viewTransition className="rounded-full border border-line px-3 py-1 font-semibold text-ink hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent">
              {c}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}

/** Counts up to `value` once, unless the person prefers reduced motion. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (reduce) return setShown(value);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, reduce]);
  return <span className={`tabular-nums ${className}`} aria-label={String(value)}>{shown}</span>;
}

const STEPS = [
  { n: "1", title: "Find someone nearby", text: "Search by what you need, or switch on your location to see who is close." },
  { n: "2", title: "Pick a real time", text: "Every provider shows when they are next free. You only ever see times that are actually open." },
  { n: "3", title: "Book, and change your mind", text: "Get a reminder before it starts. Reschedule up to 12 hours before, or cancel any time." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-h" className="py-14">
      <h2 id="how-h" className="m-0 font-display text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
      <ol className="m-0 mt-8 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-card border border-line bg-surface p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-ink" aria-hidden>{s.n}</span>
            <h3 className="mb-0 mt-4 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mb-0 mt-2 leading-relaxed text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ForProviders() {
  return (
    <section aria-labelledby="prov-h" className="grid grid-cols-1 items-center gap-6 rounded-card bg-surface-2 p-8 md:grid-cols-[1.4fr_1fr] md:p-10">
      <div>
        <h2 id="prov-h" className="m-0 font-display text-3xl font-bold tracking-tight">Do the work? Take bookings your way.</h2>
        <p className="mb-0 mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
          Set your weekly hours once and members book only times you are free. You are told about every booking, move
          and cancellation, and you see your own record. No fees to list yourself.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 md:justify-end">
        <LinkButton to="/signup" size="lg">Offer your services</LinkButton>
        <LinkButton to="/services" variant="secondary" size="lg">See who is here</LinkButton>
      </div>
    </section>
  );
}

const PROMISES = [
  ["Real openings", "Times come from each provider's own weekly hours and existing bookings."],
  ["No double booking", "Two people cannot get the same time. The system settles it for you."],
  ["Plain rules", "Cancel any time. Reschedule until 12 hours before. Stated up front."],
];

export function Promises() {
  return (
    <section aria-label="What you can count on" className="grid grid-cols-1 gap-6 py-14 md:grid-cols-3">
      {PROMISES.map(([t, d]) => (
        <div key={t} className="border-l-4 border-accent pl-5">
          <h3 className="m-0 font-display text-xl font-semibold">{t}</h3>
          <p className="mb-0 mt-1 leading-relaxed text-ink-soft">{d}</p>
        </div>
      ))}
    </section>
  );
}
