import useSWR from "swr";
import api from "@/lib/api";
import type {
  AgeRangeCount,
  CityCount,
  ExternalSystemCount,
  QuarterCount,
  ReportsSummary,
} from "../../api/api";

export type {
  AgeRangeCount,
  CityCount,
  ExternalSystemCount,
  QuarterCount,
  ReportsSummary,
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Fetches aggregated report summary as of the given date. */
export function useReportsSummary(reportDate?: string) {
  const url = reportDate
    ? `/reports/summary?report_date=${reportDate}`
    : "/reports/summary";
  const { data, isLoading, error } = useSWR<ReportsSummary>(url, fetcher);
  return { summary: data, isLoading, error };
}
