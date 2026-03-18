import useSWR from "swr";
import api from "@/lib/api";

/** A consent template document. */
export interface ConsentTemplate {
  id: number;
  name: string;
  type_code: string;
  mime_type: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all consent template documents. */
export function useConsentTemplates() {
  const { data, isLoading } = useSWR<ConsentTemplate[]>(
    "/consent-templates",
    fetcher,
  );
  return { templates: data ?? [], isLoading };
}
