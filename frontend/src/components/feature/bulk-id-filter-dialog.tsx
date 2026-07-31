import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X as XIcon, Loader2, Copy, Trash2 } from "lucide-react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/base/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/base/ui/radio-group";
import { Textarea } from "@/components/base/ui/textarea";
import { Button } from "@/components/base/ui/button";
import { Label } from "@/components/base/ui/label";
import { useExternalSystems } from "@/hooks/useExternalSystems";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  bulkIdFilterSchema,
  type BulkIdFilterValues,
} from "@/lib/validations/bulk-id-filter";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/base/ui/form";

/** Splits pasted text into trimmed, non-empty IDs (newline, comma, or semicolon separated). */
function parseIds(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface BulkIdFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (ids: number[], notFound: string[]) => void;
  hasActiveFilter: boolean;
  notFound: string[];
}

/** Dialog for filtering participants by pasting a list of internal or external IDs. */
export function BulkIdFilterDialog({
  open,
  onOpenChange,
  onApply,
  hasActiveFilter,
}: BulkIdFilterDialogProps) {
  const { t } = useTranslation();
  const { systems } = useExternalSystems();

  const schema = bulkIdFilterSchema(t);
  const form = useForm<BulkIdFilterValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "internal", idsText: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const source = form.watch("source");
  const idsText = form.watch("idsText");

  const [resolvedIds, setResolvedIds] = useState<number[]>([]);
  const [notFoundIds, setNotFoundIds] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);
  const debouncedIdsText = useDebouncedValue(idsText, 500);

  const resetResults = useCallback(() => {
    setResolvedIds([]);
    setNotFoundIds([]);
    setFoundCount(0);
  }, []);

  const resetForm = useCallback(() => {
    form.reset({ source: "internal", idsText: "" });
    resetResults();
  }, [form, resetResults]);

  /** Resolves the given IDs against the API and stores found/not-found results. */
  const validate = useCallback(async (ids: string[], src: string) => {
    setIsValidating(true);
    try {
      const { data } = await api.post("/participants/resolve-ids", {
        source: src,
        ids,
      });
      setResolvedIds(data.resolved_ids);
      setFoundCount((data.resolved_ids as number[]).length);
      setNotFoundIds(data.not_found);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Clear state when dialog opens and filter was cleared
  useEffect(() => {
    if (open && !hasActiveFilter) resetForm();
  }, [open, hasActiveFilter, resetForm]);

  // Validate the debounced IDs against the API (re-runs immediately on source change)
  useEffect(() => {
    if (!open) return;
    const ids = parseIds(debouncedIdsText);
    if (ids.length === 0) {
      resetResults();
      return;
    }
    validate(ids, source);
  }, [open, debouncedIdsText, source, validate, resetResults]);

  const handleCopyNotFound = () => {
    navigator.clipboard.writeText(notFoundIds.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRemoveNotFound = () => {
    const notFoundSet = new Set(notFoundIds);
    const remaining = parseIds(idsText).filter((id) => !notFoundSet.has(id));
    form.setValue("idsText", remaining.join("\n"));
    setNotFoundIds([]);
  };

  const placeholder =
    source === "internal"
      ? "42\n87\n150"
      : source === "guid"
        ? "a3f5b2c1d4e6...\nd9e7f8a4b2c1..."
        : `${source}-123456\n${source}-789012`;

  const handleApply = () => {
    onApply(resolvedIds, notFoundIds);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !hasActiveFilter) resetForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("participants.bulk_id_filter.title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="flex flex-col gap-4 py-2">
            <FormField
              schema={schema}
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">
                    {t("participants.bulk_id_filter.source")}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="internal" id="source-internal" />
                        <Label
                          htmlFor="source-internal"
                          className="font-normal"
                        >
                          {t("participants.bulk_id_filter.source_internal")}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="guid" id="source-guid" />
                        <Label htmlFor="source-guid" className="font-normal">
                          {t("participants.bulk_id_filter.source_guid")}
                        </Label>
                      </div>
                      {systems.map((s) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={s.name}
                            id={`source-${s.name}`}
                          />
                          <Label
                            htmlFor={`source-${s.name}`}
                            className="font-normal"
                          >
                            {s.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Input area */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="font-medium">
                    {t("participants.bulk_id_filter.ids_label")}
                  </Label>
                  {/* Inline validation status */}
                  {isValidating && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      {t("participants.bulk_id_filter.validating")}
                    </span>
                  )}
                  {!isValidating && foundCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-foreground">
                      <Check className="size-3" />
                      {t("participants.bulk_id_filter.found_count", {
                        count: foundCount,
                      })}
                    </span>
                  )}
                </div>
                {idsText.trim().length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                    onClick={() => {
                      form.setValue("idsText", "");
                      resetResults();
                    }}
                  >
                    {t("common.clear")}
                  </Button>
                )}
              </div>
              <FormField
                schema={schema}
                control={form.control}
                name="idsText"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={placeholder}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Not found box */}
            {notFoundIds.length > 0 && !isValidating && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-destructive font-medium">
                    <XIcon className="size-3.5" />
                    {t("participants.bulk_id_filter.not_found", {
                      count: notFoundIds.length,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                      onClick={handleCopyNotFound}
                    >
                      {copied ? (
                        <Check className="size-3 mr-1 text-green-foreground" />
                      ) : (
                        <Copy className="size-3 mr-1" />
                      )}
                      {t("participants.bulk_id_filter.copy_not_found")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                      onClick={handleRemoveNotFound}
                    >
                      <Trash2 className="size-3 mr-1" />
                      {t("participants.bulk_id_filter.remove_not_found")}
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 max-h-32 overflow-auto">
                  <pre className="text-xs font-mono text-destructive">
                    {notFoundIds.join("\n")}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleApply}
              disabled={
                isValidating || foundCount === 0 || notFoundIds.length > 0
              }
            >
              {t("participants.bulk_id_filter.apply")}
              {foundCount > 0 && ` (${foundCount})`}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
