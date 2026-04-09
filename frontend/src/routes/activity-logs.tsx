import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { translateDetails } from "@/lib/translate-details";
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
} from "@tanstack/react-table";
import { DataTable } from "@/components/base/data-table";
import { PaginationBar } from "@/components/base/table/pagination";
import { SortableHeader } from "@/components/base/table/sortable-header";
import {
  TextCell,
  BadgeCell,
  TimestampCell,
} from "@/components/base/table/cells";
import { PageHeader } from "@/components/base/page/page-header";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { cn } from "@/lib/utils";
import { ACTION_BADGE } from "@/lib/badge-variants";
import { MultiSelectFilter } from "@/components/base/multi-select-filter";
import { CalendarDays, ListFilter, X } from "lucide-react";
import { Button } from "@/components/base/ui/button";
import { DatePicker } from "@/components/base/ui/date-picker";
import { Badge } from "@/components/base/badges/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/base/ui/dropdown-menu";
import { InputSearch } from "@/components/base/input-search";
import { HighlightText } from "@/components/base/highlight-text";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { enumLabel } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";
import type { ActivityLog } from "@/types/activity-log";

/** Global activity logs page with server-side pagination and sorting. */
export default function ActivityLogs() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
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
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, actionTypes, dateFrom, dateTo]);

  const { logs, total, totalPages, isLoading, error } = useActivityLogs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sortField: sorting[0]?.id ?? "created_at",
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
    search: debouncedSearch || undefined,
    actionType: actionTypes.length > 0 ? actionTypes.join(",") : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
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
            <HighlightText
              text={getValue<string>()}
              highlight={debouncedSearch}
            />
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
              {enumLabel(enums?.action_type, code, lang)}
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
          const translated = translateDetails(val, enums, lang);
          return (
            <TextCell>
              <HighlightText text={translated} highlight={debouncedSearch} />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="size-4" />
                  {t("activity_log.date_period")}
                  {(dateFrom || dateTo) && (
                    <Badge variant="default" className="ml-1">
                      1
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-3 min-w-56">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("activity_log.date_from")}
                    </label>
                    <DatePicker
                      value={dateFrom || undefined}
                      onChange={(v) => setDateFrom(v ?? "")}
                      maxDate={
                        dateTo ? new Date(dateTo + "T00:00:00") : undefined
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("activity_log.date_to")}
                    </label>
                    <DatePicker
                      value={dateTo || undefined}
                      onChange={(v) => setDateTo(v ?? "")}
                      minDate={
                        dateFrom ? new Date(dateFrom + "T00:00:00") : undefined
                      }
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                    >
                      {t("common.clear")}
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <MultiSelectFilter
              icon={ListFilter}
              label={t("activity_log.filter_action_type")}
              options={(enums?.action_type ?? []).map((e) => ({
                value: e.code,
                label: enumLabel(enums?.action_type, e.code, lang),
              }))}
              selected={actionTypes}
              onChange={setActionTypes}
            />
            {(actionTypes.length > 0 || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setActionTypes([]);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                <X className="size-3.5" />
                {t("common.clear")}
              </Button>
            )}
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
            <DataTable
              table={table}
              isLoading={isLoading}
              emptyMessage={t("activity_log.empty")}
            />
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
