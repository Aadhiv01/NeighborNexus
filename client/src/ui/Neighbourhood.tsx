/**
 * Line illustration of a street of houses. Drawn with the theme tokens so it
 * follows the palette and dark mode, and replaces stock photography.
 */
export function Neighbourhood({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 220" role="img" aria-label="Illustration of neighbouring houses" className={className} fill="none">
      <circle cx="430" cy="48" r="26" fill="var(--accent-soft)" />
      <path d="M20 190h480" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      {/* house 1 */}
      <path d="M40 190v-70l50-42 50 42v70z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M26 122 90 68l64 54" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="74" y="140" width="32" height="50" rx="4" fill="var(--accent)" />
      <rect x="52" y="124" width="16" height="16" rx="3" stroke="var(--ink)" strokeWidth="2" />
      {/* house 2 */}
      <path d="M170 190v-92h62v92z" fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M162 98h78" stroke="var(--spark)" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="184" y="114" width="14" height="14" rx="3" stroke="var(--ink)" strokeWidth="2" />
      <rect x="206" y="114" width="14" height="14" rx="3" stroke="var(--ink)" strokeWidth="2" />
      <rect x="192" y="152" width="24" height="38" rx="4" stroke="var(--ink)" strokeWidth="2" />
      {/* house 3 */}
      <path d="M262 190v-60l56-46 56 46v60z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M248 132 318 76l70 56" stroke="var(--spark)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="302" y="148" width="32" height="42" rx="4" fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="318" cy="112" r="9" stroke="var(--ink)" strokeWidth="2" />
      {/* house 4 */}
      <path d="M394 190v-80h64v80z" fill="var(--surface-2)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M386 110h80" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="408" y="126" width="14" height="14" rx="3" stroke="var(--ink)" strokeWidth="2" />
      <rect x="430" y="150" width="20" height="40" rx="4" fill="var(--accent)" />
      {/* the link between homes */}
      <path d="M154 76c28-26 64-26 92 0" stroke="var(--accent)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M390 80c-18-26-46-26-68-8" stroke="var(--accent)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      {/* trees */}
      <path d="M492 190v-26" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="492" cy="150" r="18" fill="var(--spark)" fillOpacity=".5" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}
