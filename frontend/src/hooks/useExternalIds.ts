import useSWR from "swr";
import api from "@/lib/api";
import type { ExternalIDResponse } from "../../api/api";

export type { ExternalIDResponse as ExternalIdResponse };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches external IDs for a participant. */
export function useExternalIds(participantId?: number) {
  const { data, error, isLoading } = useSWR<ExternalIDResponse[]>(
    participantId ? `/participants/${participantId}/external-ids` : null,
    fetcher,
  );
  return { externalIds: data ?? [], error, isLoading };
}
