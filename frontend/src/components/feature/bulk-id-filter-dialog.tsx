import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X as XIcon, Loader2, Scissors } from "lucide-react";
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
  const [source, setSource] = useState("internal");
  const [idsText, setIdsText] = useState("");
  const [resolvedIds, setResolvedIds] = useState<number[]>([]);
  const [notFoundIds, setNotFoundIds] = useState<string[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Clear state when dialog opens and filter was cleared
  useEffect(() => {
    if (open && !hasActiveFilter) {
      setIdsText("");
      setSource("internal");
      resetResults();
    }
  }, [open, hasActiveFilter]);

  // Debounced validation on text change
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);

    const ids = parseIds(idsText);
    if (ids.length === 0) {
      resetResults();
      return;
    }

    debounceRef.current = setTimeout(() => validate(idsText, source), 500);
    return () => clearTimeout(debounceRef.current);
  }, [idsText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-validate immediately when source changes
  useEffect(() => {
    if (!open) return;
    if (parseIds(idsText).length > 0) {
      validate(idsText, source);
    }
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseIds = (text: string) =>
    text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);

  const resetResults = () => {
    setResolvedIds([]);
    setNotFoundIds([]);
    setFoundCount(0);
  };

  const validate = async (text: string, src: string) => {
    const ids = parseIds(text);
    if (ids.length === 0) return;

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
  };

  const cutNotFound = () => {
    navigator.clipboard.writeText(notFoundIds.join("\n"));
    const notFoundSet = new Set(notFoundIds);
    const remaining = parseIds(idsText).filter((id) => !notFoundSet.has(id));
    setIdsText(remaining.join("\n"));
    setNotFoundIds([]);
  };

  const placeholder =
    source === "internal"
      ? "42\n87\n150"
      : `${source}-123456\n${source}-789012`;

  const handleApply = () => {
    onApply(resolvedIds, notFoundIds);
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !hasActiveFilter) {
      setIdsText("");
      setSource("internal");
      resetResults();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("participants.bulk_id_filter.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="font-medium">
              {t("participants.bulk_id_filter.source")}
            </Label>
            <RadioGroup value={source} onValueChange={setSource}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="internal" id="source-internal" />
                <Label htmlFor="source-internal" className="font-normal">
                  {t("participants.bulk_id_filter.source_internal")}
                </Label>
              </div>
              {systems.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <RadioGroupItem value={s.name} id={`source-${s.name}`} />
                  <Label htmlFor={`source-${s.name}`} className="font-normal">
                    {s.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

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
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="size-3" />
                    {t("participants.bulk_id_filter.found_count", { count: foundCount })}
                  </span>
                )}
              </div>
              {idsText.trim().length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                  onClick={() => { setIdsText(""); resetResults(); }}
                >
                  {t("common.clear")}
                </Button>
              )}
            </div>
            <Textarea
              value={idsText}
              onChange={(e) => setIdsText(e.target.value)}
              placeholder={placeholder}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Not found box */}
          {notFoundIds.length > 0 && !isValidating && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-destructive font-medium">
                  <XIcon className="size-3.5" />
                  {t("participants.bulk_id_filter.not_found", { count: notFoundIds.length })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 px-1.5 text-xs text-muted-foreground"
                  onClick={cutNotFound}
                >
                  <Scissors className="size-3 mr-1" />
                  {t("participants.bulk_id_filter.cut_not_found")}
                </Button>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 max-h-32 overflow-auto">
                <pre className="text-xs font-mono text-destructive">{notFoundIds.join("\n")}</pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={isValidating || foundCount === 0 || notFoundIds.length > 0}
          >
            {t("participants.bulk_id_filter.apply")}
            {foundCount > 0 && ` (${foundCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
