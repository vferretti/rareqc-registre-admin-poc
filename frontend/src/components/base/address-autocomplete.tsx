import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

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

/** Input with Adresses Québec (AQRÉS) autocomplete. */
export function AddressInput({
  value,
  onChange,
  onAddressSelect,
  disabled,
  placeholder,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const justSelectedRef = useRef(false);

  // Fetch suggestions on value change (only when focused)
  useEffect(() => {
    if (!focused) return;
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    if (!value.trim() || value.length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          text: value,
          f: "json",
          maxSuggestions: "5",
        });
        const res = await fetch(`${AQRES_BASE}/suggest?${params}`);
        const data = await res.json();
        if (data.suggestions?.length) {
          setSuggestions(data.suggestions);
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value, focused]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = async (suggestion: Suggestion) => {
    justSelectedRef.current = true;
    setOpen(false);
    setSuggestions([]);
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

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="new-password"
        name={`_aqres_${Math.random()}`}
        id={`_aqres_${Math.random()}`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && suggestions.length > 0 && (
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
