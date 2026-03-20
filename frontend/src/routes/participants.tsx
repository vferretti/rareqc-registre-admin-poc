import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Download, Link as LinkIcon, ListFilter, Plus, X } from "lucide-react";
import ExcelJS from "exceljs";
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
import { ConsentClauseFilter, type ClauseFilterState } from "@/components/base/consent-clause-filter";
import { MultiSelectFilter } from "@/components/base/multi-select-filter";
import { TableFullscreenButton } from "@/components/base/table/table-fullscreen-button";
import { TableColumnVisibility, type ColumnVisibilityItem } from "@/components/base/table/table-column-visibility";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import { ParticipantFormDialog } from "@/components/feature/create-participant-dialog";
import { BulkIdFilterDialog } from "@/components/feature/bulk-id-filter-dialog";
import { Badge } from "@/components/base/badges/badge";
import api from "@/lib/api";
import { useParticipants } from "@/hooks/useParticipants";
import { useExternalSystems } from "@/hooks/useExternalSystems";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  getColumnPinningHeaderCN,
  getColumnPinningCellCN,
  getColumnPinningHeaderStyle,
  getColumnPinningCellStyle,
} from "@/lib/table-pinning";
import { cn } from "@/lib/utils";
import { SEX_BADGE, VITAL_STATUS_BADGE, CONSENT_STATUS_ICON, CONSENT_STATUS_COLOR } from "@/lib/badge-variants";
import type { Participant } from "@/types/participant";

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = { vital_status_code: false };

/** Participants list page with server-side pagination, sorting, and search. */
export default function Participants() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(DEFAULT_COLUMN_VISIBILITY);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consentFilter, setConsentFilter] = useState<ClauseFilterState>({
    registry: [],
    recontact: [],
    external_linkage: [],
  });
  const [extSystemFilter, setExtSystemFilter] = useState<string[]>([]);
  const [bulkIds, setBulkIds] = useState<number[] | null>(null);
  const [bulkNotFound, setBulkNotFound] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { participants, total, totalPages, isLoading, error, mutate } =
    useParticipants({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortField: sorting[0]?.id ?? "last_name",
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
      search: debouncedSearch || undefined,
      consentRegistry: consentFilter.registry.length > 0 ? consentFilter.registry : undefined,
      consentRecontact: consentFilter.recontact.length > 0 ? consentFilter.recontact : undefined,
      consentExternalLinkage: consentFilter.external_linkage.length > 0 ? consentFilter.external_linkage : undefined,
      externalSystems: extSystemFilter.length > 0 ? extSystemFilter : undefined,
      participantIds: bulkIds !== null ? bulkIds : undefined,
    });

  const { systems: externalSystems } = useExternalSystems();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all participants with same filters but no pagination
      const params = new URLSearchParams({
        page_index: "0",
        page_size: String(total || 200),
        sort_field: sorting[0]?.id ?? "last_name",
        sort_order: sorting[0]?.desc ? "desc" : "asc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (consentFilter.registry.length > 0) params.set("consent_registry", consentFilter.registry.join(","));
      if (consentFilter.recontact.length > 0) params.set("consent_recontact", consentFilter.recontact.join(","));
      if (consentFilter.external_linkage.length > 0) params.set("consent_external_linkage", consentFilter.external_linkage.join(","));
      if (extSystemFilter.length > 0) params.set("external_system", extSystemFilter.join(","));
      if (bulkIds !== null) params.set("participant_ids", bulkIds.join(","));

      const { data } = await api.get(`/participants?${params.toString()}`);
      const rows: Participant[] = data.data;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(t("participants.title"));

      ws.addRow([
        t("participants.columns.id"),
        t("participants.columns.last_name"),
        t("participants.columns.first_name"),
        t("participants.columns.date_of_birth"),
        t("participants.columns.sex_at_birth"),
        t("participants.columns.vital_status"),
        t("participants.columns.ramq"),
        t("participants.columns.consent_registry"),
        t("participants.columns.consent_recontact"),
        t("participants.columns.consent_external_linkage"),
        t("participants.columns.created_at"),
      ]);

      for (const p of rows) {
        ws.addRow([
          p.id,
          p.last_name,
          p.first_name,
          p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString(i18n.language) : "",
          t(`enums.sex_at_birth.${p.sex_at_birth_code}`, { defaultValue: p.sex_at_birth_code }),
          t(`enums.vital_status.${p.vital_status_code}`, { defaultValue: p.vital_status_code }),
          p.ramq ?? "",
          p.consent_registry ? t(`enums.consent_status.${p.consent_registry}`, { defaultValue: p.consent_registry }) : "",
          p.consent_recontact ? t(`enums.consent_status.${p.consent_recontact}`, { defaultValue: p.consent_recontact }) : "",
          p.consent_external_linkage ? t(`enums.consent_status.${p.consent_external_linkage}`, { defaultValue: p.consent_external_linkage }) : "",
          p.created_at ? new Date(p.created_at).toLocaleDateString(i18n.language) : "",
        ]);
      }

      // Bold header row
      ws.getRow(1).font = { bold: true };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participants_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

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
        id: "consent",
        header: () => (
          <span className="text-center w-full block font-semibold">
            {t("participants.columns.consent")}
          </span>
        ),
        columns: (["consent_registry", "consent_recontact", "consent_external_linkage"] as const).map((key) => ({
          accessorKey: key,
          size: 90,
          header: () => (
            <span className="text-center w-full block text-xs">
              {t(`participants.columns.${key}`)}
            </span>
          ),
          cell: ({ getValue }: { getValue: () => string | null }) => {
            const code = getValue();
            if (!code) return <span className="block text-center text-muted-foreground">—</span>;
            const Icon = CONSENT_STATUS_ICON[code] ?? CheckCircle2;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex justify-center">
                    <Icon className={`size-4 ${CONSENT_STATUS_COLOR[code] ?? "text-muted-foreground"}`} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {t(`enums.consent_status.${code}`, { defaultValue: code })}
                </TooltipContent>
              </Tooltip>
            );
          },
        })),
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
    state: { sorting, pagination, columnPinning, columnSizing, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const visibilityItems = useMemo<ColumnVisibilityItem[]>(() => {
    const labels: Record<string, string> = {
      id: t("participants.columns.id"),
      last_name: t("participants.columns.last_name"),
      first_name: t("participants.columns.first_name"),
      date_of_birth: t("participants.columns.date_of_birth"),
      sex_at_birth_code: t("participants.columns.sex_at_birth"),
      vital_status_code: t("participants.columns.vital_status"),
      ramq: t("participants.columns.ramq"),
      consent_registry: t("participants.columns.consent_registry"),
      consent_recontact: t("participants.columns.consent_recontact"),
      consent_external_linkage: t("participants.columns.consent_external_linkage"),
      created_at: t("participants.columns.created_at"),
    };
    return table.getAllLeafColumns()
      .filter((col) => col.id in labels)
      .map((col) => ({
        id: col.id,
        label: labels[col.id] ?? col.id,
        visible: col.getIsVisible(),
      }));
  }, [t, columnVisibility]);

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
        onSuccess={(id) => {
          if (id) navigate(`/participants/${id}`);
          else mutate();
        }}
      />
      <BulkIdFilterDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        hasActiveFilter={bulkIds !== null}
        onApply={(ids, notFound) => {
          setBulkIds(ids);
          setBulkNotFound(notFound);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
      />
      <div className={cn("p-8", isFullscreen && "fixed inset-0 z-50 bg-background overflow-auto")}>
        <TooltipProvider delayDuration={200}>
        <div className="rounded-lg border bg-background p-6">
          <div className="flex items-center gap-3 mb-6">
            <InputSearch
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              placeholder={t("participants.search_placeholder")}
              className="max-w-2xl flex-1"
            />
            <ConsentClauseFilter
              value={consentFilter}
              onChange={(v) => {
                setConsentFilter(v);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            />
            {externalSystems.length > 0 && (
              <MultiSelectFilter
                icon={LinkIcon}
                label={t("participants.external_system_filter")}
                options={externalSystems.map((s) => ({
                  value: s.name,
                  label: s.name,
                }))}
                selected={extSystemFilter}
                onChange={(v) => {
                  setExtSystemFilter(v);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setBulkDialogOpen(true)}
            >
              <ListFilter className="size-4" />
              {t("participants.bulk_id_filter.button")}
              {bulkIds !== null && (
                <Badge variant="default" className="ml-1">
                  {bulkIds.length}
                </Badge>
              )}
            </Button>
            {bulkNotFound.length > 0 && (
              <span className="text-sm text-destructive">
                {t("participants.bulk_id_filter.not_found", { count: bulkNotFound.length })}
              </span>
            )}
            {(consentFilter.registry.length > 0 ||
              consentFilter.recontact.length > 0 ||
              consentFilter.external_linkage.length > 0 ||
              extSystemFilter.length > 0 ||
              bulkIds !== null) && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setConsentFilter({ registry: [], recontact: [], external_linkage: [] });
                  setExtSystemFilter([]);
                  setBulkIds(null);
                  setBulkNotFound([]);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
            <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground">
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
            <div className="flex items-center gap-1">
              <TableColumnVisibility
                columns={visibilityItems}
                onChange={(id, visible) => setColumnVisibility((prev) => ({ ...prev, [id]: visible }))}
                onReset={() => setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)}
                pristine={JSON.stringify(columnVisibility) === JSON.stringify(DEFAULT_COLUMN_VISIBILITY)}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleExport}
                disabled={isExporting || total === 0}
                title={t("participants.export")}
              >
                <Download className="size-4" />
              </Button>
              <TableFullscreenButton active={isFullscreen} onClick={setIsFullscreen} />
            </div>
            </div>
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
                          header.id === "consent" && "border-x border-border",
                          header.id === "consent_registry" && "border-l border-border",
                          header.id === "consent_external_linkage" && "border-r border-border",
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
        </TooltipProvider>
      </div>
    </>
  );
}
