import type { LucideIcon } from "lucide-react";
import { CreditCard, UserRound, Mail, Phone, Link } from "lucide-react";

const MATCH_ICONS: Record<string, LucideIcon> = {
  ramq: CreditCard,
  contact: UserRound,
  email: Mail,
  phone: Phone,
  external_id: Link,
};

/** Bolds portions of text that match a query string. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    result.push(<strong key={match.index}>{match[0]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return <>{result}</>;
}

interface SearchSuggestionItemProps {
  /** Participant full name. */
  participantName: string;
  /** Which field matched the query (name, ramq, contact, email, phone). */
  matchField: string;
  /** The value of the matched field. */
  matchValue: string;
  /** The search query, used for bolding. */
  query: string;
  /** Whether this item is currently highlighted via keyboard. */
  active?: boolean;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

/** A single suggestion row in the search dropdown. */
function SearchSuggestionItem({
  participantName,
  matchField,
  matchValue,
  query,
  active = false,
  onMouseEnter,
  onClick,
}: SearchSuggestionItemProps) {
  const Icon = MATCH_ICONS[matchField];

  return (
    <button
      type="button"
      className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent ${
        active ? "bg-accent" : ""
      }`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="text-sm font-medium text-foreground">
        <HighlightMatch text={participantName} query={query} />
      </span>
      {matchField !== "name" && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {Icon && <Icon className="size-3 shrink-0" />}
          <span>
            <HighlightMatch text={matchValue} query={query} />
          </span>
        </span>
      )}
    </button>
  );
}

export { SearchSuggestionItem };
