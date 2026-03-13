import type { Column } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/base/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/base/ui/dropdown-menu";

interface ColumnHeaderActionsProps<T> {
  column: Column<T, unknown>;
}

function ColumnHeaderActions<T>({ column }: ColumnHeaderActionsProps<T>) {
  const { t } = useTranslation();
  const isPinned = column.getIsPinned();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" className="size-6 shrink-0 opacity-0 group-hover/header:opacity-100">
          {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => column.pin("left")}>
          <Pin className="size-4 rotate-45" />
          {t("table.pin_left")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.pin("right")}>
          <Pin className="size-4 -rotate-45" />
          {t("table.pin_right")}
        </DropdownMenuItem>
        {isPinned && (
          <DropdownMenuItem onClick={() => column.pin(false)}>
            <PinOff className="size-4" />
            {t("table.unpin")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ColumnHeaderActions };
