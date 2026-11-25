import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useVerifyToken } from "./useAuth";
import type { User } from "../lib/types";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserState | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { data, isPending, fetchStatus } = useVerifyToken();
  const verified = data?.user ?? null;

  useEffect(() => {
    if (verified) setUser(verified);
  }, [verified]);

  // With no stored token the query never runs, so `isPending` would stay true
  // forever. Only report loading while a verification is actually in flight.
  const isLoading = isPending && fetchStatus !== "idle";

  return (
    <UserContext.Provider value={{ user: user ?? verified, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
