import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const CalendarIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const XIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const PencilIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const ArrowRightIcon = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowLeftIcon = (p: P) => (
  <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const MenuIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const EyeIcon = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const EyeOffIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);
export const StarIcon = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none", width: p.width ?? 16, height: p.height ?? 16 })}>
    <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const BoltIcon = (p: P) => (
  <svg {...base(p)}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
);
export const ListIcon = (p: P) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
);
export const ToolboxIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V5h6v3M3 13h18" /></svg>
);
export const UserIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
);

/** The NeighborNexus mark: two rooftops joined by a connecting line. */
export const Logo = (p: P) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden {...p}>
    <rect width="32" height="32" rx="9" fill="var(--accent)" />
    <path d="M5.5 19 11 13.5l5.5 5.5M15.5 19 21 13.5l5.5 5.5" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 23.5h16" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
