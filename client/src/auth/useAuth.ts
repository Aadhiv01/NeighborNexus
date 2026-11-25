import { useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { api, dashboardData, qk } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";
import { useUser } from "./UserContext";
import { useToast } from "../ui/Feedback";

/**
 * Sign in is shown in three honest steps instead of a silent jump:
 *  1. "Signing in…" for at least AUTH_PROGRESS_MS, so a fast server does not make the button flicker.
 *     A wrong password still shows its error straight away.
 *  2. "Signed in" for AUTH_CONFIRM_MS. During this beat the dashboard's data and code are loaded in
 *     the background, so the next page opens already filled in.
 *  3. The page change, with a transition and a welcome toast.
 */
export const AUTH_PROGRESS_MS = 900;
export const AUTH_CONFIRM_MS = 600;
export const AUTH_LOGOUT_MS = 700;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const dashboardFor = (user?: User | null) =>
  user?.type === "Service Provider" ? "/dashboard/serviceprovider" : "/dashboard/member";

/** Starts loading the dashboard page's code, so the page change does not wait for it. */
const preloadDashboard = (user: User) =>
  user.type === "Service Provider" ? import("../pages/provider/Dashboard") : import("../pages/MemberDashboard");

/**
 * A session lives in two places only: the token in localStorage and the user in UserContext. Both are
 * set after the confirm beat, so the form can show its success state first. Setting the user any
 * earlier would make the guest-only routes redirect straight away.
 */
async function establishSession(
  data: AuthResponse,
  queryClient: QueryClient,
  setUser: (u: User | null) => void,
  navigate: NavigateFunction,
  toast: ReturnType<typeof useToast>,
  welcome: string
) {
  const prefetch = Promise.allSettled([
    preloadDashboard(data.user),
    dashboardData(data.user.type, data.token).then((entries) => entries.forEach(([key, value]) => queryClient.setQueryData(key, value))),
  ]);
  // Wait for the beat, and for the data, but never more than 2 seconds for it.
  await Promise.all([wait(AUTH_CONFIRM_MS), Promise.race([prefetch, wait(2000)])]);

  localStorage.setItem("token", data.token);
  setUser(data.user);
  queryClient.setQueryData(qk.user, { user: data.user });
  navigate(dashboardFor(data.user), { viewTransition: true });
  toast({ tone: "success", title: welcome });
}

/** Runs the request, but keeps "Signing in…" up for at least the minimum. Failures are not delayed. */
const withMinimumProgress = <T,>(request: Promise<T>) => Promise.all([request, wait(AUTH_PROGRESS_MS)]).then(([result]) => result);

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.login>[0]) => withMinimumProgress(api.login(body)),
    // Not returned on purpose: the mutation is "successful" as soon as the server says so, so the
    // button can show "Signed in" while the session settles. Returning it would hold that back.
    onSuccess: (data) => {
      void establishSession(data, queryClient, setUser, navigate, toast, `Welcome back, ${data.user.name.split(" ")[0]}`);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.signup>[0]) => withMinimumProgress(api.signup(body)),
    onSuccess: (data) => {
      void establishSession(data, queryClient, setUser, navigate, toast, `Welcome to NeighborNexus, ${data.user.name.split(" ")[0]}`);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const logout = () => {
    if (pending) return;
    setPending(true); // the button shows "Logging out…" for the settle beat
    window.setTimeout(() => {
      localStorage.removeItem("token");
      setUser(null);
      queryClient.clear();
      navigate("/login", { viewTransition: true });
      toast({ tone: "success", title: "You’ve been logged out", detail: "See you soon." });
      setPending(false);
    }, AUTH_LOGOUT_MS);
  };
  return { logout, pending };
}

export function useVerifyToken() {
  return useQuery({
    queryKey: qk.user,
    queryFn: async () => {
      try {
        return await api.verifyToken();
      } catch (err) {
        // A rejected token is unrecoverable: drop it so the UI settles signed out.
        localStorage.removeItem("token");
        throw err;
      }
    },
    retry: false,
    enabled: !!localStorage.getItem("token"),
  });
}
