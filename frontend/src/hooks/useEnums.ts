import useSWR from "swr";
import api from "@/lib/api";
import type { EnumsResponse } from "@/types/participant";

const fetcher = (url: string) => api.get<EnumsResponse>(url).then((r) => r.data);

export function useEnums() {
  const { data, error, isLoading } = useSWR("/enums", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return { enums: data, isLoading, error };
}
