import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import "./fonts";
import { useThemeSettings, DEFAULTS, type Palette } from "../../theme/themeStore";
import { contrast, grade } from "../../theme/contrast";
import { Segmented } from "./Segmented";

const PALETTES: { value: Palette; label: string; dots: [string, string, string] }[] = [
  { value: "paper", label: "Paper", dots: ["#faf5ec", "#a8431a", "#526b49"] },
  { value: "harbor", label: "Harbor", dots: ["#f1f5f4", "#0e6a6e", "#b87400"] },
  { value: "porch", label: "Porch Light", dots: ["#1c1815", "#e9a23b", "#c9786a"] },
];

const dots = (d: [string, string, string]) => (
  <span className="flex -space-x-1" aria-hidden>
    {d.map((c) => (
      <span key={c} className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: c }} />
    ))}
  </span>
);

const PROVIDERS = [
  { name: "Maya Chen", trade: "Plumbing", area: "Maple Hill", rating: 4.9, jobs: 212, price: 120, next: "Today, 3:30 PM", live: true, emergency: true },
  { name: "Daniel Okafor", trade: "Electrical", area: "North Ward", rating: 4.8, jobs: 164, price: 150, next: "Tomorrow, 9:00 AM", live: false, emergency: false },
  { name: "Priya Raman", trade: "Cleaning", area: "Riverside", rating: 4.9, jobs: 341, price: 90, next: "Today, 5:00 PM", live: true, emergency: false },
];

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:30", "16:00", "16:30"];
const TAKEN = new Set(["10:00", "13:30", "15:30"]);

const Star = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden className="fill-spark">
    <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.1 1.1 6L10 15l-5.3 2.9 1.1-6L1.4 7.8l6-.8z" />
  </svg>
);

function Monogram({ name, i }: { name: string; i: number }) {
  const tone = ["bg-accent-soft text-accent", "bg-surface-2 text-ink", "bg-accent text-accent-ink"][i % 3];
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg ${tone}`} aria-hidden>
      {name.split(" ").map((p) => p[0]).join("")}
    </span>
  );
}

function days() {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" });
  return Array.from({ length: 7 }, (_, n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return { key: n, label: n === 0 ? "Today" : fmt.format(d) };
  });
}

const btn =
  "inline-flex items-center justify-center gap-2 rounded-ui px-4 py-2 text-sm font-semibold transition-[transform,background-color,box-shadow] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function ThemeLab() {
  const [s, setS] = useThemeSettings();
  const reduce = useReducedMotion();
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>("14:00");
  const [booked, setBooked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pairs, setPairs] = useState<{ label: string; ratio: number }[]>([]);
  const dayList = useMemo(days, []);

  // Read the live token values so the contrast numbers always match what is on screen.
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    setPairs([
      { label: "Text on page", ratio: contrast(v("--ink"), v("--bg")) },
      { label: "Soft text on page", ratio: contrast(v("--ink-soft"), v("--bg")) },
      { label: "Soft text on card", ratio: contrast(v("--ink-soft"), v("--surface")) },
      { label: "Button text on accent", ratio: contrast(v("--accent-ink"), v("--accent")) },
      { label: "Accent text on card", ratio: contrast(v("--accent"), v("--surface")) },
    ]);
  }, [s]);

  const copyPick = async () => {
    const text = `NeighborNexus theme pick: palette=${s.palette}, type=${s.type}, mode=${s.mode}, corners=${s.radius}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-auto bg-bg font-body text-ink antialiased"
      style={{ colorScheme: s.mode }}
    >
      {/* Controls */}
      <header className="z-20 md:sticky md:top-0 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-end gap-x-6 gap-y-3 px-5 py-3">
          <div className="mr-auto">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Temporary route</p>
            <h1 className="m-0 font-display text-2xl leading-none">Theme lab</h1>
          </div>
          <Segmented
            legend="Palette"
            name="palette"
            value={s.palette}
            onChange={(palette) => setS({ ...s, palette })}
            options={PALETTES.map((p) => ({ value: p.value, label: p.label, hint: dots(p.dots) }))}
          />
          <Segmented
            legend="Type"
            name="type"
            value={s.type}
            onChange={(type) => setS({ ...s, type })}
            options={[
              { value: "editorial", label: "Editorial" },
              { value: "modern", label: "Modern" },
              { value: "soft", label: "Soft" },
            ]}
          />
          <Segmented
            legend="Mode"
            name="mode"
            value={s.mode}
            onChange={(mode) => setS({ ...s, mode })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <Segmented
            legend="Corners"
            name="radius"
            value={s.radius}
            onChange={(radius) => setS({ ...s, radius })}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "soft", label: "Soft" },
              { value: "round", label: "Round" },
            ]}
          />
          <div className="flex gap-2">
            <button className={`${btn} border border-line bg-surface hover:bg-surface-2`} onClick={() => setS(DEFAULTS)}>
              Reset
            </button>
            <button className={`${btn} bg-accent text-accent-ink hover:brightness-110`} onClick={copyPick}>
              {copied ? "Copied" : "Copy my pick"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-10">
        {/* Hero */}
        <section className="grid grid-cols-1 items-end gap-8 pb-14 pt-4 md:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="m-0 mb-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <span className="nn-motion h-2 w-2 rounded-full bg-accent" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden />
              14 neighbours available this afternoon
            </p>
            <h2 className="m-0 font-display text-5xl leading-[1.04] tracking-tight md:text-6xl">
              Good help lives down the street.
            </h2>
            <p className="mb-0 mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              Plumbers, cleaners and fixers from your own neighbourhood. See real openings, book in under a
              minute, and change your mind without a phone call.
            </p>
          </div>
          <form
            className="rounded-card border border-line bg-surface p-4 shadow-[0_1px_0_var(--line)]"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="q" className="mb-1 block text-sm font-semibold">What do you need done?</label>
            <input
              id="q"
              placeholder="A leaking tap, Saturday morning"
              className="w-full rounded-ui border border-line bg-bg px-3 py-2.5 text-base placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
            <div className="mt-3 flex gap-2">
              <select
                aria-label="Category"
                className="min-w-0 flex-1 rounded-ui border border-line bg-bg px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option>Any category</option>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Cleaning</option>
              </select>
              <button className={`${btn} bg-accent px-5 text-accent-ink hover:brightness-110`}>Find help</button>
            </div>
          </form>
        </section>

        {/* Specimens */}
        <section className="grid grid-cols-1 gap-5 pb-14 md:grid-cols-2" aria-label="Type and colour">
          <div className="rounded-card border border-line bg-surface p-6">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Type specimen</p>
            <p className="mb-1 mt-4 font-display text-4xl leading-tight">Aa Quick fixes, honest prices</p>
            <p className="m-0 font-display text-xl text-ink-soft">Display face, for headings and numbers</p>
            <hr className="my-5 border-line" />
            <p className="m-0 text-base leading-relaxed">
              Body copy is set for reading at small sizes: appointment details, cancellation terms, and the
              reviews your neighbours leave. Numbers like <strong>$120</strong>, <strong>4.9</strong> and{" "}
              <strong>3:30 PM</strong> should be easy to scan.
            </p>
            <p className="mb-0 mt-3 text-sm text-ink-soft">Small print and helper text stay readable on cream or charcoal.</p>
          </div>

          <div className="rounded-card border border-line bg-surface p-6">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Colour and contrast (live)
            </p>
            <div className="mt-4 grid grid-cols-6 gap-2" aria-hidden>
              {["bg-bg", "bg-surface-2", "bg-accent", "bg-accent-soft", "bg-spark", "bg-ink"].map((c) => (
                <span key={c} className={`${c} h-14 rounded-ui border border-line`} />
              ))}
            </div>
            <ul className="m-0 mt-5 list-none space-y-2 p-0 text-sm">
              {pairs.map((p) => {
                const g = grade(p.ratio);
                const ok = p.ratio >= 4.5;
                return (
                  <li key={p.label} className="flex items-center justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-ink-soft">{p.ratio.toFixed(1)}:1</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-accent-soft text-ink" : "bg-warn text-bg"}`}>
                        {g}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Provider cards */}
        <section className="pb-14" aria-labelledby="providers-h">
          <h3 id="providers-h" className="m-0 mb-1 font-display text-3xl">Neighbours near you</h3>
          <p className="mb-5 mt-0 text-ink-soft">Each card leads with when they are free, which is what people actually want to know.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PROVIDERS.map((p, i) => (
              <motion.article
                key={p.name}
                whileHover={reduce ? undefined : { y: -4 }}
                transition={spring}
                className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-accent"
              >
                <div className="flex items-start gap-3">
                  <Monogram name={p.name} i={i} />
                  <div className="min-w-0">
                    <h4 className="m-0 font-display text-xl leading-tight">{p.name}</h4>
                    <p className="m-0 text-sm text-ink-soft">{p.trade} · {p.area}</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold">
                    <Star /> {p.rating}
                  </span>
                </div>
                <p className="mb-0 mt-4 inline-flex items-center gap-2 rounded-ui bg-accent-soft px-3 py-1.5 text-sm font-semibold text-ink">
                  {p.live && (
                    <span className="nn-motion h-2 w-2 rounded-full bg-good" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden />
                  )}
                  Next free: {p.next}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="m-0 text-xs text-ink-soft">{p.jobs} jobs in your area</p>
                    <p className="m-0 text-lg font-semibold">From ${p.price}</p>
                  </div>
                  <button className={`${btn} border border-line bg-bg hover:border-accent hover:bg-accent hover:text-accent-ink`}>
                    View times
                  </button>
                </div>
                {p.emergency && <p className="mb-0 mt-3 text-xs font-semibold text-warn">Emergency call-outs available</p>}
              </motion.article>
            ))}
          </div>
        </section>

        {/* Booking */}
        <section className="grid grid-cols-1 gap-5 pb-14 md:grid-cols-[1.4fr_1fr]" aria-labelledby="book-h">
          <div className="rounded-card border border-line bg-surface p-6">
            <h3 id="book-h" className="m-0 font-display text-3xl">Pick a time</h3>
            <p className="mb-4 mt-1 text-sm text-ink-soft">Leak repair · 60 min · Maya Chen</p>
            <div role="radiogroup" aria-label="Day" className="flex gap-2 overflow-x-auto pb-2">
              {dayList.map((d) => (
                <button
                  key={d.key}
                  role="radio"
                  aria-checked={day === d.key}
                  onClick={() => { setDay(d.key); setBooked(false); }}
                  className={`${btn} shrink-0 border ${day === d.key ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg hover:border-accent"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Time" className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TIMES.map((t) => {
                const taken = TAKEN.has(t);
                const on = slot === t;
                return (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={on}
                    aria-disabled={taken}
                    disabled={taken}
                    onClick={() => { setSlot(t); setBooked(false); }}
                    className={`relative rounded-ui border px-3 py-2.5 text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      taken ? "cursor-not-allowed border-line text-ink-soft line-through opacity-60" : on ? "border-transparent text-accent-ink" : "border-line bg-bg hover:border-accent"
                    }`}
                  >
                    {on && (
                      <motion.span layoutId="slot-pill" transition={spring} className="absolute inset-0 rounded-ui bg-accent" aria-hidden />
                    )}
                    <span className="relative">{t}</span>
                  </button>
                );
              })}
            </div>
            <p className="mb-0 mt-3 text-xs text-ink-soft">Crossed-out times were just booked by someone else.</p>
          </div>

          <aside className="rounded-card border border-line bg-surface-2 p-6" aria-label="Booking summary">
            <h3 className="m-0 font-display text-2xl">Your booking</h3>
            <dl className="mb-0 mt-4 space-y-3 text-sm">
              {[
                ["Service", "Leak repair"],
                ["When", `${dayList[day].label}, ${slot ?? "choose a time"}`],
                ["Price", "$120, paid after the job"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="m-0 text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mb-0 mt-4 text-sm leading-relaxed text-ink-soft">
              Free to cancel up to 12 hours before. After that, Maya keeps a $20 call-out fee.
            </p>
            <button
              disabled={!slot}
              onClick={() => setBooked(true)}
              className={`${btn} mt-5 w-full bg-accent py-3 text-accent-ink hover:brightness-110`}
            >
              Confirm booking
            </button>
            <div aria-live="polite" className="min-h-14">
              <AnimatePresence>
                {booked && (
                  <motion.p
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={spring}
                    className="mb-0 mt-4 rounded-ui bg-good/15 px-3 py-2 text-sm font-semibold"
                  >
                    Booked. Maya has been told, and a reminder is set for the morning of.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </aside>
        </section>

        {/* States */}
        <section className="rounded-card border border-line bg-surface p-6" aria-label="Component states">
          <h3 className="m-0 mb-5 font-display text-3xl">Buttons, fields, states</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button className={`${btn} bg-accent text-accent-ink hover:brightness-110`}>Primary</button>
            <button className={`${btn} border border-line bg-bg hover:border-accent`}>Secondary</button>
            <button className={`${btn} text-accent underline-offset-4 hover:underline`}>Ghost</button>
            <button className={`${btn} bg-warn text-bg hover:brightness-110`}>Cancel booking</button>
            <button className={`${btn} bg-accent text-accent-ink`} disabled>Disabled</button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label htmlFor="e1" className="mb-1 block text-sm font-semibold">Email</label>
              <input id="e1" defaultValue="alex@example.com" className="w-full rounded-ui border border-line bg-bg px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-accent" />
              <p className="mb-0 mt-1 text-xs text-ink-soft">We only use this for booking updates.</p>
            </div>
            <div>
              <label htmlFor="e2" className="mb-1 block text-sm font-semibold">Password</label>
              <input id="e2" type="password" defaultValue="short" aria-invalid="true" aria-describedby="e2h" className="w-full rounded-ui border-2 border-warn bg-bg px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-accent" />
              <p id="e2h" className="mb-0 mt-1 text-xs font-semibold text-warn">Use at least 8 characters.</p>
            </div>
            <div role="status" aria-label="Loading example" className="space-y-2">
              {[70, 100, 55].map((w) => (
                <span
                  key={w}
                  className="nn-motion block h-4 rounded-ui"
                  style={{
                    width: `${w}%`,
                    background: "linear-gradient(90deg, var(--surface-2) 25%, var(--line) 50%, var(--surface-2) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "nn-shimmer 1.6s linear infinite",
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
