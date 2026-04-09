import { type Table as TanstackTable, flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
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
}

export function DataTable<TData>({
  table,
  isLoading,
  emptyMessage = "No results.",
  headerClassName,
}: DataTableProps<TData>) {
  const columnCount = table.getAllLeafColumns().length;

  return (
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
  );
}
