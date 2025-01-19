import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Ripple } from "primereact/ripple";
import Header from "../Header/Header";
import { useLogin } from "../../hooks/useAuth";
import "./Login.css";

function Copyright(props) {
  return (
    <p className="text-white text-center mt-4" {...props}>
      {"Copyright © "}
      <span className="p-link">NeighborNexus</span> {new Date().getFullYear()}
      {"."}
    </p>
  );
}

export default function Login() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const login = useLogin();

  const handleSubmit = async (event) => {
    event.preventDefault();
    login.mutate(credentials);
  };

  return (
    <div>
      <Header />
      <div style={{ marginTop: "12vh", display: "flex", justifyContent: "center" }}>
        <Card
          title={<div className="text-center text-[#2D3047]">LOGIN</div>}
          className="w-11/12 md:w-2/5 p-4 bg-opacity-90 backdrop-blur-sm"
          style={{
            zIndex: 10,
          }}
        >
          <form onSubmit={handleSubmit} className="p-fluid mt-8">
            <div className="mb-8">
              <span className="p-float-label">
                <InputText
                  id="email"
                  type="email"
                  value={credentials.email}
                  className="bg-opacity-75 border-2 border-white/20"
                  style={{
                    borderBottomColor: "#419D78",
                    boxShadow: "none",
                    padding: "1.2rem",
                  }}
                  onChange={(e) =>
                    setCredentials({ ...credentials, email: e.target.value })
                  }
                  required
                />
                <label htmlFor="email" className="text-black">
                  Email Address
                </label>
              </span>
            </div>
            <div className="mb-8">
              <span className="p-float-label">
                <Password
                  id="password"
                  value={credentials.password}
                  feedback={false}
                  className="bg-opacity-75 border-2 border-white/20 border-b-[#419D78]"
                  inputStyle={{
                    padding: "1.2rem",
                    boxShadow: "none"
                  }}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  toggleMask
                  required
                />
                <label htmlFor="password" className="text-black">
                  Password
                </label>
              </span>
            </div>
            <Button
              type="submit"
              label="Login"
              className="p-ripple h-14 bg-[#419D78] hover:bg-[#357d61] text-white font-bold"
              loading={login.isLoading}
            />
            <Ripple />
            {login.isError && (
              <div className="text-red-500 mt-4">
                Error: {login.error.message}
              </div>
            )}
            <Divider className="my-4 bg-white/20" />
            <p className="text-center text-black">
              New User?{" "}
              <Link
                to="/signup"
                className="text-[#419D78] hover:text-[#357d61] font-medium"
              >
                Sign Up
              </Link>
            </p>
          </form>
          <Copyright />
        </Card>
      </div>
    </div>
  );
}
