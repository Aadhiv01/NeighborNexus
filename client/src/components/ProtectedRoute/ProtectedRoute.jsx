import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

/**
 * Guards nested routes. UserContext is the single source of truth for
 * who is signed in — nothing else should duplicate that state.
 *
 *   <Route element={<ProtectedRoute />}>                       // any user
 *   <Route element={<ProtectedRoute roles={["Service Provider"]} />}>
 */
const ProtectedRoute = ({ roles }) => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div style={{ padding: "2rem" }}>Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.type)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
