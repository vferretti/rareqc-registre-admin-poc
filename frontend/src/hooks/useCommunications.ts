import useSWR from "swr";
import api from "@/lib/api";
import type { CommunicationResponse } from "@/types/communication";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all communications for a participant. */
export function useCommunications(participantId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CommunicationResponse[]>(
    participantId ? `/participants/${participantId}/communications` : null,
    fetcher,
  );
  return {
    communications: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
