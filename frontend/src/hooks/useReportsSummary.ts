import useSWR from "swr";
import api from "@/lib/api";

export interface ExternalSystemCount {
  name: string;
  count: number;
}

export interface QuarterCount {
  quarter: string;
  count: number;
}

export interface ReportsSummary {
  total_participants: number;
  female_count: number;
  male_count: number;
  average_age: number;
  deceased_count: number;
  consent_registry: number;
  consent_recontact: number;
  consent_ext_linkage: number;
  external_systems: ExternalSystemCount[];
  growth_by_quarter: QuarterCount[];
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches aggregated report summary. */
export function useReportsSummary() {
  const { data, isLoading, error } = useSWR<ReportsSummary>(
    "/reports/summary",
    fetcher,
  );
  return { summary: data, isLoading, error };
}
