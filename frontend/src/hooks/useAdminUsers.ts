import useSWR from "swr";
import api from "@/lib/api";
import type { RegistreAdminInternalAuthAdminUser } from "../../api/api";

export type { RegistreAdminInternalAuthAdminUser as AdminUser };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/**
 * Fetches the Keycloak accounts holding the registre_admin role.
 * Read-only: account management happens in the Keycloak console.
 */
export function useAdminUsers() {
  const { data, error, isLoading } = useSWR<
    RegistreAdminInternalAuthAdminUser[]
  >("/admin-users", fetcher);
  return { users: data ?? [], error, isLoading };
}
