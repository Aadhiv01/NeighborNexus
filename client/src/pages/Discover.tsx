import { lazy, Suspense, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, qk, type ProviderSearch } from "../lib/api";
import type { Provider } from "../lib/types";
import Page from "../layout/Page";
import ProviderCard, { categoriesOf } from "../ui/ProviderCard";
import { Segmented } from "../ui/Display";
import { Button } from "../ui/Button";
import { SelectField, TextField } from "../ui/Fields";
import { EmptyState, Skeleton } from "../ui/Feedback";
import { PinIcon, SearchIcon } from "../ui/Icons";
import { Neighbourhood } from "../ui/Neighbourhood";

// The map (and its 200 kB library) loads only when someone asks for it.
const MapView = lazy(() => import("../ui/MapView"));

type Sort = "rating" | "soonest" | "nearest" | "price";
type View = "list" | "map";
type Here = { lat: number; lng: number };

const minPrice = (p: Provider) => (p.services.length ? Math.min(...p.services.map((s) => s.price)) : Infinity);
const nextKey = (p: Provider) => (p.nextAvailable ? `${p.nextAvailable.date} ${p.nextAvailable.start}` : "9999");

const SORTERS: Record<Sort, (a: Provider, b: Provider) => number> = {
  rating: (a, b) => (b.rating || 0) - (a.rating || 0),
  soonest: (a, b) => nextKey(a).localeCompare(nextKey(b)),
  nearest: (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  price: (a, b) => minPrice(a) - minPrice(b),
};

// About 100 m. Enough for "nearby", and it is never stored.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export default function Discover() {
  // The landing page hands over a search with ?q= and ?category=.
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [location, setLocation] = useState("");
  const [sortChoice, setSortChoice] = useState<Sort | null>(null);
  const [view, setView] = useState<View>("list");
  const [here, setHere] = useState<Here | null>(null);
  const [radius, setRadius] = useState("");
  const [geo, setGeo] = useState<"idle" | "asking" | "denied" | "unsupported">("idle");

  const search: ProviderSearch = here ? { ...here, ...(radius ? { radiusKm: Number(radius) } : {}) } : {};
  const { data: providers = [], isPending, isError } = useQuery({
    queryKey: qk.providerList(search),
    queryFn: () => api.providers(search),
    placeholderData: keepPreviousData,
  });

  const sort: Sort = sortChoice === "nearest" && !here ? "rating" : sortChoice ?? (here ? "nearest" : "rating");

  const categories = useMemo(() => [...new Set(providers.flatMap(categoriesOf))].sort(), [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return providers
      .filter((p) => {
        if (category && !p.services.some((s) => s.category === category)) return false;
        if (loc && !(p.location || "").toLowerCase().includes(loc)) return false;
        if (!q) return true;
        const haystack = [p.name, p.bio, p.location, ...p.services.map((s) => `${s.name} ${s.category}`)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(SORTERS[sort]);
  }, [providers, query, category, location, sort]);

  const filtering = Boolean(query || category || location);
  const reset = () => {
    setQuery("");
    setCategory("");
    setLocation("");
  };

  const locate = () => {
    if (!navigator.geolocation) return setGeo("unsupported");
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: round3(pos.coords.latitude), lng: round3(pos.coords.longitude) });
        setGeo("idle");
        setSortChoice(null);
      },
      () => setGeo("denied"),
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearHere = () => {
    setHere(null);
    setRadius("");
    setSortChoice(null);
  };

  const unlocated = filtered.filter((p) => !p.geo).length;

  return (
    <Page title="Find help nearby" wide>
      <section className="grid grid-cols-1 items-center gap-8 pb-10 md:grid-cols-[1.15fr_1fr]">
        <div>
          {!isPending && providers.length > 0 && (
            <p className="m-0 mb-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink">
              <span className="nn-motion h-2 w-2 rounded-full bg-accent" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden />
              {providers.length} {providers.length === 1 ? "neighbour" : "neighbours"} ready to help
            </p>
          )}
          <h1 className="m-0 font-display text-5xl font-bold leading-[1.04] tracking-tight md:text-6xl">
            Good help lives <span className="text-accent">down the street.</span>
          </h1>
          <p className="mb-0 mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
            Plumbers, cleaners and fixers from your own neighbourhood. See real openings, book in under a
            minute, and change your mind without a phone call.
          </p>
        </div>
        <Neighbourhood className="w-full max-w-[520px] justify-self-center" />
      </section>

      <form
        role="search"
        aria-label="Search providers"
        onSubmit={(e) => e.preventDefault()}
        className="mb-4 grid grid-cols-1 gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
      >
        <div className="relative">
          <TextField
            label="What do you need done?"
            placeholder="A leaking tap, a deep clean…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="[&_input]:pl-10"
          />
          <SearchIcon className="pointer-events-none absolute bottom-3 left-3 text-ink-soft" />
        </div>
        <SelectField
          label="Category"
          value={category}
          onValueChange={setCategory}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <TextField label="Area" placeholder="Neighbourhood or city" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Button variant="secondary" size="lg" disabled={!filtering} onClick={reset}>
          Clear
        </Button>
      </form>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        {here ? (
          <>
            <Button variant="secondary" onClick={clearHere} icon={<PinIcon width={18} height={18} />}>
              Near you · clear
            </Button>
            <SelectField
              label="Within"
              value={radius}
              onValueChange={setRadius}
              className="min-w-[10rem]"
              options={[
                { value: "", label: "Any distance" },
                { value: "5", label: "5 km" },
                { value: "10", label: "10 km" },
                { value: "25", label: "25 km" },
              ]}
            />
          </>
        ) : (
          <Button variant="secondary" loading={geo === "asking"} onClick={locate} icon={<PinIcon width={18} height={18} />}>
            Use my location
          </Button>
        )}
        <SelectField
          label="Sort by"
          value={sort}
          onValueChange={(v) => setSortChoice(v as Sort)}
          className="min-w-[12rem]"
          options={[
            { value: "rating", label: "Top rated" },
            { value: "soonest", label: "Soonest available" },
            ...(here ? [{ value: "nearest", label: "Nearest" }] : []),
            { value: "price", label: "Lowest price" },
          ]}
        />
        <div className="ml-auto">
          <Segmented<View>
            legend="View"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "map", label: "Map" },
            ]}
          />
        </div>
      </div>

      {(geo === "denied" || geo === "unsupported") && (
        <p role="alert" className="mb-4 mt-0 rounded-ui border border-warn bg-warn/10 px-3 py-2 text-sm">
          {geo === "denied"
            ? "We couldn’t get your location. Allow location access for this site in your browser, or search by area instead."
            : "Your browser can’t share a location. Search by area instead."}
        </p>
      )}

      <p className="m-0 mb-5 text-sm text-ink-soft" aria-live="polite">
        {isPending
          ? "Looking nearby…"
          : `${filtered.length} ${filtered.length === 1 ? "provider" : "providers"}${filtering ? " match" : ""}${here ? " near you" : ""}`}
      </p>

      {isError && (
        <EmptyState title="We couldn’t load providers">Check that the API is running, then refresh the page.</EmptyState>
      )}

      {isPending && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}><Skeleton className="h-64 rounded-card" /></li>
          ))}
        </ul>
      )}

      {!isPending && !isError && filtered.length === 0 && (
        <EmptyState
          title="No one matches those filters"
          action={filtering ? <Button variant="secondary" onClick={reset}>Clear filters</Button> : undefined}
        >
          {here && radius ? "Try a wider distance, a different category, or search by area." : "Try a broader search, another category, or a nearby area."}
        </EmptyState>
      )}

      {!isPending && !isError && filtered.length > 0 && view === "map" && (
        <>
          <Suspense fallback={<Skeleton className="h-[26rem] rounded-card" />}>
            <MapView providers={filtered} here={here} />
          </Suspense>
          {unlocated > 0 && (
            <p className="mb-0 mt-3 text-sm text-ink-soft">
              {unlocated} {unlocated === 1 ? "provider isn’t" : "providers aren’t"} shown on the map because they haven’t set a location. Switch to the list to see everyone.
            </p>
          )}
        </>
      )}

      {view === "list" && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <ProviderCard key={p._id} provider={p} index={i} />
          ))}
        </ul>
      )}
    </Page>
  );
}
