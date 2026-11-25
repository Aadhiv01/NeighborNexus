import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Provider } from "../../lib/types";
import { Button } from "../../ui/Button";
import { SearchIcon } from "../../ui/Icons";

export const categoriesOfAll = (providers: Provider[]) => [...new Set(providers.flatMap((p) => p.services.map((s) => s.category)))].sort();

/** The search box on every landing concept. It hands over to the discovery page. */
export function HeroSearch({ categories, tone = "plain" }: { categories: string[]; tone?: "plain" | "ink" }) {
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
        <p className={`mb-0 mt-3 flex flex-wrap items-center gap-2 text-sm ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>
          Popular:
          {categories.slice(0, 5).map((c) => (
            <Link key={c} to={`/services?category=${encodeURIComponent(c)}`} viewTransition className={`rounded-full border px-3 py-1 font-semibold hover:border-accent hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${tone === "ink" ? "border-bg text-bg" : "border-line text-ink"}`}>
              {c}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Find someone nearby", text: "Search by what you need, or switch on your location to see who is close." },
  { n: "2", title: "Pick a real time", text: "Every provider shows when they are next free. You only ever see times that are actually open." },
  { n: "3", title: "Book, and change your mind", text: "Get a reminder before it starts. Reschedule up to 12 hours before, or cancel any time." },
];

export function HowItWorks() {
  return (
    <div>
      <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-card border border-line bg-surface p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-ink" aria-hidden>{s.n}</span>
            <h3 className="mb-0 mt-4 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mb-0 mt-2 leading-relaxed text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
