import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, qk } from "../../lib/api";
import type { Provider, Stats } from "../../lib/types";
import { useUser } from "../../auth/UserContext";
import { dashboardFor } from "../../auth/useAuth";
import { Neighbourhood } from "../../ui/Neighbourhood";
import { PageLoading } from "../../ui/Feedback";
import { HeroSearch, categoriesOfAll } from "./parts";
import { Band, Faq, FinalCta, FoundingNote, H2, Kicker, Metric, OpeningsChart, PriceRanges, ProviderBand, StickySteps } from "./blocks";

const totalOpen = (s?: Stats) => s?.openings.reduce((n, o) => n + o.slots, 0) ?? 0;
const freeToday = (s?: Stats) => s?.openings[0]?.providers ?? 0;

function Landing({ providers, stats }: { providers: Provider[]; stats?: Stats }) {
  const cats = stats?.categories.map((c) => c.name) ?? categoriesOfAll(providers);
  return (
    <>
      <Band label="Welcome" className="overflow-hidden">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="max-w-[38rem]">
            <Kicker>Local services, booked in a minute</Kicker>
            <h1 className="m-0 font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
              Good help lives <span className="text-accent">down the street.</span>
            </h1>
            <p className="mb-8 mt-5 text-lg leading-relaxed text-ink-soft">
              Plumbers, cleaners and fixers from your own neighbourhood. See real openings, book in under a minute, and
              change your mind without a phone call.
            </p>
            <HeroSearch categories={cats} />
            <FoundingNote count={stats?.providers ?? providers.length} />
          </div>
          <Neighbourhood className="w-full max-w-[560px] justify-self-end" />
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


/**
 * The page a signed-out visitor lands on. Signed-in people have no use for it, so they are sent
 * straight to their dashboard. Everything on it is real: counts, prices and open times come from
 * the API, and the numbers are left out rather than made up when there is nothing to show.
 */
export default function Home() {
  const { user, isLoading } = useUser();
  useEffect(() => {
    document.title = "NeighborNexus · Local help, booked in a minute";
  }, []);
  const providers = useQuery({ queryKey: qk.providerList({}), queryFn: () => api.providers(), enabled: !user && !isLoading });
  const stats = useQuery({ queryKey: qk.stats, queryFn: api.stats, enabled: !user && !isLoading });

  if (isLoading) return <PageLoading label="Loading" />;
  if (user) return <Navigate to={dashboardFor(user)} replace />;
  return <Landing providers={providers.data ?? []} stats={stats.data} />;
}
