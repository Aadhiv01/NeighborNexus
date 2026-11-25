import { useQuery } from "@tanstack/react-query";
import { api, qk } from "./api";
import { useUser } from "../auth/UserContext";

/** Polls once a minute and whenever the tab regains focus. A live stream can replace this later. */
export function useNotifications() {
  const { user } = useUser();
  return useQuery({
    queryKey: qk.notifications,
    queryFn: api.notifications,
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
