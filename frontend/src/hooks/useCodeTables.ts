import useSWR from "swr";
import api from "@/lib/api";

/** A single code entry in a reference table. */
export interface CodeEntry {
  code: string;
  name_en: string;
  name_fr: string;
}

/** A code table with its entries and referenced codes. */
export interface CodeTable {
  table: string;
  entries: CodeEntry[];
  referenced_codes: string[];
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches all code/reference tables with their entries. */
export function useCodeTables() {
  const { data, isLoading, mutate } = useSWR<CodeTable[]>(
    "/code-tables",
    fetcher,
  );
  return { codeTables: data ?? [], isLoading, mutate };
}
