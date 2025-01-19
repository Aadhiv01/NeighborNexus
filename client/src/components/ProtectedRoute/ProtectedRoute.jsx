import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";

/**
 * ProtectedRoute Component
 * Ensures that only authenticated users can access certain routes.
 * If the user is not authenticated, they will be redirected to the login page.
 */
const ProtectedRoute = () => {
    const { user, loading } = useContext(AuthContext);

    // Debugging: log the user state and loading status
    console.log('ProtectedRoute user:', user);
    console.log('ProtectedRoute loading:', loading);
  
    // Redirect to login if not authenticated and not loading
    if (loading) {
      return <div>Loading...</div>; // Optionally, show a loading spinner or message
    }
  
    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;