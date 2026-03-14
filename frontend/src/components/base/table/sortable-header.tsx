import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowDownUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/base/ui/button";
import { ColumnHeaderActions } from "@/components/base/table/column-header-actions";

type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps<T = unknown> {
  children: React.ReactNode;
  sortDirection?: SortDirection;
  onSort?: ((event: unknown) => void) | (() => void);
  column?: Column<T, unknown>;
}

function SortableHeader<T = unknown>({
  children,
  sortDirection,
  onSort,
  column,
}: SortableHeaderProps<T>) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </span>
      <div className="flex items-center">
        {onSort && (
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn("size-6 shrink-0", {
              "opacity-0 group-hover/header:opacity-100": !sortDirection,
            })}
            onClick={onSort}
          >
            {sortDirection === "asc" ? (
              <ArrowUp className="size-4" />
            ) : sortDirection === "desc" ? (
              <ArrowDown className="size-4" />
            ) : (
              <ArrowDownUp className="size-4" />
            )}
          </Button>
        )}
        {column && <ColumnHeaderActions column={column} />}
      </div>
    </div>
  );
}

export { SortableHeader };
export type { SortDirection };
