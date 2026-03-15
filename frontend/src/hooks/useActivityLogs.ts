import useSWR from "swr";
import api from "@/lib/api";
import type { ActivityLog } from "@/types/activity-log";
import type { PaginatedResponse } from "@/types/participant";

interface UseActivityLogsParams {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: string;
  /** When provided, fetches logs scoped to a specific participant. */
  participantId?: number;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches a paginated list of activity logs, optionally scoped to a participant. */
export function useActivityLogs({
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  participantId,
}: UseActivityLogsParams) {
  const params = new URLSearchParams({
    page_index: String(pageIndex),
    page_size: String(pageSize),
    sort_field: sortField,
    sort_order: sortOrder,
  });

  const url = participantId
    ? `/participants/${participantId}/activity-logs?${params.toString()}`
    : `/activity-logs?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<
    PaginatedResponse<ActivityLog>
  >(url, fetcher);

  return {
    logs: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 0,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  };
}
