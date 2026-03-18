import { useRef, useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Upload, X } from "lucide-react";
import api from "@/lib/api";
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
import type { ConsentResponse } from "@/types/consent";

interface ConsentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: ConsentResponse | null;
  contacts: Contact[];
  onSuccess?: () => void;
}

const CONSENT_STATUS_OPTIONS = [
  "valid",
  "expired",
  "withdrawn",
  "replaced_by_new_version",
] as const;

/** Required field label with red asterisk. */
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

/** Dialog to edit an existing consent (status, date, signer, document). */
export function ConsentEditDialog({
  open,
  onOpenChange,
  consent,
  contacts,
  onSuccess,
}: ConsentEditDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusCode, setStatusCode] = useState("");
  const [date, setDate] = useState("");
  const [signedById, setSignedById] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingDocId, setExistingDocId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selfContact = contacts.find((c) => c.relationship_code === "self");
  const nonSelfContacts = contacts.filter(
    (c) => c.relationship_code !== "self",
  );

  // Pre-fill form when consent changes
  useEffect(() => {
    if (open && consent) {
      setStatusCode(consent.status_code);
      setDate(consent.date);
      setSignedById(consent.signed_by_id ? String(consent.signed_by_id) : "");
      setExistingDocId(consent.document_id ?? null);
      setFile(null);
      setSubmitError(null);
    }
  }, [open, consent]);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setFile(null);
      setSubmitError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    if (!consent || !statusCode || !signedById) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Upload new document if selected
      let documentId = existingDocId;
      if (file) {
        const formData = new FormData();
        formData.append("name", file.name);
        formData.append("type_code", "consent_signed");
        formData.append("file", file);
        const res = await api.post("/documents", formData);
        documentId = res.data.id;
      }

      await api.put(`/consents/${consent.id}`, {
        status_code: statusCode,
        date,
        signed_by_id: Number(signedById),
        document_id: documentId,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSubmitError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!consent) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("participant_detail.edit_consent_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            {consent.template_name && (
              <p className="text-sm text-muted-foreground">{consent.template_name}</p>
            )}
            <Label>{t("participant_detail.consent_clause")}</Label>
            <p className="text-sm text-foreground">
              {t(`enums.clause_type.${consent.clause_type_code}`, {
                defaultValue: consent.clause_type_code,
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <RequiredLabel>
                {t("participant_detail.consent_status")}
              </RequiredLabel>
              <Select value={statusCode} onValueChange={setStatusCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_STATUS_OPTIONS.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(`enums.consent_status.${code}`)}
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel>
              {t("participant_detail.signed_by_label")}
            </RequiredLabel>
            <Select value={signedById} onValueChange={setSignedById}>
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

          <div className="space-y-2">
            <Label><Trans i18nKey="participant_detail.document_signed">Document <strong>signed</strong></Trans></Label>
            {existingDocId && !file && consent.document_name && (
              <div className="flex items-center gap-2">
                <button
                  className="text-sm text-primary hover:underline cursor-pointer"
                  onClick={() =>
                    window.open(`/api/documents/${existingDocId}/file`, "_blank")
                  }
                >
                  {consent.document_name}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4 mr-1" />
                {existingDocId
                  ? t("participant_detail.replace_file")
                  : t("participant_detail.upload_file")}
              </Button>
              {file && (
                <span className="text-sm text-foreground truncate flex-1">
                  {file.name}
                </span>
              )}
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

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
          <Button
            onClick={handleSubmit}
            disabled={!statusCode || !signedById || submitting}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
