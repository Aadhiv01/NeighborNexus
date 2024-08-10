import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Ripple } from "primereact/ripple";

import "./Login.css";
import Header from "../Header/Header";
import AuthContext from "../../contexts/AuthContext";

/**
 * Copyright Component
 * Displays a copyright notice at the bottom of the page.
 */
function Copyright(props) {
  return (
    <p style={{ textAlign: "center", marginTop: "1rem" }} {...props}>
      {"Copyright © "}
      <a
        href="https://mui.com"
        className="p-link"
        style={{ textDecoration: "none" }}
      >
        NeighborNexus
      </a>{" "}
      {new Date().getFullYear()}
      {"."}
    </p>
  );
}

/**
 * Login Component
 * Renders the login form and handles user authentication.
 */
export default function Login() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { login, loading, error } = useContext(AuthContext);

  /**
   * Handles form submission for login.
   * @param {Event} event - The form submission event.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (credentials.email && credentials.password) {
      await login(credentials);
      console.log("Submitted Login");
    }
  };

  return (
    <div className="parent">
      <Header />
      <div className="flex justify-center items-center h-screen">
        <Card
          title="LOGIN"
          style={{
            width: "40vw",
            padding: "2vmin",
          }}
          className="login-card"
        >
          <form
            onSubmit={handleSubmit}
            className="p-fluid"
            style={{ marginTop: "5vh" }}
          >
            <div className="p-field" style={{ marginBottom: "8vh" }}>
              <span className="p-float-label">
                <InputText
                  id="email"
                  type="email"
                  value={credentials.email}
                  className="input"
                  style={{ border: "0.8px solid gray", padding: "1.2vmin" }}
                  onChange={(e) =>
                    setCredentials({ ...credentials, email: e.target.value })
                  }
                  required
                />
                <label htmlFor="email" className="text-white">
                  Email Address
                </label>
              </span>
            </div>
            <div className="p-field" style={{ marginBottom: "10vh" }}>
              <span className="p-float-label">
                <Password
                  id="password"
                  value={credentials.password}
                  feedback={false}
                  className="input"
                  inputStyle={{
                    padding: "1.2vmin",
                    backgroundColor: "rgba(0, 0, 0, 0.74)",
                  }}
                  style={{ border: "0.8px solid gray" }}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  toggleMask
                  required
                />
                <label htmlFor="password" className="text-white">
                  Password
                </label>
              </span>
            </div>
            <div>
              <Button
                type="submit"
                label="Login"
                className="p-ripple p-mt-3 p-w-full bg-blue-600 text-white font-bold hover:bg-blue-500"
                style={{ height: "6vh" }}
                loading={loading} // Show a loading state when logging in
              />
              <Ripple />
            </div>
            {error && <p className="text-red-500">{error}</p>}{" "}
            {/* Display error message if any */}
            <Divider />
            <p className="login-link text-white font-medium">
              New User?{" "}
              <Link to="/signup" className="hover:text-blue-600">
                Sign Up
              </Link>
            </p>
          </form>
          <Copyright className="p-mt-5" />
        </Card>
      </div>
    </div>
  );
}
