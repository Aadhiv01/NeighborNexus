import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";

import { UserProvider } from "./auth/UserContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import GuestRoute from "./auth/GuestRoute";
import AppShell from "./layout/AppShell";
import { PageLoading, ToastProvider } from "./ui/Feedback";

// Route-level code splitting: members never download the provider tools, and vice versa.
const ThemeLab = lazy(() => import("./pages/ThemeLab/ThemeLab"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Discover = lazy(() => import("./pages/Discover"));
const ProviderDetail = lazy(() => import("./pages/ProviderDetail"));
const MemberDashboard = lazy(() => import("./pages/MemberDashboard"));
const MemberBookings = lazy(() => import("./pages/MemberBookings"));
const ProviderDashboard = lazy(() => import("./pages/provider/Dashboard"));
const ProviderBookings = lazy(() => import("./pages/provider/Bookings"));
const ProviderServices = lazy(() => import("./pages/provider/Services"));
const ProviderAvailability = lazy(() => import("./pages/provider/Availability"));
const ProviderProfile = lazy(() => import("./pages/provider/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ToastProvider>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/lab" element={<ThemeLab />} />

                <Route element={<AppShell />}>
                  <Route path="/" element={<Navigate to="/services" replace />} />
                  {/* Signed-in people have no use for these, so they are sent to their dashboard */}
                  <Route element={<GuestRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                  </Route>

                  {/* Public discovery: browsing must not require an account */}
                  <Route path="/services" element={<Discover />} />
                  <Route path="/services/:providerId" element={<ProviderDetail />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/notifications" element={<Notifications />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={["Community Member"]} />}>
                    <Route path="/dashboard/member" element={<MemberDashboard />} />
                    <Route path="/bookings" element={<MemberBookings />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={["Service Provider"]} />}>
                    <Route path="/dashboard/serviceprovider" element={<ProviderDashboard />} />
                    <Route path="/dashboard/serviceprovider/bookings" element={<ProviderBookings />} />
                    <Route path="/dashboard/serviceprovider/services" element={<ProviderServices />} />
                    <Route path="/dashboard/serviceprovider/availability" element={<ProviderAvailability />} />
                    <Route path="/dashboard/serviceprovider/profile" element={<ProviderProfile />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/services" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </UserProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
