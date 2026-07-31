import { splitOnHighlight } from "@/lib/highlight";

interface HighlightTextProps {
  text: string | null | undefined;
  highlight: string;
}

/** Marks portions of text that match the highlight query. */
function HighlightText({ text, highlight }: HighlightTextProps) {
  if (!text) return null;

  return (
    <>
      {splitOnHighlight(text, highlight).map(({ segment, isMatch }, i) =>
        isMatch ? (
          <mark
            key={i}
            className="bg-highlight text-highlight-foreground rounded-sm"
          >
            {segment}
          </mark>
        ) : (
          segment
        ),
      )}
    </>
  );
}

export { HighlightText };
