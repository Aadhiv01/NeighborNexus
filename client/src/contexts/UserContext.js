import React, { createContext, useContext, useState, useEffect } from 'react';
import { useVerifyToken } from '../hooks/useAuth';

const UserContext = createContext(undefined);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const { data, isLoading } = useVerifyToken();

  useEffect(() => {
    if (data) {
      setUser(data.user);
    }
  }, [data]);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading }}>
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