import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { FileUpload } from "@/components/base/file-upload";
import { useConsentClauses } from "@/hooks/useConsentClauses";
import { useConsentTemplates } from "@/hooks/useConsentTemplates";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import type { Contact } from "@/types/participant";

interface ConsentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  contacts: Contact[];
  onSuccess?: () => void;
}

interface ConsentEntry {
  clauseId: string;
  date: string;
  signedById: string;
}

/** Creates a blank consent entry with today's date and status "valid". */
function emptyEntry(): ConsentEntry {
  return {
    clauseId: "",
    date: new Date().toISOString().slice(0, 10),
    signedById: "",
  };
}

/** Required field label with red asterisk. */
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

/** Dialog to add one or more consents for a participant with a shared document. */
export function ConsentFormDialog({
  open,
  onOpenChange,
  participantId,
  contacts,
  onSuccess,
}: ConsentFormDialogProps) {
  const { t } = useTranslation();
  const { templates } = useConsentTemplates();
  const [templateId, setTemplateId] = useState("");
  const { clauses } = useConsentClauses(templateId ? Number(templateId) : undefined);

  const [entries, setEntries] = useState<ConsentEntry[]>([emptyEntry()]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selfContact = contacts.find((c) => c.relationship_code === "self");
  const nonSelfContacts = contacts.filter(
    (c) => c.relationship_code !== "self",
  );

  const updateEntry = (index: number, patch: Partial<ConsentEntry>) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTemplateId("");
    setEntries([emptyEntry()]);
    setFile(null);
    setSubmitError(null);
  };

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    // Reset clause selections when template changes
    setEntries([emptyEntry()]);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const isValid = !!templateId && entries.every((e) => e.clauseId && e.signedById);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Upload document once if a file was selected
      let documentId: number | undefined;
      if (file) {
        const formData = new FormData();
        formData.append("name", file.name);
        formData.append("type_code", "consent_signed");
        formData.append("file", file);
        const res = await api.post("/documents", formData);
        documentId = res.data.id;
      }

      // Create each consent with the shared document_id
      for (const entry of entries) {
        await api.post(`/participants/${participantId}/consents`, {
          clause_id: Number(entry.clauseId),
          status_code: "valid",
          date: entry.date,
          signed_by_id: Number(entry.signedById),
          document_id: documentId ?? null,
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSubmitError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("participant_detail.add_consent_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          <div className="space-y-2">
            <RequiredLabel>{t("participant_detail.consent_template")}</RequiredLabel>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("participant_detail.consent_template_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={String(tpl.id)}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shared document upload */}
          <div className="space-y-2">
            <Label><Trans i18nKey="participant_detail.document_signed">Document <strong>signed</strong></Trans></Label>
            <FileUpload file={file} onChange={setFile} accept=".pdf,.doc,.docx" />
          </div>

          <hr className="border-border" />

          {/* Consent entries */}
          {entries.map((entry, index) => (
            <div
              key={index}
              className="space-y-3 rounded-md border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {t("participant_detail.consent_ordinal", {
                    number: index + 1,
                  })}
                </p>
                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <RequiredLabel>
                  {t("participant_detail.consent_clause")}
                </RequiredLabel>
                <Select
                  value={entry.clauseId}
                  onValueChange={(v) => updateEntry(index, { clauseId: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "participant_detail.consent_clause_placeholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clauses.map((clause) => (
                      <SelectItem key={clause.id} value={String(clause.id)}>
                        {t(`enums.clause_type.${clause.clause_type_code}`, {
                          defaultValue: clause.clause_type_code,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <RequiredLabel>
                  {t("participant_detail.consent_date")}
                </RequiredLabel>
                <Input
                  type="date"
                  value={entry.date}
                  onChange={(e) =>
                    updateEntry(index, { date: e.target.value })
                  }
                  className="max-w-48"
                />
              </div>

              <div className="space-y-2">
                <RequiredLabel>
                  {t("participant_detail.signed_by_label")}
                </RequiredLabel>
                <Select
                  value={entry.signedById}
                  onValueChange={(v) =>
                    updateEntry(index, { signedById: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "participant_detail.signed_by_placeholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selfContact && (
                      <SelectItem value={String(selfContact.id)}>
                        {t("participant_detail.signed_by_self_short")}
                      </SelectItem>
                    )}
                    {nonSelfContacts.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.first_name} {c.last_name} (
                        {t(`enums.relationship.${c.relationship_code}`, {
                          defaultValue: c.relationship_code,
                        })}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEntries((prev) => [...prev, emptyEntry()])}
          >
            <Plus className="mr-1 size-4" />
            {t("participant_detail.add_another_consent")}
          </Button>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
