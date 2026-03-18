import useSWR from "swr";
import api from "@/lib/api";

/** A consent clause from the API. */
export interface ConsentClause {
  id: number;
  clause_fr: string;
  clause_en: string;
  document_id: number;
  clause_type_code: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all available consent clauses. */
export function useConsentClauses() {
  const { data, isLoading } = useSWR<ConsentClause[]>(
    "/consent-clauses",
    fetcher,
  );
  return { clauses: data ?? [], isLoading };
}
