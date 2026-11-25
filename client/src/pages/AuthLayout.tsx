import type { ReactNode } from "react";
import Page from "../layout/Page";
import { Neighbourhood } from "../ui/Neighbourhood";

export default function AuthLayout({
  title, heading, intro, points, children,
}: { title: string; heading: string; intro: string; points: string[]; children: ReactNode }) {
  return (
    <Page title={title} wide>
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-stretch gap-6 md:grid-cols-[1fr_1.1fr]">
        <section className="flex flex-col justify-between rounded-card bg-surface-2 p-8">
          <div>
            <h1 className="m-0 font-display text-4xl font-bold leading-tight tracking-tight">{heading}</h1>
            <p className="mb-0 mt-3 text-lg leading-relaxed text-ink-soft">{intro}</p>
            <ul className="mb-0 mt-6 list-none space-y-3 p-0">
              {points.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <Neighbourhood className="mt-8 w-full" />
        </section>
        <section className="rounded-card border border-line bg-surface p-8">{children}</section>
      </div>
    </Page>
  );
}
