import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Provider } from "../lib/types";
import { describeNext, formatDistance, money } from "../lib/date";
import { Rating } from "./Display";
import { categoriesOf } from "./ProviderCard";

// MapLibre 6 ships its web worker as a separate file; a bundler must be told where it is.
maplibregl.setWorkerUrl(workerUrl);

// CARTO's light basemap suits the Paper palette. Its attribution control stays on.
const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const pinBase =
  "rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const pinOn = ["bg-accent", "text-accent-ink", "scale-110"];
const pinOff = ["bg-surface", "text-ink"];

const from = (p: Provider) => {
  const prices = p.services.map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
};

/** The map is a second view of the same list: every pin is a real button. */
export default function MapView({
  providers,
  here,
}: {
  providers: Provider[];
  here: { lat: number; lng: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const pins = useRef(new Map<string, HTMLButtonElement>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = providers.find((p) => p._id === selectedId) ?? null;

  // Rebuild the map only when the set of pins or the user's position really changes,
  // not whenever the parent hands us a new array with the same providers in it.
  const signature = `${providers.map((p) => p._id).join(",")}|${here ? `${here.lat},${here.lng}` : ""}`;
  const latest = useRef(providers);
  latest.current = providers;

  useEffect(() => {
    if (!container.current) return;
    const located = latest.current.filter((p) => p.geo);
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: here ? [here.lng, here.lat] : located[0]?.geo?.coordinates ?? [-79.38, 43.65],
      zoom: 10,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const bounds = new maplibregl.LngLatBounds();
    pins.current.clear();

    if (here) {
      const dot = document.createElement("span");
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", "Your location");
      dot.className = "pointer-events-none block h-4 w-4 rounded-full border-2 border-surface bg-good shadow-md";
      new maplibregl.Marker({ element: dot }).setLngLat([here.lng, here.lat]).addTo(map);
      bounds.extend([here.lng, here.lat]);
    }

    for (const p of located) {
      const [lng, lat] = p.geo!.coordinates;
      const price = from(p);
      const el = document.createElement("button");
      el.type = "button";
      el.className = pinBase;
      el.textContent = price != null ? money(price) : "•";
      el.setAttribute(
        "aria-label",
        `${p.name}, ${categoriesOf(p).join(", ") || "no services"}${price != null ? `, from ${money(price)}` : ""}`
      );
      // `click` covers the keyboard (Enter and Space). `pointerup` covers a mouse or finger release
      // even when the map has taken the matching press for panning.
      const select = () => setSelectedId(p._id);
      el.addEventListener("click", select);
      el.addEventListener("pointerup", select);
      pins.current.set(p._id, el);
      new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      bounds.extend([lng, lat]);
    }


    if (!bounds.isEmpty() && (located.length > 1 || here)) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
    } else if (located.length === 1) {
      map.setCenter(located[0].geo!.coordinates);
      map.setZoom(13);
    }

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    pins.current.forEach((el, id) => {
      const on = id === selectedId;
      el.classList.remove(...(on ? pinOff : pinOn));
      el.classList.add(...(on ? pinOn : pinOff));
    });
  }, [selectedId, signature]);

  return (
    <div>
      <div
        ref={container}
        role="region"
        aria-label="Map of providers. The list view has the same information."
        className="h-[26rem] w-full overflow-hidden rounded-card border border-line bg-surface-2"
      />
      <div className="mt-3 min-h-[5.5rem]" aria-live="polite">
        {selected ? (
          <Link
            to={`/services/${selected.userId}`}
            viewTransition
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent bg-surface p-4 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="min-w-0">
              <span className="block font-display text-xl font-semibold">{selected.name}</span>
              <span className="block text-sm text-ink-soft">
                {categoriesOf(selected).join(" · ")}
                {selected.distanceMeters != null && ` · ${formatDistance(selected.distanceMeters)}`}
              </span>
              {selected.nextAvailable && (
                <span className="mt-1 block text-sm font-semibold">Next free: {describeNext(selected.nextAvailable)}</span>
              )}
            </span>
            <span className="flex items-center gap-4">
              <Rating value={selected.rating} />
              <span className="font-semibold">View times →</span>
            </span>
          </Link>
        ) : (
          <p className="m-0 rounded-card border border-dashed border-line p-4 text-sm text-ink-soft">
            Select a pin to see who it is.
          </p>
        )}
      </div>
    </div>
  );
}
