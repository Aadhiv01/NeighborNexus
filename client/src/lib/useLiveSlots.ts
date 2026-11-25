import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE, qk } from "./api";

export type LiveState = "connecting" | "live" | "reconnecting";

/**
 * Listens for "this provider's times changed" and refetches the slots. The browser's EventSource
 * reconnects on its own, so a dropped connection recovers without any code here. On every
 * (re)connect the slots are refetched once too, in case something changed while it was down.
 */
export function useLiveSlots(providerId?: string): LiveState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveState>("connecting");

  useEffect(() => {
    if (!providerId || typeof EventSource === "undefined") return;
    const source = new EventSource(`${API_BASE}/bookings/stream?serviceProviderId=${providerId}`);
    const refresh = () => queryClient.invalidateQueries({ queryKey: qk.slotsAll });
    source.onopen = () => {
      setState("live");
      refresh();
    };
    source.onerror = () => setState("reconnecting");
    source.addEventListener("slots", refresh);
    return () => source.close();
  }, [providerId, queryClient]);

  return state;
}
