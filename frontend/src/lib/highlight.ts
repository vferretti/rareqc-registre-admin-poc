interface HighlightSegment {
  segment: string;
  isMatch: boolean;
}

/**
 * Splits text on a single-capture-group regex: captured segments (odd split
 * indices) are flagged as matches.
 */
function splitByRegex(text: string, regex: RegExp): HighlightSegment[] {
  return text
    .split(regex)
    .map((segment, i) => ({ segment, isMatch: i % 2 === 1 }))
    .filter(({ segment }) => segment !== "");
}

/**
 * Splits text into segments, flagging the ones that match the query
 * (case-insensitive). Regex special characters in the query are escaped.
 * Shared by the text highlighters (HighlightText, HighlightMatch).
 */
export function splitOnHighlight(
  text: string,
  query: string,
): HighlightSegment[] {
  if (!query.trim()) return [{ segment: text, isMatch: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return splitByRegex(text, new RegExp(`(${escaped})`, "gi"));
}

/**
 * Digit-tolerant variant for phone numbers: matches the query's digits even
 * when the displayed text contains formatting characters, so searching
 * "5143026" still highlights inside "(514) 302-6651".
 */
export function splitOnDigitHighlight(
  text: string,
  query: string,
): HighlightSegment[] {
  const digits = query.replace(/\D/g, "");
  if (!digits) return [{ segment: text, isMatch: false }];
  const pattern = digits.split("").join("\\D*");
  return splitByRegex(text, new RegExp(`(${pattern})`, "g"));
}
