import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "./UserContext";
import { dashboardFor } from "./useAuth";
import { PageLoading } from "../ui/Feedback";
import type { UserType } from "../lib/types";

/**
 * Guards nested routes. UserContext is the single source of truth for who is
 * signed in. Pass `roles` to restrict to one kind of user.
 */
export default function ProtectedRoute({ roles }: { roles?: UserType[] }) {
  const { user, isLoading } = useUser();

  if (isLoading) return <PageLoading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;
  // Signed in, but this page is for the other kind of user: go to your own dashboard.
  if (roles && !roles.includes(user.type)) return <Navigate to={dashboardFor(user)} replace />;
  return <Outlet />;
}
