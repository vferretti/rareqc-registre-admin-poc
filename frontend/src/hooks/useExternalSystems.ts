import useSWR from "swr";
import api from "@/lib/api";
import type { ExternalSystemResponse } from "../../api/api";

export type { ExternalSystemResponse as ExternalSystem };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all external systems. */
export function useExternalSystems() {
  const { data, isLoading, mutate } = useSWR<ExternalSystemResponse[]>(
    "/external-systems",
    fetcher,
  );
  return { systems: data ?? [], isLoading, mutate };
}
