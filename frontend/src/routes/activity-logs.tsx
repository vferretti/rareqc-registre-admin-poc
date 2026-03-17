import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type ColumnPinningState,
  type ColumnSizingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import { PaginationBar } from "@/components/base/table/pagination";
import { SortableHeader } from "@/components/base/table/sortable-header";
import { TextCell, BadgeCell, TimestampCell } from "@/components/base/table/cells";
import { PageHeader } from "@/components/base/page/page-header";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import {
  getColumnPinningHeaderCN,
  getColumnPinningCellCN,
  getColumnPinningHeaderStyle,
  getColumnPinningCellStyle,
} from "@/lib/table-pinning";
import { cn } from "@/lib/utils";
import { ACTION_BADGE } from "@/lib/badge-variants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import { InputSearch } from "@/components/base/input-search";
import { HighlightText } from "@/components/base/highlight-text";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ActivityLog } from "@/types/activity-log";

const ACTION_TYPES = [
  "participant_created",
  "participant_edited",
  "contact_created",
  "contact_edited",
  "contact_deleted",
] as const;

/** Global activity logs page with server-side pagination and sorting. */
export default function ActivityLogs() {
  const { t, i18n } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: [],
    right: [],
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, actionType]);

  const { logs, total, totalPages, isLoading, error } = useActivityLogs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sortField: sorting[0]?.id ?? "created_at",
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
    search: debouncedSearch || undefined,
    actionType: actionType || undefined,
  });

  const columns = useMemo<ColumnDef<ActivityLog>[]>(
    () => [
      {
        accessorKey: "created_at",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("activity_log.columns.date")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <TimestampCell date={getValue<string | null>()} />
        ),
      },
      {
        accessorKey: "author",
        size: 150,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("activity_log.columns.author")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <TextCell>
            <HighlightText text={getValue<string>()} highlight={debouncedSearch} />
          </TextCell>
        ),
      },
      {
        accessorKey: "action_type_code",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("activity_log.columns.action")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={ACTION_BADGE[code] ?? "secondary"}>
              {t(`enums.action_type.${code}`, { defaultValue: code })}
            </BadgeCell>
          );
        },
      },
      {
        accessorKey: "participant_name",
        size: 180,
        enableSorting: false,
        header: () => t("activity_log.columns.participant"),
        cell: ({ row }) => {
          const { participant_name: name, participant_id: id } = row.original;
          if (!name || !id) return <TextCell>—</TextCell>;
          return (
            <Link
              to={`/participants/${id}`}
              className="text-primary underline hover:text-primary/80"
            >
              <HighlightText text={name} highlight={debouncedSearch} />
            </Link>
          );
        },
      },
      {
        accessorKey: "details",
        size: 250,
        enableSorting: false,
        header: () => t("activity_log.columns.details"),
        cell: ({ getValue }) => {
          const val = getValue<string | null>();
          if (!val) return <TextCell>—</TextCell>;
          return (
            <TextCell>
              <HighlightText text={val} highlight={debouncedSearch} />
            </TextCell>
          );
        },
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: logs,
    columns,
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    enableColumnResizing: true,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    state: { sorting, pagination, columnPinning, columnSizing },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <PageHeader
        title={t("activity_log.title")}
        description={t("activity_log.description")}
      />
      <div className="p-8">
        <div className="rounded-lg border bg-background p-6">
          <div className="flex gap-3 mb-6 items-center">
            <InputSearch
              value={search}
              onChange={setSearch}
              placeholder={t("activity_log.search_placeholder")}
              className="max-w-2xl flex-1"
            />
            <Select
              value={actionType}
              onValueChange={(v) => setActionType(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue
                  placeholder={t("activity_log.filter_action_type")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("activity_log.all_actions")}
                </SelectItem>
                {ACTION_TYPES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`enums.action_type.${code}`, { defaultValue: code })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-destructive mb-4">{t("common.error")}</p>
          )}
          <div className={cn("transition-opacity", isLoading && "opacity-50")}>
            <div className="text-sm text-muted-foreground mb-1">
              {t("pagination.results", {
                from:
                  total > 0
                    ? (
                        pagination.pageIndex * pagination.pageSize +
                        1
                      ).toLocaleString(i18n.language)
                    : "0",
                to: Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  total,
                ).toLocaleString(i18n.language),
                total: total.toLocaleString(i18n.language),
              })}
            </div>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={getColumnPinningHeaderCN(header)}
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
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {isLoading
                        ? t("common.loading")
                        : t("activity_log.empty")}
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
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={pagination.pageIndex + 1}
              totalPages={totalPages}
              totalResults={total}
              pageSize={pagination.pageSize}
              showResults={false}
              onPageChange={(p) => table.setPageIndex(p - 1)}
              onPageSizeChange={(size) => {
                table.setPageSize(size);
                table.setPageIndex(0);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
