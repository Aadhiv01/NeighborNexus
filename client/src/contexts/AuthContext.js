import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../api/axios-client";
import { useNavigate } from "react-router-dom";

// Create the AuthContext for managing authentication state across the app
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Assuming you have an endpoint to verify token
          const response = await axiosInstance.get("/auth/verify-token", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data.user);
        } catch (err) {
          localStorage.removeItem("token");
          console.error("Token verification failed:", err);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Function to handle user login
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth", credentials);
      const { token, user } = response.data;
      console.log("User logged in successfully bf", user, response.data);
      localStorage.setItem("token", token);
      setUser(user);
      setLoading(false);
      console.log("User logged in successfully", user, "||", response.data);
      if(user?.type === "Community Member")
        navigate('/dashboard/member');
      else
        navigate('/dashboard/serviceprovider');
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user signup
  const signup = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth/signup", credentials);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      console.log("User signed up successfully");
      navigate('/dashboard/member');
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      console.error("Signup failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle user logout
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    console.log("User logged out");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, signup, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;