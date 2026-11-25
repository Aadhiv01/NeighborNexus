import type { Person } from "./types";

/**
 * Bookings store `date` as UTC midnight (the server normalises it), so
 * formatting in the viewer's zone would show the day before west of UTC.
 * Every booking date is therefore rendered in UTC.
 */
export function formatBookingDate(value?: string, style: "short" | "long" = "short") {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(
    undefined,
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }
      : { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }
  );
}

/** YYYY-MM-DD for a local calendar date (what the slots endpoint expects). */
export function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

/** "14:30" -> "2:30 PM" */
export function formatTime(hhmm?: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const timeRange = (start?: string, end?: string) => `${formatTime(start)} to ${formatTime(end)}`;

export const nameOf = (p?: Person | string, fallback = "—") => (typeof p === "object" && p?.name) || fallback;
export const emailOf = (p?: Person | string) => (typeof p === "object" && p?.email) || "";

/** "Today, 3:30 PM" / "Tomorrow, 9:00 AM" / "Wed, Nov 25, 9:00 AM" */
export function describeNext(n: { date: string; start: string }) {
  const today = isoDate(new Date());
  const tomorrow = isoDate(addDays(new Date(), 1));
  const when =
    n.date === today
      ? "Today"
      : n.date === tomorrow
        ? "Tomorrow"
        : new Date(`${n.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${when}, ${formatTime(n.start)}`;
}

export const isToday = (date: string) => date === isoDate(new Date());

export function formatDistance(meters?: number) {
  if (meters == null) return "";
  return meters < 1000 ? `${Math.round(meters / 100) * 100} m away` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km away`;
}
