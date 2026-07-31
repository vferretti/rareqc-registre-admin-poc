import { format, parseISO } from "date-fns";
import i18n from "@/lib/i18n";

/**
 * Formats an ISO date string using a date-fns pattern.
 * The pattern defaults to the locale-defined `common.date.year_month_day` key,
 * so the display format can be changed per language in the translation files.
 * Returns "—" for null/invalid dates.
 */
export function formatDate(
  date: string | null | undefined,
  pattern: string = i18n.t("common.date.year_month_day"),
): string {
  if (!date) return "—";
  try {
    return format(parseISO(date), pattern);
  } catch {
    return "—";
  }
}

/** Returns today's date as an ISO "yyyy-MM-dd" string (for API payloads and filenames). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

/** Formats a full address line. If apartment is provided, prepends it to street (e.g. "apt. 4, 123 Rue Principale"). */
export function formatAddress(
  apartment: string | null | undefined,
  street: string | null | undefined,
  city: string | null | undefined,
  province: string | null | undefined,
  postalCode: string | null | undefined,
): string {
  const streetPart =
    apartment && street ? `${apartment}-${street}` : street || "";
  return (
    [streetPart, city, province, postalCode].filter(Boolean).join(", ") || "—"
  );
}
