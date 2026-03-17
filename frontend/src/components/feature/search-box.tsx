import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { InputSearch } from "@/components/base/input-search";
import { SearchSuggestionItem } from "@/components/base/search-suggestion-item";
import { useSearch } from "@/hooks/useSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/** Search box with autocomplete suggestions that navigates to the participant detail page. */
export function SearchBox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 250);
  const { suggestions, isLoading } = useSearch(debouncedQuery);

  const showDropdown = open && query.trim().length >= 2;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const selectSuggestion = (participantId: number) => {
    setOpen(false);
    setQuery("");
    navigate(`/participants/${participantId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex].participant_id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative max-w-xl w-full">
      <InputSearch
        value={query}
        onChange={(val) => {
          setQuery(val);
          setOpen(true);
        }}
        placeholder={t("home.search_placeholder")}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {t("home.search_no_results")}
            </div>
          )}

          {!isLoading &&
            suggestions.map((s, index) => (
              <SearchSuggestionItem
                key={`${s.participant_id}-${s.match_field}`}
                participantName={s.participant_name}
                matchField={s.match_field}
                matchValue={s.match_value}
                query={query}
                active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(s.participant_id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
