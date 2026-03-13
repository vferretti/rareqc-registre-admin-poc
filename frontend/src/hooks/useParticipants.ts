import useSWR from "swr";
import api from "@/lib/api";
import type { Participant, PaginatedResponse } from "@/types/participant";

interface UseParticipantsParams {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: string;
  search?: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useParticipants({ pageIndex, pageSize, sortField, sortOrder, search }: UseParticipantsParams) {
  const params = new URLSearchParams({
    page_index: String(pageIndex),
    page_size: String(pageSize),
    sort_field: sortField,
    sort_order: sortOrder,
  });
  if (search) params.set("search", search);

  const { data, error, isLoading } = useSWR<PaginatedResponse<Participant>>(
    `/participants?${params.toString()}`,
    fetcher,
  );

  return {
    participants: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 0,
    isLoading,
    error: error ? String(error) : null,
  };
}
