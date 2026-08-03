import { useCallback, useEffect, useMemo, useState } from "react";
import { axiosClient } from "@/lib/api";
import { AuthContext } from "@/contexts/use-auth-context";
import type { AuthUser } from "@/types/auth";

/**
 * Loads the BFF session (/api/auth/me) once at startup and exposes the
 * authenticated user. The session itself lives in httpOnly cookies managed
 * by the backend — no token ever reaches this code.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axiosClient
      .get<AuthUser>("/auth/me")
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post("/auth/logout");
    } finally {
      window.location.href = "/";
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, logout }),
    [user, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
