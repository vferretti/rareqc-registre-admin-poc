/**
 * Splits text into segments, flagging the ones that match the query
 * (case-insensitive). Regex special characters in the query are escaped.
 * Shared by the text highlighters (HighlightText, HighlightMatch).
 */
export function splitOnHighlight(
  text: string,
  query: string,
): { segment: string; isMatch: boolean }[] {
  if (!query.trim()) return [{ segment: text, isMatch: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .split(new RegExp(`(${escaped})`, "gi"))
    .filter(Boolean)
    .map((segment) => ({
      segment,
      isMatch: segment.toLowerCase() === query.toLowerCase(),
    }));
}
