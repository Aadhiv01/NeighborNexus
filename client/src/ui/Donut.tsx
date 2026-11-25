interface Segment { label: string; value: number; color: string }

/** Plain SVG donut. The legend carries the numbers, so colour is never the only signal. */
export default function Donut({ segments, title }: { segments: Segment[]; title: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" width="148" height="148" role="img" aria-label={`${title}: ${segments.map((s) => `${s.value} ${s.label}`).join(", ")}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += len;
            return el;
          })}
        <text x="50" y="49" textAnchor="middle" className="fill-ink font-display text-[20px] font-bold">{total}</text>
        <text x="50" y="62" textAnchor="middle" className="fill-ink-soft text-[7px]">bookings</text>
      </svg>
      <ul className="m-0 list-none space-y-2 p-0">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="min-w-[5.5rem] text-ink-soft">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
