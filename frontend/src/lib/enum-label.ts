import type { EnumValue } from "@/types/participant";

/** Looks up the bilingual label for a code in a reference table array. Falls back to the code itself. */
export function enumLabel(
  items: EnumValue[] | undefined,
  code: string | null | undefined,
  lang: string,
): string {
  if (!code) return "—";
  const item = items?.find((i) => i.code === code);
  if (!item) return code;
  return localizedField(item, "name", lang);
}

/**
 * Picks the localized variant of a bilingual field pair (`<base>_en` / `<base>_fr`).
 * Example: `localizedField(clause, "clause", i18n.language)` → `clause.clause_en` or `clause.clause_fr`.
 */
export function localizedField<B extends string>(
  obj: Partial<Record<`${B}_en` | `${B}_fr`, string | null>>,
  base: B,
  lang: string,
): string {
  return (lang === "en" ? obj[`${base}_en`] : obj[`${base}_fr`]) ?? "";
}
