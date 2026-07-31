import type { LucideIcon } from "lucide-react";
import { CreditCard, Hash, UserRound, Mail, Phone, Link } from "lucide-react";
import { splitOnHighlight } from "@/lib/highlight";

const MATCH_ICONS: Record<string, LucideIcon> = {
  id: Hash,
  ramq: CreditCard,
  contact: UserRound,
  email: Mail,
  phone: Phone,
  external_id: Link,
};

/** Bolds portions of text that match a query string. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitOnHighlight(text, query).map(({ segment, isMatch }, i) =>
        isMatch ? <strong key={i}>{segment}</strong> : segment,
      )}
    </>
  );
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
