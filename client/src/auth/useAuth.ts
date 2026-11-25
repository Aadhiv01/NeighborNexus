import { useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { api, qk } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";
import { useUser } from "./UserContext";
import { useToast } from "../ui/Feedback";

/**
 * How long the button stays on "Signed in" before the page changes. It is not a fake delay for the
 * request, which has already finished. It is a beat so the person can see the result, and it keeps
 * a very fast sign-in from flashing past.
 */
export const AUTH_SETTLE_MS = 1200;

export const dashboardFor = (user?: User | null) =>
  user?.type === "Service Provider" ? "/dashboard/serviceprovider" : "/dashboard/member";

/**
 * A session lives in two places only: the token in localStorage and the user in UserContext.
 * Both are set after the settle beat, so the form can show its success state first. Setting the
 * user any earlier would make the guest-only routes redirect straight away.
 */
function establishSession(
  data: AuthResponse,
  queryClient: QueryClient,
  setUser: (u: User | null) => void,
  navigate: NavigateFunction,
  toast: ReturnType<typeof useToast>,
  welcome: string
) {
  window.setTimeout(() => {
    localStorage.setItem("token", data.token);
    setUser(data.user);
    queryClient.setQueryData(qk.user, { user: data.user });
    navigate(dashboardFor(data.user), { viewTransition: true });
    toast({ tone: "success", title: welcome });
  }, AUTH_SETTLE_MS);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  return useMutation({
    mutationFn: api.login,
    onSuccess: (data) =>
      establishSession(data, queryClient, setUser, navigate, toast, `Welcome back, ${data.user.name.split(" ")[0]}`),
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  const toast = useToast();
  return useMutation({
    mutationFn: api.signup,
    onSuccess: (data) =>
      establishSession(data, queryClient, setUser, navigate, toast, `Welcome to NeighborNexus, ${data.user.name.split(" ")[0]}`),
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
    }, AUTH_SETTLE_MS);
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
