import useSWR from "swr";
import api from "@/lib/api";

/** An external system with its reference status. */
export interface ExternalSystem {
  id: number;
  name: string;
  title_fr: string;
  title_en: string;
  is_referenced: boolean;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all external systems. */
export function useExternalSystems() {
  const { data, isLoading, mutate } = useSWR<ExternalSystem[]>(
    "/external-systems",
    fetcher,
  );
  return { systems: data ?? [], isLoading, mutate };
}
