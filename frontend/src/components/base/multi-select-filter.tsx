import { useTranslation } from "react-i18next";
import { Filter, type LucideIcon } from "lucide-react";
import { Button } from "@/components/base/ui/button";
import { Checkbox } from "@/components/base/ui/checkbox";
import { Badge } from "@/components/base/badges/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/base/ui/dropdown-menu";

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  icon?: LucideIcon;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({
  label,
  icon: Icon = Filter,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps) {
  const { t } = useTranslation();

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Icon className="size-4" />
          {label}
          {selected.length > 0 && (
            <Badge variant="default" className="ml-1">
              {selected.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-3 min-w-48">
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onChange([])}
          >
            {t("common.clear")}
          </Button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
