import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/ui/button";
import { Checkbox } from "@/components/base/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/base/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";

export interface ColumnVisibilityItem {
  id: string;
  label: string;
  visible: boolean;
}

interface TableColumnVisibilityProps {
  columns: ColumnVisibilityItem[];
  onChange: (id: string, visible: boolean) => void;
  onReset?: () => void;
  pristine?: boolean;
}

export function TableColumnVisibility({
  columns,
  onChange,
  onReset,
  pristine = true,
}: TableColumnVisibilityProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <Settings className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("common.table.columns")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="p-3 min-w-48">
        <div className="flex flex-col gap-2">
          {columns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={col.visible}
                onCheckedChange={(checked) => onChange(col.id, !!checked)}
              />
              {col.label}
            </label>
          ))}
        </div>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            disabled={pristine}
            onClick={onReset}
          >
            {t("common.table.reset")}
          </Button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
