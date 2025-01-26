import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import Signup from "./components/Signup/Signup";
import Login from "./components/Login/Login";
import MemberDashboard from "./components/MemberDashboard/MemberDashboard";
import { ThemeProvider } from './contexts/ThemeContext';

import Bookings from "./components/Bookings/Bookings";
import ServiceProviderServices from "./components/ServiceProviderServices/ServiceProviderServices";
import ServiceProviderProfile from "./components/ServiceProviderProfile/ServiceProviderProfile";

import "./App.css";
import { UserProvider } from "./contexts/UserContext";
import ServiceProviderDashboard from "./components/ServiceProviderDashboard/ServiceProviderDashboard";
import ServiceProviderAvailability from "./components/ServiceProviderAvailability/ServiceProviderAvailability.tsx";

const queryClient = new QueryClient();

function App() {

  const containerStyle = {
    height: '100vh',
    width: '100vw',
    position: 'relative',
    overflow: 'auto',
  };

  const primaryStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#2D3047',
    zIndex: 1,
  };

  const contentStyle = {
    position: 'relative',
    zIndex: 4,
    width: '100%',
    height: '100%',
  };


  const svgStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
  };

  return (
    <div className="App" style={containerStyle}>
      <div style={primaryStyle}></div>
      <svg
        style={svgStyle}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M100,0 C60,34 60,66 100,100 Z" fill="#419D78" />
      </svg>
      <div className="content" style={contentStyle}>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <ThemeProvider>
              {/* <AuthProvider> */}
              <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* <Route element={<ProtectedRoute />}> */}
                <Route path="/dashboard/member" element={<MemberDashboard />} />
                {/* </Route> */}
                {/* <Route element={<ProtectedRoute />}> */}
                <Route
                  path="/dashboard/serviceprovider"
                  element={<ServiceProviderDashboard />}
                />
                {/* </Route> */}
                {/* <Route element={<ProtectedRoute />}> */}
                <Route
                  path="/dashboard/serviceprovider/bookings"
                  element={<Bookings />}
                />
                {/* </Route> */}
                {/* <Route element={<ProtectedRoute />}> */}
                <Route
                  path="/dashboard/serviceprovider/services"
                  element={<ServiceProviderServices />}
                />
                {/* </Route> */}
                {/* <Route element={<ProtectedRoute />}> */}
                <Route
                  path="/dashboard/serviceprovider/availability"
                  element={<ServiceProviderAvailability />}
                />
                {/* </Route> */}
                {/* <Route element={<ProtectedRoute />}> */}
                <Route
                  path="/dashboard/serviceprovider/profile"
                  element={<ServiceProviderProfile />}
                />
                {/* </Route> */}
              </Routes>
              {/* </AuthProvider> */}
            </ThemeProvider>
          </UserProvider>
        </QueryClientProvider>
      </div>
    </div>
  );
}

export default App;