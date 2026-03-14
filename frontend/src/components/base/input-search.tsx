import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/base/ui/input";

interface InputSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function InputSearch({
  value,
  onChange,
  placeholder,
  className,
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
