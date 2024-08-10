import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";

/**
 * ProtectedRoute Component
 * Ensures that only authenticated users can access certain routes.
 * If the user is not authenticated, they will be redirected to the login page.
 */
const ProtectedRoute = () => {
  const { user } = useContext(AuthContext);

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
