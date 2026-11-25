import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { Provider } from "../lib/types";
import { describeNext, formatDistance, isToday, money } from "../lib/date";
import { Badge, Monogram, Rating } from "./Display";
import { PinIcon } from "./Icons";

const priceFrom = (p: Provider) => {
  const prices = p.services.map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
};

export const categoriesOf = (p: Provider) => [...new Set(p.services.map((s) => s.category))];

export default function ProviderCard({ provider: p, index = 0 }: { provider: Provider; index?: number }) {
  const from = priceFrom(p);
  const cats = categoriesOf(p);
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.3 }}
    >
      <Link
        to={`/services/${p.userId}`}
        viewTransition
        className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-accent hover:shadow-[0_10px_30px_-18px_var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex items-start gap-3">
          <Monogram name={p.name} index={index} vtName={`avatar-${p.userId}`} />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-display text-xl font-semibold leading-tight">{p.name}</h2>
            <p className="m-0 truncate text-sm text-ink-soft">{cats.join(" · ") || "No services listed"}</p>
          </div>
          <Rating value={p.rating} />
        </div>
        <p className="mb-0 mt-4 line-clamp-2 leading-relaxed text-ink-soft">
          {p.bio || "This neighbour hasn’t added a description yet."}
        </p>
        {p.nextAvailable !== undefined && (
          <p className="mb-0 mt-4 inline-flex w-fit items-center gap-2 rounded-ui bg-accent-soft px-3 py-1.5 text-sm font-semibold text-ink">
            {p.nextAvailable && isToday(p.nextAvailable.date) && (
              <span className="nn-motion h-2 w-2 rounded-full bg-good" style={{ animation: "nn-pulse 2s infinite" }} aria-hidden />
            )}
            {p.nextAvailable ? `Next free: ${describeNext(p.nextAvailable)}` : "No openings in the next 2 weeks"}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-1 truncate text-sm text-ink-soft">
              <PinIcon width={14} height={14} /> {p.location || "Area not set"}
              {p.distanceMeters != null && <span> · {formatDistance(p.distanceMeters)}</span>}
            </p>
            <p className="m-0 text-lg font-semibold">{from != null ? `From ${money(from)}` : "Price on request"}</p>
          </div>
          {p.availableForEmergency && <Badge tone="warn">Emergency</Badge>}
        </div>
      </Link>
    </motion.li>
  );
}
