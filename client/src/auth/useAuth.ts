import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { api, qk } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";
import { useUser } from "./UserContext";

export const dashboardFor = (user?: User | null) =>
  user?.type === "Service Provider" ? "/dashboard/serviceprovider" : "/dashboard/member";

/** A session lives in two places only: the token in localStorage and the user in UserContext. */
function establishSession(
  data: AuthResponse,
  queryClient: QueryClient,
  setUser: (u: User | null) => void,
  navigate: NavigateFunction
) {
  localStorage.setItem("token", data.token);
  setUser(data.user);
  queryClient.setQueryData(qk.user, { user: data.user });
  navigate(dashboardFor(data.user));
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  return useMutation({
    mutationFn: api.login,
    onSuccess: (data) => establishSession(data, queryClient, setUser, navigate),
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  return useMutation({
    mutationFn: api.signup,
    onSuccess: (data) => establishSession(data, queryClient, setUser, navigate),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();
  return () => {
    localStorage.removeItem("token");
    setUser(null);
    queryClient.clear();
    navigate("/login");
  };
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
