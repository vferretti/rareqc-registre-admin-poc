import { format, parseISO } from "date-fns";

/** Formats an ISO date string to "yyyy-MM-dd". Returns "—" for null/invalid dates. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(parseISO(date), "yyyy-MM-dd");
  } catch {
    return "—";
  }
}

/** Joins non-empty address parts (street, city, province, postal code) with ", ". */
export function formatAddress(
  ...parts: (string | null | undefined)[]
): string {
  return parts.filter(Boolean).join(", ") || "—";
}
