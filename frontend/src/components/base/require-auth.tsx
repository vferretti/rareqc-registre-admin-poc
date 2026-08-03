import { Navigate } from "react-router";
import { useAuthContext } from "@/contexts/use-auth-context";

/**
 * Route guard: renders children only for an authenticated session,
 * otherwise redirects to the landing page.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  // Avoid flashing the landing page while the session check is in flight.
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
