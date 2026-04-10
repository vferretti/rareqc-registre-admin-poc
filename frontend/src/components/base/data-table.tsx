import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import { TableFullscreenButton } from "@/components/base/table/table-fullscreen-button";
import {
  TableColumnVisibility,
  type ColumnVisibilityItem,
} from "@/components/base/table/table-column-visibility";
import { Button } from "@/components/base/ui/button";
import { TooltipProvider } from "@/components/base/ui/tooltip";
import {
  getColumnPinningHeaderCN,
  getColumnPinningCellCN,
  getColumnPinningHeaderStyle,
  getColumnPinningCellStyle,
} from "@/lib/table-pinning";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Extra className applied to specific header cells, keyed by header.id */
  headerClassName?: (headerId: string) => string | undefined;
  /** Column labels for visibility menu, keyed by column id */
  columnLabels?: Record<string, string>;
  /** Default column visibility state — used by the reset button */
  defaultColumnVisibility?: Record<string, boolean>;
  /** Enable fullscreen toggle */
  enableFullscreen?: boolean;
  /** Enable export button — requires onExport callback */
  enableExport?: boolean;
  /** Called when user clicks the export button */
  onExport?: () => void;
  /** Disables the export button (e.g. during export or when no data) */
  exportDisabled?: boolean;
  /** Export button tooltip */
  exportTitle?: string;
  /** Total results count for the "X - Y of Z" display */
  total?: number;
  /** Current page index (0-based) */
  pageIndex?: number;
  /** Page size */
  pageSize?: number;
  /** Extra content rendered in the toolbar (right side, before the 3 icons) */
  toolbarActions?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  isLoading,
  emptyMessage = "No results.",
  headerClassName,
  columnLabels,
  defaultColumnVisibility,
  enableFullscreen = false,
  enableExport = false,
  onExport,
  exportDisabled = false,
  exportTitle,
  total,
  pageIndex,
  pageSize,
  toolbarActions,
}: DataTableProps<TData>) {
  const { t, i18n } = useTranslation();
  const columnCount = table.getAllLeafColumns().length;

  // --- Fullscreen ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // --- Column visibility ---
  const enableColumnVisibility = !!columnLabels;
  const currentVisibility = table.getState().columnVisibility;
  const visibilityItems = useMemo<ColumnVisibilityItem[]>(() => {
    if (!columnLabels) return [];
    return table
      .getAllLeafColumns()
      .filter((col) => col.id in columnLabels)
      .map((col) => ({
        id: col.id,
        label: columnLabels[col.id] ?? col.id,
        visible: col.getIsVisible(),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnLabels, currentVisibility]);

  const hasToolbar =
    enableColumnVisibility ||
    enableExport ||
    enableFullscreen ||
    total !== undefined;

  // --- Results text ---
  const resultsText = useMemo(() => {
    if (
      total === undefined ||
      pageIndex === undefined ||
      pageSize === undefined
    )
      return null;
    const from =
      total > 0
        ? (pageIndex * pageSize + 1).toLocaleString(i18n.language)
        : "0";
    const to = Math.min((pageIndex + 1) * pageSize, total).toLocaleString(
      i18n.language,
    );
    return t("pagination.results", {
      from,
      to,
      total: total.toLocaleString(i18n.language),
    });
  }, [total, pageIndex, pageSize, i18n.language, t]);

  const tableContent = (
    <>
      {hasToolbar && (
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-muted-foreground">{resultsText}</div>
          <div className="flex items-center gap-1">
            {toolbarActions}
            {enableColumnVisibility && (
              <TableColumnVisibility
                columns={visibilityItems}
                onChange={(id, visible) =>
                  table.setColumnVisibility((prev) => ({
                    ...prev,
                    [id]: visible,
                  }))
                }
                onReset={() =>
                  table.setColumnVisibility(defaultColumnVisibility ?? {})
                }
                pristine={
                  defaultColumnVisibility
                    ? JSON.stringify(table.getState().columnVisibility) ===
                      JSON.stringify(defaultColumnVisibility)
                    : visibilityItems.every((col) => col.visible)
                }
              />
            )}
            {enableExport && onExport && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onExport}
                disabled={exportDisabled}
                title={exportTitle}
              >
                <Download className="size-4" />
              </Button>
            )}
            {enableFullscreen && (
              <TableFullscreenButton
                active={isFullscreen}
                onClick={setIsFullscreen}
              />
            )}
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    getColumnPinningHeaderCN(header),
                    headerClassName?.(header.id),
                  )}
                  style={getColumnPinningHeaderStyle(header)}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  {header.column.getCanResize() && (
                    <div
                      onDoubleClick={() => header.column.resetSize()}
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        "absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none bg-foreground/50 opacity-0 hover:opacity-50",
                        header.column.getIsResizing() && "opacity-100",
                      )}
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center text-muted-foreground"
              >
                {isLoading ? "..." : emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={getColumnPinningCellCN(cell.column)}
                    style={getColumnPinningCellStyle(cell.column)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );

  // Wrap with fullscreen + tooltip only when needed
  if (!enableFullscreen && !enableColumnVisibility) return tableContent;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          isFullscreen && "fixed inset-0 z-50 bg-background overflow-auto p-6",
        )}
      >
        {tableContent}
      </div>
    </TooltipProvider>
  );
}
