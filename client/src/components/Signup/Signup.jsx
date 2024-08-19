import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown"; // Importing Dropdown
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Ripple } from "primereact/ripple";
import "./Signup.css";
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
      <a href="_" className="p-link" style={{ textDecoration: "none" }}>
        NeighborNexus
      </a>{" "}
      {new Date().getFullYear()}
      {"."}
    </p>
  );
}

/**
 * SignUp Component
 * Renders the signup form and handles new user registration.
 */
export default function SignUp() {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [credentials, setCredentials] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    type: "Community Member",
  });

  const navigate = useNavigate();
  const { signup, loading, error } = useContext(AuthContext);

  const userTypes = [
    { label: "Community Member", value: "Community Member" },
    { label: "Service Provider", value: "Service Provider" },
  ];

  /**
   * useEffect hook to check if the passwords match whenever they change.
   */
  useEffect(() => {
    if (credentials.password) {
      setPasswordMismatch(credentials.password !== confirmPassword);
    } else if (!confirmPassword) {
      setPasswordMismatch(false);
    } else {
      setPasswordMismatch(true);
    }
  }, [credentials.password, confirmPassword]);

  /**
   * Handles form submission for signup.
   * @param {Event} event - The form submission event.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (credentials.password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);

    if (!passwordMismatch) {
      await signup(credentials);
      console.log("Submitted SignUp");
    }
  };

  return (
    <div className="parent">
      <Header />
      <div className="center-container">
        <Card
          title="SIGN UP"
          style={{
            width: "40vw",
            padding: "2vmin",
          }}
          className="signup-card"
        >
          <form
            onSubmit={handleSubmit}
            className="p-fluid grid-rows-3"
            style={{ marginTop: "5vh" }}
          >
            <div
              className="grid grid-cols-2 gap-12"
              style={{ marginBottom: "8vh" }}
            >
              <div className="p-field">
                <span className="p-float-label">
                  <InputText
                    id="firstName"
                    value={credentials.firstName}
                    className="input"
                    style={{ border: "0.8px solid gray", padding: "1.2vmin" }}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        firstName: e.target.value,
                      })
                    }
                    autoComplete="given-name"
                    required
                  />
                  <label htmlFor="firstName" className="text-white">
                    First Name
                  </label>
                </span>
              </div>
              <div className="p-field">
                <span className="p-float-label">
                  <InputText
                    id="lastName"
                    value={credentials.lastName}
                    className="input"
                    style={{ border: "0.8px solid gray", padding: "1.2vmin" }}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        lastName: e.target.value,
                      })
                    }
                    required
                  />
                  <label htmlFor="lastName" className="text-white">
                    Last Name
                  </label>
                </span>
              </div>
            </div>
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
            <div
              className="grid grid-cols-2 gap-12"
              style={{ marginBottom: "10vh" }}
            >
              <div className="p-field">
                <span className="p-float-label">
                  <Password
                    id="password"
                    value={credentials.password}
                    className="input"
                    inputStyle={{
                      padding: "1.2vmin",
                      backgroundColor: "rgba(0, 0, 0, 0.74)",
                    }}
                    style={{ border: "0.8px solid gray" }}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.target.value,
                      })
                    }
                    toggleMask
                    required
                  />
                  <label htmlFor="password" className="text-white">
                    Password
                  </label>
                </span>
              </div>
              <div className="p-field">
                <span className="p-float-label">
                  <Password
                    id="confirm-password"
                    value={confirmPassword}
                    className="input"
                    inputStyle={{
                      padding: "1.2vmin",
                      backgroundColor: "rgba(0, 0, 0, 0.74)",
                    }}
                    style={{ border: "0.8px solid gray" }}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    feedback={false}
                    toggleMask
                    required
                  />
                  <label htmlFor="confirm-password" className="text-white">
                    Confirm Password
                  </label>
                </span>
                {passwordMismatch && (
                  <small style={{ color: "red" }}>Passwords do not match</small>
                )}
              </div>
            </div>
            <div className="p-field" style={{ marginBottom: "8vh" }}>
              <span className="p-float-label" style={{ paddingTop: "10px" }}>
                <Dropdown
                  id="userType"
                  panelClassName="dropdown-panel"
                  value={credentials.type}
                  options={userTypes}
                  onChange={(e) =>
                    setCredentials({ ...credentials, type: e.value })
                  }
                  required
                />
                <label
                  htmlFor="userType"
                  className="text-white text-base"
                  style={{
                    marginBottom: "5px",
                  }}
                >
                  Select User Type
                </label>
              </span>
            </div>
            <div>
              <Button
                type="submit"
                label="Sign Up"
                className="p-ripple p-mt-3 p-w-full bg-blue-600 text-white font-bold hover:bg-blue-500"
                style={{ height: "6vh" }}
                loading={loading}
              />
              <Ripple />
            </div>
            {error && <p className="text-red-500">{error}</p>} <Divider />
            <p className="signup-link text-white font-medium">
              Existing User?{" "}
              <Link to="/login" className="hover:text-blue-600">
                Login
              </Link>
            </p>
          </form>
          <Copyright className="p-mt-5" />
        </Card>
      </div>
    </div>
  );
}
