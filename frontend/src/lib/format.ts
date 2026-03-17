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

/** Formats a 10-digit phone string as "(514) 302-6651". Returns as-is if not 10 digits. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/** Joins non-empty address parts (street, city, province, postal code) with ", ". */
export function formatAddress(
  ...parts: (string | null | undefined)[]
): string {
  return parts.filter(Boolean).join(", ") || "—";
}
