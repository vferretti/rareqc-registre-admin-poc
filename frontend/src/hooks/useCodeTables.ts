import useSWR from "swr";
import api from "@/lib/api";
import type { CodeEntry, CodeTableListResponse } from "../../api/api";

export type { CodeEntry };
export type { CodeTableListResponse as CodeTable };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all code/reference tables with their entries. */
export function useCodeTables() {
  const { data, isLoading, mutate } = useSWR<CodeTableListResponse[]>(
    "/code-tables",
    fetcher,
  );
  return { codeTables: data ?? [], isLoading, mutate };
}
