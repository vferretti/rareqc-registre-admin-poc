import { useCallback, useState } from "react";

/** Hook that copies text to clipboard and returns a "just copied" state for feedback. */
export function useCopyFeedback(timeout = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(
    (key: string, text: string) => {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), timeout);
    },
    [timeout],
  );
  return { copiedKey, copy };
}
