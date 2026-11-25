import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { Provider, Stats } from "../../lib/types";
import { money } from "../../lib/date";
import { Neighbourhood } from "../../ui/Neighbourhood";
import { LinkButton } from "../../ui/Button";

/** Full width horizontal band. Each tone is a different background, so sections never blur together. */
export function Band({ tone = "plain", id, label, children, className = "" }: {
  tone?: "plain" | "tint" | "ink"; id?: string; label?: string; children: ReactNode; className?: string;
}) {
  const tones = { plain: "bg-bg text-ink", tint: "bg-surface-2 text-ink", ink: "bg-ink text-bg" };
  return (
    <section id={id} aria-label={label} className={`${tones[tone]} ${className}`}>
      <div className="mx-auto max-w-[1240px] px-5 py-16 md:py-24">{children}</div>
    </section>
  );
}

/** Fades and lifts into view once. No movement at all for people who ask for reduced motion. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Kicker({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "ink" }) {
  return <p className={`m-0 mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone === "ink" ? "text-accent-soft" : "text-accent"}`}>{children}</p>;
}

export function H2({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "ink" }) {
  return <h2 className={`m-0 max-w-3xl font-display text-3xl font-bold leading-[1.08] tracking-tight md:text-5xl ${tone === "ink" ? "text-bg" : ""}`}>{children}</h2>;
}

/** The illustration drifts a little as the page scrolls. */
export function ParallaxArt({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -48]);
  return (
    <motion.div style={reduce ? undefined : { y }} className={className}>
      <Neighbourhood className="w-full" />
    </motion.div>
  );
}

/** Slowly scrolling strip of the kinds of help on offer. Pure decoration, so it is hidden from screen readers. */
export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div aria-hidden className="overflow-hidden border-y border-line bg-surface py-4">
      <div className="nn-motion flex w-max gap-10 whitespace-nowrap font-display text-2xl font-semibold" style={{ animation: "nn-marquee 40s linear infinite" }}>
        {[0, 1].map((k) => (
          <div key={k} className="flex gap-10">
            {row.map((t, i) => (
              <span key={i} className="flex items-center gap-10">
                {t}
                <span className="h-2 w-2 rounded-full bg-accent" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Open times on each of the next 7 days, across every provider. Real numbers from /api/stats. */
export function OpeningsChart({ stats, tone = "plain" }: { stats?: Stats; tone?: "plain" | "ink" }) {
  const reduce = useReducedMotion();
  const data = stats?.openings ?? [];
  const max = Math.max(1, ...data.map((d) => d.slots));
  const peak = data.reduce((best, d) => (d.slots > (best?.slots ?? -1) ? d : best), data[0]);
  const label = (date: string, i: number) => (i === 0 ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }));
  if (!data.length) return null;
  return (
    <figure className="m-0">
      <figcaption className={`mb-4 text-sm ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>Open times each day, across all providers</figcaption>
      <ol className="m-0 flex h-56 list-none items-end gap-2 p-0 sm:gap-4">
        {data.map((d, i) => (
          <li key={d.date} className="flex h-full flex-1 flex-col justify-end text-center">
            <span className={`mb-1 text-sm font-bold tabular-nums ${tone === "ink" ? "text-bg" : ""}`}>{d.slots}</span>
            <motion.div
              initial={reduce ? false : { height: 0 }}
              whileInView={{ height: `${Math.max(4, (d.slots / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
              style={reduce ? { height: `${Math.max(4, (d.slots / max) * 100)}%` } : undefined}
              className={`rounded-t-ui ${d === peak ? "bg-accent" : tone === "ink" ? "bg-accent-soft" : "bg-accent-soft"}`}
              title={`${d.slots} open times, ${d.providers} providers free`}
            />
            <span className={`mt-2 text-xs ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>{label(d.date, i)}</span>
          </li>
        ))}
      </ol>
      {peak && peak.slots > 0 && (
        <p className={`mb-0 mt-4 text-sm ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>
          Busiest day to find a time: <strong>{label(peak.date, data.indexOf(peak))}</strong>, with {peak.slots} open times.
        </p>
      )}
    </figure>
  );
}

/** Lowest to highest price for each kind of help, with the average marked. */
export function PriceRanges({ stats }: { stats?: Stats }) {
  const reduce = useReducedMotion();
  const cats = stats?.categories ?? [];
  const scale = Math.max(1, ...cats.map((c) => c.maxPrice));
  if (!cats.length) return null;
  return (
    <ul className="m-0 grid list-none gap-5 p-0">
      {cats.map((c, i) => {
        const left = (c.minPrice / scale) * 100;
        const width = Math.max(1.5, ((c.maxPrice - c.minPrice) / scale) * 100);
        return (
          <li key={c.name} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[11rem_1fr_13rem] sm:gap-5">
            <div>
              <p className="m-0 font-display text-xl font-semibold">{c.name}</p>
              <p className="m-0 text-sm text-ink-soft">{c.providers} {c.providers === 1 ? "provider" : "providers"}</p>
            </div>
            <div className="relative h-4 rounded-full bg-surface" aria-hidden>
              <motion.div
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                style={{ left: `${left}%`, width: `${width}%`, transformOrigin: "left" }}
                className="absolute top-0 h-full rounded-full bg-accent"
              />
              <span className="absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${(c.avgPrice / scale) * 100}%` }} />
            </div>
            <p className="m-0 text-sm tabular-nums sm:text-right">
              <strong>{money(c.minPrice)}</strong>{c.maxPrice !== c.minPrice && <> to <strong>{money(c.maxPrice)}</strong></>}
              <span className="block text-ink-soft">average {money(c.avgPrice)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Big animated number with a label. */
export function Metric({ value, label, suffix = "", tone = "plain" }: { value: number; label: string; suffix?: string; tone?: "plain" | "ink" }) {
  return (
    <div>
      <p className={`m-0 font-display text-5xl font-bold leading-none md:text-7xl ${tone === "ink" ? "text-accent-soft" : "text-accent"}`}>
        <Count value={value} />{suffix}
      </p>
      <p className={`mb-0 mt-2 text-base ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>{label}</p>
    </div>
  );
}

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce || !ref.current) return setShown(value);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / 1000);
        setShown(Math.round(value * (1 - (1 - t) ** 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, reduce]);
  return <span ref={ref} className="tabular-nums" aria-label={String(value)}>{shown}</span>;
}

/* ───────── "How it works" that follows the scroll ───────── */

const STEPS = [
  { title: "Find someone nearby", text: "Search by what you need, or switch on your location and see who is close, nearest first." },
  { title: "Pick a real time", text: "Every provider shows when they are next free. You only ever see times that are open, and they update live." },
  { title: "Book, and change your mind", text: "Get a reminder before it starts. Reschedule until 12 hours before, or cancel any time." },
];

function StepVisual({ step, providers }: { step: number; providers: Provider[] }) {
  const [a, b] = providers.length ? providers : [];
  const shell = "rounded-card border border-line bg-surface p-5 shadow-[0_20px_50px_-30px_var(--ink)]";
  if (step === 0)
    return (
      <div className={shell} aria-hidden>
        <p className="m-0 rounded-ui border border-line bg-bg px-4 py-3 text-ink-soft">leaking tap</p>
        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {[a, b].filter(Boolean).map((p) => (
            <li key={p!._id} className="flex items-center justify-between rounded-ui bg-surface-2 px-4 py-3">
              <span className="font-semibold">{p!.name}</span>
              <span className="text-sm text-ink-soft">{p!.services[0]?.category}</span>
            </li>
          ))}
          {!a && <li className="rounded-ui bg-surface-2 px-4 py-3 font-semibold">Maya Chen · Plumbing</li>}
        </ul>
      </div>
    );
  if (step === 1)
    return (
      <div className={shell} aria-hidden>
        <div className="flex gap-2">{["Tue", "Wed", "Thu", "Fri"].map((d, i) => <span key={d} className={`rounded-ui px-3 py-2 text-sm font-semibold ${i === 1 ? "bg-accent text-accent-ink" : "border border-line"}`}>{d}</span>)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["9:00", "9:30", "10:00", "10:30", "11:00", "11:30"].map((t, i) => (
            <span key={t} className={`rounded-ui border px-3 py-2 text-center text-sm font-semibold tabular-nums ${i === 2 ? "border-transparent bg-accent text-accent-ink" : i === 1 ? "border-line text-ink-soft line-through" : "border-line"}`}>{t}</span>
          ))}
        </div>
        <p className="mb-0 mt-3 flex items-center gap-2 text-xs text-ink-soft"><span className="h-2 w-2 rounded-full bg-good" /> Updating live</p>
      </div>
    );
  return (
    <div className={shell} aria-hidden>
      <p className="m-0 font-display text-2xl font-semibold text-good">Booked ✓</p>
      <p className="mb-0 mt-2">Emergency leak repair · Wed 10:00 AM</p>
      <p className="mb-0 mt-1 text-sm text-ink-soft">Reminder set for the day before</p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-ui border border-line px-3 py-2 text-sm font-semibold">Reschedule</span>
        <span className="rounded-ui border border-warn px-3 py-2 text-sm font-semibold text-warn">Cancel</span>
      </div>
    </div>
  );
}

export function StickySteps({ providers }: { providers: Provider[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
      <ol className="m-0 grid list-none gap-6 p-0 md:gap-[28vh]">
        {STEPS.map((s, i) => (
          <li key={s.title} ref={(el) => { refs.current[i] = el; }} data-step={i} className={`border-l-4 pl-6 transition-colors duration-300 md:min-h-[30vh] ${active === i ? "border-accent" : "border-line"}`}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-display text-xl font-bold text-accent-ink" aria-hidden>{i + 1}</span>
            <h3 className="mb-0 mt-4 font-display text-3xl font-bold">{s.title}</h3>
            <p className="mb-0 mt-2 max-w-md text-lg leading-relaxed text-ink-soft">{s.text}</p>
            <div className="mt-5 md:hidden"><StepVisual step={i} providers={providers} /></div>
          </li>
        ))}
      </ol>
      <div className="hidden md:block">
        <div className="sticky top-32">
          <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <StepVisual step={active} providers={providers} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ───────── FAQ, final call to action ───────── */

const FAQ: [string, string][] = [
  ["How do I know a time is really free?", "Times come from each provider's own weekly hours minus their existing bookings. If two people try for the same time at once, the system gives it to one and tells the other straight away."],
  ["Do I pay through the app?", "Not yet. Each service shows its price, and you settle it with the provider. Payments will only be added when there is a clear need for them."],
  ["What if I need to change or cancel?", "You can cancel any time. You can reschedule until 12 hours before the start. The rules are shown on your booking."],
  ["What if the provider cancels?", "You are told straight away in the app, and by email where email is switched on."],
  ["Is my location shared?", "Only if you press Use my location, and then it is used for that search and never stored. Providers' locations are rounded to about 1 km, so no one's address is published."],
  ["How do providers join?", "Sign up as a provider, add your services and weekly hours, and members can book you. It is free to list."],
];

export function Faq({ tone = "plain" }: { tone?: "plain" | "tint" }) {
  return (
    <div className="mx-auto max-w-3xl">
      {FAQ.map(([q, a]) => (
        <details key={q} className={`group border-b border-line py-5 ${tone === "tint" ? "" : ""}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            {q}
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xl transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mb-0 mt-3 max-w-2xl leading-relaxed text-ink-soft">{a}</p>
        </details>
      ))}
    </div>
  );
}

export function ProviderBand() {
  return (
    <Band tone="ink" label="For providers">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <Kicker tone="ink">For providers</Kicker>
          <H2 tone="ink">Do the work? Take bookings your way.</H2>
          <p className="mb-0 mt-5 max-w-xl text-lg leading-relaxed text-bg">
            Set your weekly hours once, and members can only book times you are free. You are told about every booking,
            move and cancellation, you see your own record, and it costs nothing to list yourself.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="m-0 grid list-none gap-3 p-0 text-bg">
            {["Your hours, your prices", "No double booking, ever", "Live updates when someone books", "Free to list"].map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-card border border-bg/30 px-5 py-4 text-lg font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-sm text-ink" aria-hidden>✓</span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton to="/signup" size="lg" className="!bg-accent-soft !text-ink">Offer your services</LinkButton>
          </div>
        </Reveal>
      </div>
    </Band>
  );
}

export function FinalCta() {
  return (
    <Band tone="tint" label="Get started">
      <Reveal className="text-center">
        <H2>Your neighbours are free to help.</H2>
        <p className="mx-auto mb-8 mt-4 max-w-xl text-lg text-ink-soft">Find someone, pick a real time, and be done in under a minute.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton to="/services" size="lg">Find help now</LinkButton>
          <LinkButton to="/signup" variant="secondary" size="lg">Create an account</LinkButton>
        </div>
      </Reveal>
    </Band>
  );
}
