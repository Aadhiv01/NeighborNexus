import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import "./App.css";

// Route-level code splitting: the member flow never downloads the provider
// dashboard's tables and charts, and vice versa.
const Signup = lazy(() => import("./components/Signup/Signup"));
const Login = lazy(() => import("./components/Login/Login"));
const Discover = lazy(() => import("./components/Discover/Discover"));
const ProviderDetail = lazy(() =>
  import("./components/ProviderDetail/ProviderDetail")
);
const MemberDashboard = lazy(() =>
  import("./components/MemberDashboard/MemberDashboard")
);
const MemberBookings = lazy(() =>
  import("./components/MemberBookings/MemberBookings")
);
const ServiceProviderDashboard = lazy(() =>
  import("./components/ServiceProviderDashboard/ServiceProviderDashboard")
);
const Bookings = lazy(() => import("./components/Bookings/Bookings"));
const ServiceProviderServices = lazy(() =>
  import("./components/ServiceProviderServices/ServiceProviderServices")
);
const ServiceProviderAvailability = lazy(() =>
  import("./components/ServiceProviderAvailability/ServiceProviderAvailability")
);
const ServiceProviderProfile = lazy(() =>
  import("./components/ServiceProviderProfile/ServiceProviderProfile")
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const containerStyle = {
    height: "100vh",
    width: "100vw",
    position: "relative",
    overflow: "auto",
  };

  const primaryStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#2D3047",
    zIndex: 1,
  };

  const contentStyle = {
    position: "relative",
    zIndex: 4,
    width: "100%",
    height: "100%",
  };

  const svgStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
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
        <path d="M100,0 C60,34 60,66 100,100 Z" fill="#419D78" fillOpacity="0.32" />
      </svg>
      <div className="content" style={contentStyle}>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <ThemeProvider>
              <Suspense
                fallback={
                  <div style={{ padding: "3rem", color: "#f4f5f9" }}>
                    Loading…
                  </div>
                }
              >
                <Routes>
                <Route path="/" element={<Navigate to="/services" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Public discovery — browsing must not require an account */}
                <Route path="/services" element={<Discover />} />
                <Route path="/services/:providerId" element={<ProviderDetail />} />

                <Route
                  element={<ProtectedRoute roles={["Community Member"]} />}
                >
                  <Route
                    path="/dashboard/member"
                    element={<MemberDashboard />}
                  />
                  <Route path="/bookings" element={<MemberBookings />} />
                </Route>

                <Route
                  element={<ProtectedRoute roles={["Service Provider"]} />}
                >
                  <Route
                    path="/dashboard/serviceprovider"
                    element={<ServiceProviderDashboard />}
                  />
                  <Route
                    path="/dashboard/serviceprovider/bookings"
                    element={<Bookings />}
                  />
                  <Route
                    path="/dashboard/serviceprovider/services"
                    element={<ServiceProviderServices />}
                  />
                  <Route
                    path="/dashboard/serviceprovider/availability"
                    element={<ServiceProviderAvailability />}
                  />
                  <Route
                    path="/dashboard/serviceprovider/profile"
                    element={<ServiceProviderProfile />}
                  />
                </Route>

                <Route path="*" element={<Navigate to="/services" replace />} />
                </Routes>
              </Suspense>
            </ThemeProvider>
          </UserProvider>
        </QueryClientProvider>
      </div>
    </div>
  );
}

export default App;
