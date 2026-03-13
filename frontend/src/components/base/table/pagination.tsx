import { ChevronsLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/base/ui/button";

function PaginationBar({
  page,
  totalPages,
  totalResults,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  showResults = true,
  className,
}: {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showResults?: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalResults);
  const lang = i18n.language;

  return (
    <div
      className={cn("flex items-center border-t pt-3 mt-3", showResults ? "justify-between" : "justify-end", className)}
    >
      {showResults && (
        <div className="text-sm text-muted-foreground">
          {t("pagination.results", {
            from: from.toLocaleString(lang),
            to: to.toLocaleString(lang),
            total: totalResults.toLocaleString(lang),
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} {t("pagination.per_page")}
            </option>
          ))}
        </select>
        <nav role="navigation" aria-label="pagination" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sm"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="size-4" />
            {t("pagination.first")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t("pagination.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("pagination.next")}
          </Button>
        </nav>
      </div>
    </div>
  );
}

export { PaginationBar };
