import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/base/ui/input";

interface InputSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/** Text input with search icon and clearable value. */
function InputSearch({
  value,
  onChange,
  placeholder,
  className,
  onFocus,
  onKeyDown,
}: InputSearchProps) {
  return (
    <div className={className}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-8"
          startIcon={<SearchIcon />}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export { InputSearch };
