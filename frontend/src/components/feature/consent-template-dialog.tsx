import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import {
  consentTemplateSchema,
  clauseEntrySchema,
  type ConsentTemplateValues,
} from "@/lib/validations/consent-template";
import { FileUpload } from "@/components/base/file-upload";
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
import { enumLabel } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";

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

function emptyClause() {
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const isEdit = editTemplateId != null;

  const schema = consentTemplateSchema(t, isEdit);
  const clauseSchema = clauseEntrySchema(t);

  const form = useForm<ConsentTemplateValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", file: null, clauses: [emptyClause()] },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "clauses",
  });

  // Populate form when editing
  useEffect(() => {
    if (open && isEdit) {
      form.reset({
        name: editTemplateName ?? "",
        file: null,
        clauses:
          editClauses && editClauses.length > 0
            ? editClauses.map((c) => ({
                clauseTypeCode: c.clause_type_code,
                clauseFr: c.clause_fr,
                clauseEn: c.clause_en,
              }))
            : [emptyClause()],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit]);

  const resetForm = () => {
    form.reset({ name: "", file: null, clauses: [emptyClause()] });
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const onSubmit = async (data: ConsentTemplateValues) => {
    const formData = new FormData();
    formData.append("name", data.name.trim());
    formData.append(
      "clauses",
      JSON.stringify(
        data.clauses.map((c) => ({
          clause_fr: c.clauseFr,
          clause_en: c.clauseEn,
          clause_type_code: c.clauseTypeCode,
        })),
      ),
    );
    if (data.file) {
      formData.append("file", data.file);
    }

    if (isEdit) {
      await api.put(`/consent-templates/${editTemplateId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      await api.post("/consent-templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("admin.edit_template") : t("admin.add_template")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            {/* Template name */}
            <FormField
              schema={schema}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.template_name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("admin.template_name")} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* PDF file */}
            <FormField
              schema={schema}
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.template_file")}</FormLabel>
                  <FormControl>
                    <FileUpload
                      file={field.value}
                      onChange={field.onChange}
                      accept=".pdf"
                      existingFileName={isEdit ? editFileName : undefined}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Clauses */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>{t("admin.clauses")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(emptyClause())}
                >
                  <Plus className="size-4 mr-2" />
                  {t("admin.add_clause")}
                </Button>
              </div>

              {fields.map((clauseField, index) => (
                <div
                  key={clauseField.id}
                  className="rounded-md border p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <FormField
                      schema={clauseSchema}
                      control={form.control}
                      name={`clauses.${index}.clauseTypeCode`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-64">
                                <SelectValue
                                  placeholder={t("admin.clause_type")}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(enums?.clause_type ?? []).map((e) => (
                                <SelectItem key={e.code} value={e.code}>
                                  {enumLabel(enums?.clause_type, e.code, lang)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    schema={clauseSchema}
                    control={form.control}
                    name={`clauses.${index}.clauseFr`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          {t("admin.clause_fr")}
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    schema={clauseSchema}
                    control={form.control}
                    name={`clauses.${index}.clauseEn`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          {t("admin.clause_en")}
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
