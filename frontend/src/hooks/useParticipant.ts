import useSWR from "swr";
import api from "@/lib/api";
import type { Participant } from "@/types/participant";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useParticipant(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Participant>(
    id ? `/participants/${id}` : null,
    fetcher,
  );

  return {
    participant: data ?? null,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
