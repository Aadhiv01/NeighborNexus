/**
 * Shared visual tokens for the dark canvas defined in App.js.
 * Inline styles keep pages independent of a CSS framework — the app
 * intentionally ships one UI library (PrimeReact) and no utility CSS.
 */

export const page = {
  padding: "2rem 1.5rem 4rem",
  maxWidth: 1080,
  margin: "0 auto",
  color: "#f4f5f9",
};

export const card = {
  background: "rgba(24, 26, 41, 0.55)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 12,
  padding: "1.25rem",
};

export const cardHover = {
  ...card,
  cursor: "pointer",
  transition: "border-color 150ms ease, transform 150ms ease",
};

export const muted = { color: "#aeb4c8" };

export const heading = {
  margin: "0 0 0.35rem",
  fontSize: "1.6rem",
  letterSpacing: "-0.01em",
};

export const sectionTitle = {
  margin: "0 0 0.75rem",
  fontSize: "1.05rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#8f97ad",
};

export const grid = (min = 260) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: "1rem",
});

export const slotButton = (selected) => ({
  padding: "0.5rem 0.9rem",
  borderRadius: 8,
  border: `1px solid ${selected ? "#419D78" : "rgba(255,255,255,0.18)"}`,
  background: selected ? "rgba(65,157,120,0.22)" : "transparent",
  color: "#f4f5f9",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.9rem",
});
