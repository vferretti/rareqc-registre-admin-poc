import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { todayISO } from "@/lib/format";
import {
  consentFormSchema,
  consentEntrySchema,
  type ConsentFormValues,
} from "@/lib/validations/consent";
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

interface ConsentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  contacts: Contact[];
  onSuccess?: () => void;
}

/** Creates a blank consent entry with today's date. */
function emptyEntry() {
  return { clauseId: "", date: todayISO(), signedById: "" };
}

/** Dialog to add one or more consents for a participant with a shared document. */
export function ConsentFormDialog({
  open,
  onOpenChange,
  participantId,
  contacts,
  onSuccess,
}: ConsentFormDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const { templates } = useConsentTemplates();
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = consentFormSchema(t);
  const entrySchema = consentEntrySchema(t);

  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { templateId: "", entries: [emptyEntry()] },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const templateId = form.watch("templateId");
  const { clauses } = useConsentClauses(
    templateId ? Number(templateId) : undefined,
  );

  const selfContact = contacts.find((c) => c.relationship_code === "self");
  const nonSelfContacts = contacts.filter(
    (c) => c.relationship_code !== "self",
  );

  const resetForm = () => {
    form.reset({ templateId: "", entries: [emptyEntry()] });
    setFile(null);
    setSubmitError(null);
  };

  // Reset to a blank form each time the dialog opens
  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const onSubmit = async (data: ConsentFormValues) => {
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
      for (const entry of data.entries) {
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("participant_detail.add_consent_title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Template selector */}
            <FormField
              schema={schema}
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("participant_detail.consent_template")}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      // Reset clause selections when template changes
                      form.setValue("entries", [emptyEntry()]);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "participant_detail.consent_template_placeholder",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Shared document upload */}
            <div className="space-y-2">
              <Label>
                <Trans i18nKey="participant_detail.document_signed">
                  Document <strong>signed</strong>
                </Trans>
              </Label>
              <FileUpload
                file={file}
                onChange={setFile}
                accept=".pdf,.doc,.docx"
              />
            </div>

            <hr className="border-border" />

            {/* Consent entries */}
            {fields.map((entryField, index) => (
              <div
                key={entryField.id}
                className="space-y-3 rounded-md border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {t("participant_detail.consent_ordinal", {
                      number: index + 1,
                    })}
                  </p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <FormField
                  schema={entrySchema}
                  control={form.control}
                  name={`entries.${index}.clauseId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("participant_detail.consent_clause")}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "participant_detail.consent_clause_placeholder",
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clauses.map((clause) => (
                            <SelectItem
                              key={clause.id}
                              value={String(clause.id)}
                            >
                              {enumLabel(
                                enums?.clause_type,
                                clause.clause_type_code,
                                lang,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  schema={entrySchema}
                  control={form.control}
                  name={`entries.${index}.date`}
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

                <FormField
                  schema={entrySchema}
                  control={form.control}
                  name={`entries.${index}.signedById`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("participant_detail.signed_by_label")}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyEntry())}
            >
              <Plus className="mr-1 size-4" />
              {t("participant_detail.add_another_consent")}
            </Button>

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
