import { useEffect, useRef, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X } from "lucide-react";
import api from "@/lib/api";
import {
  consentEditSchema,
  type ConsentEditValues,
} from "@/lib/validations/consent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/base/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/base/ui/form";
import { Button } from "@/components/base/ui/button";
import { Label } from "@/components/base/ui/label";
import { DatePicker } from "@/components/base/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import { enumLabel } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";
import type { Contact } from "@/types/participant";
import type { ConsentResponse } from "@/types/consent";

interface ConsentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: ConsentResponse | null;
  contacts: Contact[];
  onSuccess?: () => void;
}

/** Maximum file size: 10 MB. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Dialog to edit an existing consent (status, date, signer, document). */
export function ConsentEditDialog({
  open,
  onOpenChange,
  consent,
  contacts,
  onSuccess,
}: ConsentEditDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Document currently attached to the consent (before any replacement). */
  const existingDocId = consent?.document_id ?? null;

  const schema = consentEditSchema(t);

  const form = useForm<ConsentEditValues>({
    resolver: zodResolver(schema),
    defaultValues: { statusCode: "", date: "", signedById: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const selfContact = contacts.find((c) => c.relationship_code === "self");
  const nonSelfContacts = contacts.filter(
    (c) => c.relationship_code !== "self",
  );

  // Pre-fill form when the dialog opens on a consent (file and error state
  // are cleared on close by handleOpenChange)
  useEffect(() => {
    if (open && consent) {
      form.reset({
        statusCode: consent.status_code,
        date: consent.date,
        signedById: consent.signed_by_id ? String(consent.signed_by_id) : "",
      });
    }
  }, [open, consent, form]);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setFile(null);
      setFileError(null);
      setSubmitError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(value);
  };

  const onSubmit = async (data: ConsentEditValues) => {
    if (!consent) return;
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
        status_code: data.statusCode,
        date: data.date,
        signed_by_id: Number(data.signedById),
        document_id: documentId,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setSubmitError(t("common.error"));
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-1">
              {consent.template_name && (
                <p className="text-sm text-muted-foreground">
                  {consent.template_name}
                </p>
              )}
              <Label>{t("participant_detail.consent_clause")}</Label>
              <p className="text-sm text-foreground">
                {enumLabel(enums?.clause_type, consent.clause_type_code, lang)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                schema={schema}
                control={form.control}
                name="statusCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.consent_status")}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {enums?.consent_status?.map((e) => (
                          <SelectItem key={e.code} value={e.code}>
                            {enumLabel(enums?.consent_status, e.code, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                schema={schema}
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.consent_date")}
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value || undefined}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              schema={schema}
              control={form.control}
              name="signedById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("participant_detail.signed_by_label")}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "participant_detail.signed_by_placeholder",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selfContact && (
                        <SelectItem value={String(selfContact.id)}>
                          {t("participant_detail.signed_by_self_short")}
                        </SelectItem>
                      )}
                      {nonSelfContacts.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.first_name} {c.last_name} (
                          {enumLabel(
                            enums?.relationship,
                            c.relationship_code,
                            lang,
                          )}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>
                <Trans i18nKey="participant_detail.document_signed">
                  Document <strong>signed</strong>
                </Trans>
              </Label>
              {existingDocId && !file && consent.document_name && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline cursor-pointer"
                    onClick={() =>
                      window.open(
                        `/api/documents/${existingDocId}/file`,
                        "_blank",
                      )
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
                      setFileError(null);
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
                  onChange={(e) => {
                    const selected = e.target.files?.[0] ?? null;
                    if (selected && selected.size > MAX_FILE_SIZE) {
                      setFileError(t("validation.file_too_large"));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }
                    setFileError(null);
                    setFile(selected);
                  }}
                />
              </div>
              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
