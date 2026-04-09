import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Download, Link as LinkIcon, ListFilter, Plus, X } from "lucide-react";
import { useCartContext } from "@/contexts/cart-context";
import {
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
import { InputSearch } from "@/components/base/input-search";
import {
  ConsentClauseFilter,
  type ClauseFilterState,
} from "@/components/base/consent-clause-filter";
import { MultiSelectFilter } from "@/components/base/multi-select-filter";
import { TableFullscreenButton } from "@/components/base/table/table-fullscreen-button";
import {
  TableColumnVisibility,
  type ColumnVisibilityItem,
} from "@/components/base/table/table-column-visibility";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import { TooltipProvider } from "@/components/base/ui/tooltip";
import { ParticipantFormDialog } from "@/components/feature/create-participant-dialog";
import { BulkIdFilterDialog } from "@/components/feature/bulk-id-filter-dialog";
import { Badge } from "@/components/base/badges/badge";
import { useParticipants } from "@/hooks/useParticipants";
import { useExternalSystems } from "@/hooks/useExternalSystems";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useEnums } from "@/hooks/useEnums";
import { useParticipantsColumns } from "@/components/feature/participants-columns";
import { exportParticipantsExcel } from "@/lib/participants-excel-export";

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  vital_status_code: false,
};

/** Participants list page with server-side pagination, sorting, and search. */
export default function Participants() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const navigate = useNavigate();
  const { selectedParticipantIds, addParticipants, removeParticipants } =
    useCartContext();
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
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(DEFAULT_COLUMN_VISIBILITY);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consentFilter, setConsentFilter] = useState<ClauseFilterState>({
    registry: [],
    recontact: [],
    external_linkage: [],
  });
  const [extSystemFilter, setExtSystemFilter] = useState<string[]>([]);
  const [bulkIds, setBulkIds] = useState<number[] | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
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
      consentRegistry:
        consentFilter.registry.length > 0 ? consentFilter.registry : undefined,
      consentRecontact:
        consentFilter.recontact.length > 0
          ? consentFilter.recontact
          : undefined,
      consentExternalLinkage:
        consentFilter.external_linkage.length > 0
          ? consentFilter.external_linkage
          : undefined,
      externalSystems: extSystemFilter.length > 0 ? extSystemFilter : undefined,
      participantIds: bulkIds !== null ? bulkIds : undefined,
    });

  const { systems: externalSystems } = useExternalSystems();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportParticipantsExcel(
        {
          total: total || 200,
          sorting: sorting[0]
            ? [{ id: sorting[0].id, desc: sorting[0].desc }]
            : [],
          debouncedSearch,
          consentFilter,
          extSystemFilter,
          bulkIds,
        },
        enums,
        lang,
        t,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const columns = useParticipantsColumns({
    t,
    lang,
    enums,
    participants,
    selectedParticipantIds,
    addParticipants,
    removeParticipants,
  });

  const table = useReactTable({
    data: participants,
    columns,
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    enableColumnResizing: true,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      pagination,
      columnPinning,
      columnSizing,
      columnVisibility,
    },
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
      consent_external_linkage: t(
        "participants.columns.consent_external_linkage",
      ),
      created_at: t("participants.columns.created_at"),
    };
    return table
      .getAllLeafColumns()
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
        notFound={[]}
        onApply={(ids) => {
          setBulkIds(ids);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
      />
      <div
        className={cn(
          "p-8",
          isFullscreen && "fixed inset-0 z-50 bg-background overflow-auto",
        )}
      >
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
                    setConsentFilter({
                      registry: [],
                      recontact: [],
                      external_linkage: [],
                    });
                    setExtSystemFilter([]);
                    setBulkIds(null);
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
            <div
              className={cn("transition-opacity", isLoading && "opacity-50")}
            >
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
                    onChange={(id, visible) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [id]: visible,
                      }))
                    }
                    onReset={() =>
                      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)
                    }
                    pristine={
                      JSON.stringify(columnVisibility) ===
                      JSON.stringify(DEFAULT_COLUMN_VISIBILITY)
                    }
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
                  <TableFullscreenButton
                    active={isFullscreen}
                    onClick={setIsFullscreen}
                  />
                </div>
              </div>
              <DataTable
                table={table}
                isLoading={isLoading}
                emptyMessage={t("common.noResults")}
                headerClassName={(id) => {
                  if (id === "consent") return "border-x border-border";
                  if (id === "consent_registry")
                    return "border-l border-border";
                  if (id === "consent_external_linkage")
                    return "border-r border-border";
                  return undefined;
                }}
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
        </TooltipProvider>
      </div>
    </>
  );
}
