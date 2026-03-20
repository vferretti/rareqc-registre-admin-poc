import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  /** When false, the textarea is cleared on open (e.g. after user clicked "Clear"). */
  hasActiveFilter: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

  // Clear textarea when dialog opens and filter was cleared
  useEffect(() => {
    if (open && !hasActiveFilter) {
      setIdsText("");
      setSource("internal");
    }
  }, [open, hasActiveFilter]);

  const placeholder =
    source === "internal"
      ? "42\n87\n150"
      : `${source}-123456\n${source}-789012`;

  const handleApply = async () => {
    const ids = idsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;

    setIsLoading(true);
    try {
      const { data } = await api.post("/participants/resolve-ids", {
        source,
        ids,
      });
      onApply(data.resolved_ids, data.not_found);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !hasActiveFilter) {
      setIdsText("");
      setSource("internal");
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

          <div className="flex flex-col gap-2">
            <Label className="font-medium">
              {t("participants.bulk_id_filter.ids_label")}
            </Label>
            <Textarea
              value={idsText}
              onChange={(e) => setIdsText(e.target.value)}
              placeholder={placeholder}
              rows={20}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoading || idsText.trim().length === 0}
          >
            {t("participants.bulk_id_filter.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
