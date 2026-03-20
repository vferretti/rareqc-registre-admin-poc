import useSWR from "swr";
import api from "@/lib/api";
import type { Participant, PaginatedResponse } from "@/types/participant";

interface UseParticipantsParams {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: string;
  search?: string;
  consentRegistry?: string[];
  consentRecontact?: string[];
  consentExternalLinkage?: string[];
  externalSystems?: string[];
  participantIds?: number[];
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches a paginated, sortable, searchable list of participants. */
export function useParticipants({
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  search,
  consentRegistry,
  consentRecontact,
  consentExternalLinkage,
  externalSystems,
  participantIds,
}: UseParticipantsParams) {
  const params = new URLSearchParams({
    page_index: String(pageIndex),
    page_size: String(pageSize),
    sort_field: sortField,
    sort_order: sortOrder,
  });
  if (search) params.set("search", search);
  if (consentRegistry?.length) params.set("consent_registry", consentRegistry.join(","));
  if (consentRecontact?.length) params.set("consent_recontact", consentRecontact.join(","));
  if (consentExternalLinkage?.length) params.set("consent_external_linkage", consentExternalLinkage.join(","));
  if (externalSystems?.length) params.set("external_system", externalSystems.join(","));
  if (participantIds !== undefined) params.set("participant_ids", participantIds.join(","));

  const { data, error, isLoading, mutate } = useSWR<
    PaginatedResponse<Participant>
  >(`/participants?${params.toString()}`, fetcher);

  return {
    participants: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 0,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
