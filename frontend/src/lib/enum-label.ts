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
  return lang === "en" ? item.name_en : item.name_fr;
}
