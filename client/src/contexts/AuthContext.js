import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../api/axios-client";

// Create the AuthContext for managing authentication state across the app
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to handle user login
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post("/auth", credentials);
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
      console.log("User logged in successfully");
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
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
