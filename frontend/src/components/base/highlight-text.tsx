interface HighlightTextProps {
  text: string | null | undefined;
  highlight: string;
}

function HighlightText({ text, highlight }: HighlightTextProps) {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;

  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-highlight text-highlight-foreground rounded-sm">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export { HighlightText };
