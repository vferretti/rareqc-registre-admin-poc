import useSWR from "swr";
import api from "@/lib/api";
import type { ConsentResponse } from "@/types/consent";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all consents for a participant. */
export function useConsents(participantId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ConsentResponse[]>(
    participantId ? `/participants/${participantId}/consents` : null,
    fetcher,
  );
  return {
    consents: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
