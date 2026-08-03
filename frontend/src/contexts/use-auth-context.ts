import { createContext, useContext } from "react";
import type { AuthUser } from "@/types/auth";

export interface AuthContextValue {
  /** The authenticated user, or null when not logged in. */
  user: AuthUser | null;
  /** True while the initial session check (/api/auth/me) is in flight. */
  isLoading: boolean;
  /** Destroys the BFF session (Keycloak back-channel logout) and returns to the landing page. */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
