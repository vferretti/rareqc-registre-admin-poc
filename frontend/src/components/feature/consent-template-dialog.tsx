import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { FileUpload } from "@/components/base/file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/base/ui/dialog";
import { Button } from "@/components/base/ui/button";
import { Input } from "@/components/base/ui/input";
import { Label } from "@/components/base/ui/label";
import { Textarea } from "@/components/base/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import type { ConsentClause } from "@/hooks/useConsentClauses";

interface ConsentTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When set, the dialog is in edit mode for this template. */
  editTemplateId?: number;
  editTemplateName?: string;
  editFileName?: string;
  editClauses?: ConsentClause[];
}

interface ClauseEntry {
  clauseTypeCode: string;
  clauseFr: string;
  clauseEn: string;
}

const CLAUSE_TYPES = ["registry", "recontact", "external_linkage"];

function emptyClause(): ClauseEntry {
  return { clauseTypeCode: "", clauseFr: "", clauseEn: "" };
}

export function ConsentTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
  editTemplateId,
  editTemplateName,
  editFileName,
  editClauses,
}: ConsentTemplateDialogProps) {
  const { t } = useTranslation();
  const isEdit = editTemplateId != null;
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clauses, setClauses] = useState<ClauseEntry[]>([emptyClause()]);
  const [submitting, setSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (open && isEdit) {
      setName(editTemplateName ?? "");
      setClauses(
        editClauses && editClauses.length > 0
          ? editClauses.map((c) => ({
              clauseTypeCode: c.clause_type_code,
              clauseFr: c.clause_fr,
              clauseEn: c.clause_en,
            }))
          : [emptyClause()],
      );
      setFile(null);
    }
  }, [open, isEdit]);

  const reset = () => {
    setName("");
    setFile(null);
    setClauses([emptyClause()]);
  };

  const updateClause = (index: number, field: keyof ClauseEntry, value: string) => {
    setClauses((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const removeClause = (index: number) => {
    setClauses((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit =
    name.trim() !== "" &&
    (isEdit || file !== null) &&
    clauses.length > 0 &&
    clauses.every(
      (c) =>
        c.clauseTypeCode !== "" &&
        c.clauseFr.trim() !== "" &&
        c.clauseEn.trim() !== "",
    );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append(
      "clauses",
      JSON.stringify(
        clauses.map((c) => ({
          clause_fr: c.clauseFr,
          clause_en: c.clauseEn,
          clause_type_code: c.clauseTypeCode,
        })),
      ),
    );
    if (file) {
      formData.append("file", file);
    }

    try {
      if (isEdit) {
        await api.put(`/consent-templates/${editTemplateId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/consent-templates", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("admin.edit_template") : t("admin.add_template")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Template name */}
          <div className="flex flex-col gap-1.5">
            <Label>{t("admin.template_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.template_name")}
            />
          </div>

          {/* PDF file */}
          <div className="flex flex-col gap-1.5">
            <Label>{t("admin.template_file")}</Label>
            <FileUpload
              file={file}
              onChange={setFile}
              accept=".pdf"
              existingFileName={isEdit ? editFileName : undefined}
            />
          </div>

          {/* Clauses */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>{t("admin.clauses")}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClauses((prev) => [...prev, emptyClause()])}
              >
                <Plus className="size-4 mr-2" />
                {t("admin.add_clause")}
              </Button>
            </div>

            {clauses.map((clause, index) => (
              <div key={index} className="rounded-md border p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Select
                    value={clause.clauseTypeCode}
                    onValueChange={(v) => updateClause(index, "clauseTypeCode", v)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={t("admin.clause_type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAUSE_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {t(`enums.clause_type.${ct}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {clauses.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClause(index)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("admin.clause_fr")}
                  </Label>
                  <Textarea
                    value={clause.clauseFr}
                    onChange={(e) => updateClause(index, "clauseFr", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("admin.clause_en")}
                  </Label>
                  <Textarea
                    value={clause.clauseEn}
                    onChange={(e) => updateClause(index, "clauseEn", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
