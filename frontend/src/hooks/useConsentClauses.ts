import useSWR from "swr";
import api from "@/lib/api";
import type { ConsentClause } from "../../api/api";

export type { ConsentClause };

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches consent clauses, optionally filtered by template document ID. */
export function useConsentClauses(templateDocumentId?: number) {
  const url = templateDocumentId
    ? `/consent-clauses?template_document_id=${templateDocumentId}`
    : "/consent-clauses";
  const { data, isLoading, mutate } = useSWR<ConsentClause[]>(url, fetcher);
  return { clauses: data ?? [], isLoading, mutate };
}
