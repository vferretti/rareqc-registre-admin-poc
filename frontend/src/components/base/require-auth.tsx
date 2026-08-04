import { Navigate } from "react-router";
import { useAuthContext } from "@/contexts/use-auth-context";
import { AccessDenied } from "@/components/feature/access-denied";

/** Realm role required to use the admin portal (mirrors the API's route group). */
const REQUIRED_ROLE = "registre_admin";

/**
 * Route guard: renders children only for an authenticated session holding
 * the registre_admin role. Unauthenticated → landing page; authenticated
 * without the role → explicit access-denied page (every API call would
 * answer 403 otherwise).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  // Avoid flashing the landing page while the session check is in flight.
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (!user.roles.includes(REQUIRED_ROLE)) return <AccessDenied />;
  return <>{children}</>;
}
