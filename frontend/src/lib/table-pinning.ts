import type { Column, Header } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export function getColumnPinningHeaderCN<T>(header: Header<T, unknown>) {
  const isPinned = header.column.getIsPinned();
  return cn(
    isPinned && "sticky z-10",
    isPinned === "left" && "border-r border-r-border border-r-pinned",
    isPinned === "right" && "border-l border-l-border border-l-pinned",
  );
}

export function getColumnPinningCellCN<T>(column: Column<T, unknown>) {
  const isPinned = column.getIsPinned();
  return cn(
    isPinned && "sticky z-10 bg-background",
    isPinned === "left" && "border-r border-r-border border-r-pinned",
    isPinned === "right" && "border-l border-l-border border-l-pinned",
  );
}

export function getColumnPinningHeaderStyle<T>(
  header: Header<T, unknown>,
): React.CSSProperties {
  const isPinned = header.column.getIsPinned();
  if (!isPinned) return { width: header.getSize() };
  return {
    left: isPinned === "left" ? `${header.getStart("left")}px` : undefined,
    right:
      isPinned === "right" ? `${header.column.getAfter("right")}px` : undefined,
    width: header.getSize(),
  };
}

export function getColumnPinningCellStyle<T>(
  column: Column<T, unknown>,
): React.CSSProperties {
  const isPinned = column.getIsPinned();
  if (!isPinned) return { width: column.getSize() };
  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    width: column.getSize(),
  };
}
