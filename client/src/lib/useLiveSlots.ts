import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE, qk } from "./api";

export type LiveState = "connecting" | "live" | "reconnecting";

/**
 * Listens for "this provider's times changed" and refetches the slots. The browser's EventSource
 * reconnects on its own after a drop. On every (re)connect the slots are refetched once too, in case
 * something changed while it was down.
 *
 * The connection is only held while the tab is visible. Browsers allow about six connections per
 * site over HTTP/1.1, and each open stream uses one, so a person with several tabs open would
 * otherwise use them all up and stall every other request. A hidden tab disconnects, and the
 * connection comes back (with a refresh) when the tab is shown again.
 */
export function useLiveSlots(providerId?: string): LiveState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveState>("connecting");

  useEffect(() => {
    if (!providerId || typeof EventSource === "undefined") return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: qk.slotsAll });
    let source: EventSource | null = null;

    const connect = () => {
      if (source) return;
      setState("connecting");
      source = new EventSource(`${API_BASE}/bookings/stream?serviceProviderId=${providerId}`);
      source.onopen = () => {
        setState("live");
        refresh();
      };
      source.onerror = () => setState("reconnecting");
      source.addEventListener("slots", refresh);
    };
    const disconnect = () => {
      source?.close();
      source = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? connect() : disconnect());

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
  }, [providerId, queryClient]);

  return state;
}
