import useSWR from "swr";
import api from "@/lib/api";

export interface ExternalIdResponse {
  id: number;
  external_system_id: number;
  system_name: string;
  system_title: string;
  external_id: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches external IDs for a participant. */
export function useExternalIds(participantId?: number) {
  const { data, isLoading } = useSWR<ExternalIdResponse[]>(
    participantId ? `/participants/${participantId}/external-ids` : null,
    fetcher,
  );
  return { externalIds: data ?? [], isLoading };
}
