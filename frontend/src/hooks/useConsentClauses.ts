import useSWR from "swr";
import api from "@/lib/api";

/** A consent clause from the API. */
export interface ConsentClause {
  id: number;
  clause_fr: string;
  clause_en: string;
  clause_type_code: string;
  template_document_id: number;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches consent clauses, optionally filtered by template document ID. */
export function useConsentClauses(templateDocumentId?: number) {
  const url = templateDocumentId
    ? `/consent-clauses?template_document_id=${templateDocumentId}`
    : "/consent-clauses";
  const { data, isLoading } = useSWR<ConsentClause[]>(
    templateDocumentId ? url : null,
    fetcher,
  );
  return { clauses: data ?? [], isLoading };
}
