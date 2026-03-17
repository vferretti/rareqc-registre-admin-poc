import useSWR from "swr";
import api from "@/lib/api";

/** A single search suggestion returned by the API. */
export interface SearchSuggestion {
  participant_id: number;
  participant_name: string;
  match_field: string;
  match_value: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches search suggestions for a query (min 2 characters). */
export function useSearch(query: string) {
  const trimmed = query.trim();
  const { data, isLoading } = useSWR<SearchSuggestion[]>(
    trimmed.length >= 2 ? `/search?q=${encodeURIComponent(trimmed)}` : null,
    fetcher,
    { dedupingInterval: 300 },
  );

  return {
    suggestions: data ?? [],
    isLoading,
  };
}
