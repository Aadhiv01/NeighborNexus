import React, { useContext, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import Button from "@mui/material/Button";

import { useUser } from "../../contexts/UserContext.js";
import "./Header.css";
import { useLogout } from '../../hooks/useAuth';

const Header = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const logout = useLogout();

  // useEffect(() => {
  //   const verifyToken = async () => {
  //     const token = localStorage.getItem('token');
  //     if (token) {
  //       try {
  //         const response = await axiosInstance.get('/auth/verify-token', {
  //           headers: { Authorization: `Bearer ${token}` }
  //         });
  //         dispatch(setUser(response.data.user));
  //         if (response.data.user.type === 'Community Member') {
  //           navigate('/dashboard/member');
  //         } else {
  //           navigate('/dashboard/serviceprovider');
  //         }
  //       } catch (err) {
  //         localStorage.removeItem('token');
  //         dispatch(setError('Token verification failed'));
  //       }
  //     }
  //   };

  //   verifyToken();
  // }, [dispatch, navigate]);

  // useEffect(() => {
  //   dispatch(verifyTokenAsync());
  // }, [dispatch]);

  // Display a loading message while authentication state is loading
  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  // Handle user logout and redirect to login page
  const handleLogout = () => {
    logout();
  };

  // Render navigation items based on user type and authentication status
  const renderNavItems = () => {
    if (!user) {
      // Render navigation items for unauthenticated users
      return (
        <>
          <NavLink
            to="/services"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">SERVICES</Button>
          </NavLink>
          <NavLink
            to="/about"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">ABOUT</Button>
          </NavLink>
          <NavLink
            to="/contact"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">CONTACT</Button>
          </NavLink>
          <NavLink
            to="/signup"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">SIGN UP</Button>
          </NavLink>
          <NavLink to="/login" className="underLine2">
            <Button
              variant="outlined"
              style={{ border: "1.4px solid #d83838", color: "white" }}
            >
              LOGIN
            </Button>
          </NavLink>
        </>
      );
    }

    // Render navigation items for authenticated Community Members
    if (user.type === "Community Member") {
      return (
        <>
          <NavLink
            to="/dashboard/member"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">MY DASHBOARD</Button>
          </NavLink>
          <NavLink
            to="/services"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">SERVICES</Button>
          </NavLink>
          <NavLink
            to="/community"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">COMMUNITY</Button>
          </NavLink>
          <NavLink
            to="/profile"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">PROFILE</Button>
          </NavLink>
          <NavLink className="underLine2">
            <Button
              onClick={handleLogout}
              variant="outlined"
              style={{ border: "1.4px solid #d83838", color: "white" }}
            >
              LOGOUT
            </Button>
          </NavLink>
        </>
      );
    }

    // Render navigation items for authenticated Service Providers
    if (user.type === "Service Provider") {
      return (
        <>
          <NavLink
            to="/dashboard/serviceprovider"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">MY DASHBOARD</Button>
          </NavLink>
          <NavLink
            to="/dashboard/serviceprovider/services"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">MY SERVICES</Button>
          </NavLink>
          <NavLink
            to="/dashboard/serviceprovider/bookings"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">BOOKINGS</Button>
          </NavLink>
          <NavLink
            to="/dashboard/serviceprovider/availability"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">AVAILABILITY</Button>
          </NavLink>
          <NavLink
            to="/dashboard/serviceprovider/profile"
            className="underLine2 hide_on_responsive text-white"
          >
            <Button color="inherit">PROFILE</Button>
          </NavLink>
          <NavLink className="underLine2">
            <Button
              onClick={handleLogout}
              variant="outlined"
              style={{ border: "1.4px solid #d83838", color: "white" }}
            >
              LOGOUT
            </Button>
          </NavLink>
        </>
      );
    }
  };

  return (
    <div className="shadow-xl">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "3%",
          position: "relative",
        }}
      >
        <div
          style={{ marginLeft: "2vw", cursor: "pointer" }}
          onClick={() =>
            navigate(
              user
                ? `/dashboard/${
                    user.type === "Community Member" ? "member" : "provider"
                  }`
                : "/"
            )
          }
        >
          <strong style={{ fontSize: "1.4rem", color: "white" }}>
            <span className="p-d-flex p-jc-center p-mb-3">
              <Avatar icon="pi pi-home" style={{ background: "none" }} />
            </span>
            NeighborNexus
          </strong>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            color: "white",
            flexGrow: "1",
          }}
        >
          {renderNavItems()} {/* Render navigation items based on user state */}
        </div>
      </div>
    </div>
  );
};

export default Header;