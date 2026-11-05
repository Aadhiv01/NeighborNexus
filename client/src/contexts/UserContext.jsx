import React, { createContext, useContext, useState, useEffect } from 'react';
import { useVerifyToken } from '../hooks/useAuth';

const UserContext = createContext(undefined);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const { data, isPending } = useVerifyToken();
  const verifiedUser = data?.user ?? null;

  useEffect(() => {
    if (verifiedUser) setUser(verifiedUser);
  }, [verifiedUser]);

  // Derive from the query result as well as local state. Without this the
  // first render after `/verify-token` resolves still has `user === null`
  // (the effect hasn't run yet) and ProtectedRoute bounces to /login.
  // `isLoading` is the name consumers already use; it maps to TanStack
  // Query v5's `isPending` (no data yet, no error yet).
  return (
    <UserContext.Provider
      value={{ user: user ?? verifiedUser, setUser, isLoading: isPending }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
