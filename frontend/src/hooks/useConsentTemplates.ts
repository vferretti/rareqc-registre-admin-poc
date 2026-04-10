import useSWR from "swr";
import api from "@/lib/api";
import type { ConsentTemplateResponse } from "../../api/api";

export type { ConsentTemplateResponse as ConsentTemplate };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all consent template documents. */
export function useConsentTemplates() {
  const { data, isLoading, mutate } = useSWR<ConsentTemplateResponse[]>(
    "/consent-templates",
    fetcher,
  );
  return { templates: data ?? [], isLoading, mutate };
}
