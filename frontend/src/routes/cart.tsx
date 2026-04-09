import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet, ShoppingCart, Trash2 } from "lucide-react";
import ExcelJS from "exceljs";
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { DataTable } from "@/components/base/data-table";
import { PaginationBar } from "@/components/base/table/pagination";
import { SortableHeader } from "@/components/base/table/sortable-header";
import { TextCell, DateCell, BadgeCell } from "@/components/base/table/cells";
import { InputSearch } from "@/components/base/input-search";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import { useCartContext } from "@/contexts/cart-context";
import { SEX_BADGE } from "@/lib/badge-variants";
import { enumLabel } from "@/lib/enum-label";
import { generateCartExcelReport } from "@/lib/cart-excel-report";
import { useEnums } from "@/hooks/useEnums";
import api from "@/lib/api";
import type { CartItem, CartExportData } from "@/types/cart";

export default function Cart() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const { items, isLoading, removeParticipants, clearCart } = useCartContext();
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.first_name.toLowerCase().includes(q) ||
        item.last_name.toLowerCase().includes(q) ||
        (item.ramq && item.ramq.toLowerCase().includes(q)) ||
        String(item.participant_id).includes(q),
    );
  }, [items, search]);

  const columns = useMemo<ColumnDef<CartItem>[]>(
    () => [
      {
        accessorKey: "participant_id",
        size: 80,
        header: ({ column }) => (
          <SortableHeader
            sortDirection={column.getIsSorted() || null}
            onSort={column.getToggleSortingHandler()}
            column={column}
          >
            {t("cart.columns.id")}
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <Link
            to={`/participants/${row.original.participant_id}`}
            className="text-primary underline hover:text-primary/80"
          >
            {row.original.participant_id}
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
            {t("cart.columns.last_name")}
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
            {t("cart.columns.first_name")}
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
            {t("cart.columns.date_of_birth")}
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
            {t("cart.columns.sex_at_birth")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => {
          const code = getValue<string>();
          return (
            <BadgeCell variant={SEX_BADGE[code] ?? "secondary"}>
              {enumLabel(enums?.sex_at_birth, code, lang)}
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
            {t("cart.columns.ramq")}
          </SortableHeader>
        ),
        cell: ({ getValue }) => (
          <TextCell>
            <span className="font-mono">{getValue<string | null>()}</span>
          </TextCell>
        ),
      },
      {
        id: "actions",
        size: 60,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeParticipants([row.original.participant_id])}
          >
            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
          </Button>
        ),
      },
    ],
    [t, removeParticipants],
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleExport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(t("cart.title"));
    ws.addRow([
      t("cart.columns.id"),
      t("cart.columns.last_name"),
      t("cart.columns.first_name"),
      t("cart.columns.date_of_birth"),
      t("cart.columns.sex_at_birth"),
      t("cart.columns.ramq"),
    ]);
    for (const item of items) {
      ws.addRow([
        item.participant_id,
        item.last_name,
        item.first_name,
        item.date_of_birth
          ? new Date(item.date_of_birth).toLocaleDateString(i18n.language)
          : "",
        enumLabel(enums?.sex_at_birth, item.sex_at_birth_code, lang),
        item.ramq ?? "",
      ]);
    }
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panier_participants_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReportExport = async () => {
    setIsExporting(true);
    try {
      const { data } = await api.post<CartExportData>("/cart/export-data");
      await generateCartExcelReport(data, enums, lang, t);
    } catch (err) {
      console.error("Failed to export report:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("cart.title")} description={t("cart.description")} />
      <div className="p-8">
        {items.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <ShoppingCart className="size-12" />
            <p className="text-lg">{t("cart.empty")}</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-background p-6">
            <InputSearch
              value={search}
              onChange={setSearch}
              placeholder={t("cart.search_placeholder")}
              className="mb-4 max-w-2xl"
            />
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">
                {t("cart.item_count", { count: items.length })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReportExport}
                  disabled={items.length === 0 || isExporting}
                >
                  <FileSpreadsheet className="size-4 mr-1" />
                  {t("cart.excel_report")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={items.length === 0}
                >
                  <Download className="size-4 mr-1" />
                  {t("cart.export")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearCart()}
                  disabled={items.length === 0}
                >
                  <Trash2 className="size-4 mr-1" />
                  {t("cart.clear")}
                </Button>
              </div>
            </div>
            <DataTable
              table={table}
              isLoading={isLoading}
              emptyMessage={t("common.noResults")}
            />
            <PaginationBar
              page={pagination.pageIndex + 1}
              totalPages={Math.ceil(filteredItems.length / pagination.pageSize)}
              totalResults={filteredItems.length}
              pageSize={pagination.pageSize}
              showResults={false}
              onPageChange={(p) => table.setPageIndex(p - 1)}
              onPageSizeChange={(size) => {
                table.setPageSize(size);
                table.setPageIndex(0);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
