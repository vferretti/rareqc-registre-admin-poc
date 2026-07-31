import { useEffect, useId, useRef, useState } from "react";
import useSWR from "swr";
import { MapPin } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export interface ParsedAddress {
  street_address: string;
  apartment_number: string;
  city: string;
  province: string;
  code_postal: string;
}

interface Suggestion {
  text: string;
  magicKey: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  disabled?: boolean;
  placeholder?: string;
}

const AQRES_BASE =
  "https://servicescarto.mern.gouv.qc.ca/pes/rest/services/Territoire/AdressesQuebec_Geocodage/GeocodeServer";

const NO_SUGGESTIONS: Suggestion[] = [];

/** Fetches AQRÉS address suggestions for a partial address. */
async function fetchSuggestions(url: string): Promise<Suggestion[]> {
  const res = await fetch(url);
  const data = await res.json();
  return data.suggestions ?? [];
}

/** Input with Adresses Québec (AQRÉS) autocomplete. */
export function AddressInput({
  value,
  onChange,
  onAddressSelect,
  disabled,
  placeholder,
}: AddressInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable, unique field name/id to defeat browser autofill heuristics — must
  // not change between renders, so we use useId() rather than Math.random().
  const autofillBypassId = `_aqres_${useId()}`;

  // Debounced SWR fetch (min 3 characters, only while the dropdown is open) —
  // same pattern as useSearch: conditional key + deduping for free caching.
  const query = useDebouncedValue(value, 300).trim();
  const { data: suggestions = NO_SUGGESTIONS } = useSWR(
    open && query.length >= 3
      ? `${AQRES_BASE}/suggest?${new URLSearchParams({
          text: query,
          f: "json",
          maxSuggestions: "5",
        })}`
      : null,
    fetchSuggestions,
    { dedupingInterval: 300, keepPreviousData: true },
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (suggestion: Suggestion) => {
    setOpen(false);
    try {
      const params = new URLSearchParams({
        SingleLine: suggestion.text,
        magicKey: suggestion.magicKey,
        f: "json",
        maxLocations: "1",
        outFields: "*",
      });
      const res = await fetch(`${AQRES_BASE}/findAddressCandidates?${params}`);
      const data = await res.json();
      if (data.candidates?.length) {
        const attrs = data.candidates[0].attributes;
        const streetParts = [
          attrs.House,
          attrs.PreType,
          attrs.StreetName,
          attrs.SufType,
        ].filter(Boolean);
        const parsed: ParsedAddress = {
          street_address: streetParts.join(" "),
          apartment_number: "",
          city: attrs.City || "",
          province: attrs.State === "Québec" ? "QC" : attrs.State || "QC",
          code_postal: attrs.ZIP
            ? attrs.ZIP.replace(/(.{3})(.{3})/, "$1 $2")
            : "",
        };
        onChange(parsed.street_address);
        onAddressSelect(parsed);
      }
    } catch {
      // Silently fail — user can still type manually
    }
  };

  // Hide immediately when the current input drops below the minimum length,
  // without waiting for the debounced query to catch up.
  const showSuggestions =
    open && value.trim().length >= 3 && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="new-password"
        name={autofillBypassId}
        id={autofillBypassId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {showSuggestions && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li key={s.magicKey}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors cursor-pointer"
                onClick={() => handleSelect(s)}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
