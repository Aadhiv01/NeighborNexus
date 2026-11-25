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
      <p className={`mb-0 mt-3 text-sm ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>
        Do the work?{" "}
        <Link to="/signup" className={`font-semibold underline underline-offset-4 ${tone === "ink" ? "text-accent-soft" : "text-accent"}`}>
          Set your weekly hours
        </Link>
      </p>
      {categories.length > 0 && (
        <p className={`mb-0 mt-3 flex flex-wrap items-center gap-2 text-sm ${tone === "ink" ? "text-bg" : "text-ink-soft"}`}>
          Popular:
          {categories.slice(0, 5).map((c) => (
            <Link key={c} to={`/services?category=${encodeURIComponent(c)}`} viewTransition className={`inline-flex h-9 items-center rounded-ui border px-3.5 font-semibold hover:border-accent hover:bg-accent-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${tone === "ink" ? "border-bg text-bg" : "border-line text-ink"}`}>
              {c}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}
