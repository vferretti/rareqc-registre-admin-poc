import { enumLabel } from "@/lib/enum-label";
import type { EnumsResponse } from "@/types/participant";

/** Translates activity details that contain enum codes (e.g. "registry — valid"). */
export function translateDetails(
  details: string,
  enums: EnumsResponse | undefined,
  lang: string,
): string {
  const cl = (code: string) => enumLabel(enums?.clause_type, code, lang);
  const cs = (code: string) => enumLabel(enums?.consent_status, code, lang);

  // Format: "clause_type — old_status → new_status (other_clause other_status)"
  const fullMatch = details.match(
    /^(\w+)\s*[—–-]\s*(\w+)\s*→\s*(\w+)(?:\s*\((\w+)\s+(\w+)\))?$/,
  );
  if (fullMatch) {
    let result = `${cl(fullMatch[1])} — ${cs(fullMatch[2])} → ${cs(fullMatch[3])}`;
    if (fullMatch[4] && fullMatch[5]) {
      result += ` (${cl(fullMatch[4])} ${cs(fullMatch[5])})`;
    }
    return result;
  }
  // Consent added: "clause_type — status"
  const consentMatch = details.match(/^(\w+)\s*[—–-]\s*(\w+)$/);
  if (consentMatch) {
    return `${cl(consentMatch[1])} — ${cs(consentMatch[2])}`;
  }
  // Consent edited: "old_status → new_status"
  const editMatch = details.match(/^(\w+)\s*→\s*(\w+)$/);
  if (editMatch) {
    return `${cs(editMatch[1])} → ${cs(editMatch[2])}`;
  }
  return details;
}
