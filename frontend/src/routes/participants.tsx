import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
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
import { TextCell, DateCell, BadgeCell } from "@/components/base/table/cells";
import { InputSearch } from "@/components/base/input-search";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import { ParticipantFormDialog } from "@/components/feature/create-participant-dialog";
import { useParticipants } from "@/hooks/useParticipants";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getColumnPinningHeaderCN,
  getColumnPinningCellCN,
  getColumnPinningHeaderStyle,
  getColumnPinningCellStyle,
} from "@/lib/table-pinning";
import { cn } from "@/lib/utils";
import { SEX_BADGE, VITAL_STATUS_BADGE } from "@/lib/badge-variants";
import type { Participant } from "@/types/participant";

/** Participants list page with server-side pagination, sorting, and search. */
export default function Participants() {
  const { t, i18n } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { participants, total, totalPages, isLoading, error, mutate } =
    useParticipants({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortField: sorting[0]?.id ?? "last_name",
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
      search: debouncedSearch || undefined,
    });

  const columns = useMemo<ColumnDef<Participant>[]>(
    () => [
      {
        accessorKey: "id",
        size: 80,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.id")}
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <Link
            to={`/participants/${row.original.id}`}
            className="text-primary underline hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: "last_name",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.last_name")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">
            <TextCell>{getValue<string>()}</TextCell>
          </span>
        ),
      },
      {
        accessorKey: "first_name",
        size: 160,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.first_name")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <TextCell>{getValue<string>()}</TextCell>,
      },
      {
        accessorKey: "date_of_birth",
        size: 130,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.date_of_birth")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <DateCell date={getValue<string | null>()} />,
      },
      {
        accessorKey: "sex_at_birth_code",
        size: 120,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.sex_at_birth")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={SEX_BADGE[code] ?? "secondary"}>
              {t(`enums.sex_at_birth.${code}`, { defaultValue: code })}
            </BadgeCell>
          );
        },
      },
      {
        accessorKey: "vital_status_code",
        size: 120,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.vital_status")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={VITAL_STATUS_BADGE[code] ?? "secondary"}>
              {t(`enums.vital_status.${code}`, { defaultValue: code })}
            </BadgeCell>
          );
        },
      },
      {
        accessorKey: "ramq",
        size: 150,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.ramq")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <TextCell>
            <span className="font-mono">{getValue<string | null>()}</span>
          </TextCell>
        ),
      },
      {
        accessorKey: "created_at",
        size: 130,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("participants.columns.created_at")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => <DateCell date={getValue<string | null>()} />,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: participants,
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
        title={t("participants.title")}
        description={t("participants.description")}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus />
            {t("participants.add")}
          </Button>
        }
      />
      <ParticipantFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => mutate()}
      />
      <div className="p-8">
        <div className="rounded-lg border bg-background p-6">
          <InputSearch
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            placeholder={t("participants.search_placeholder")}
            className="mb-6 max-w-2xl"
          />
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
                      {isLoading ? t("common.loading") : t("common.noResults")}
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
