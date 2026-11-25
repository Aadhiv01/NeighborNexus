import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "./UserContext";
import { dashboardFor } from "./useAuth";
import { PageLoading } from "../ui/Feedback";

/** For pages that only make sense signed out (log in, sign up). Signed-in people go to their dashboard. */
export default function GuestRoute() {
  const { user, isLoading } = useUser();
  if (isLoading) return <PageLoading label="Checking your session" />;
  if (user) return <Navigate to={dashboardFor(user)} replace />;
  return <Outlet />;
}
