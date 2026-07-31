import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import api from "@/lib/api";
import { todayISO } from "@/lib/format";
import {
  communicationSchema,
  type CommunicationValues,
} from "@/lib/validations/communication";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/base/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/base/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/base/ui/alert-dialog";
import { Button } from "@/components/base/ui/button";
import { Label } from "@/components/base/ui/label";
import { Textarea } from "@/components/base/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/base/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";
import { DatePicker } from "@/components/base/ui/date-picker";
import { enumLabel, localizedField } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";
import type { CommunicationResponse } from "@/types/communication";
import type { Contact } from "@/types/participant";

interface CommunicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Target participant when recording a communication on a single participant file. */
  participantId?: number;
  /** Contacts of the target participant. Ignored when `bulk` is true. */
  contacts?: Contact[];
  communication?: CommunicationResponse | null;
  onSuccess: (result?: { created: number; skipped: number[] }) => void;
  /**
   * When true, the dialog posts to `/cart/communications` and creates one record
   * per cart participant (using each participant's primary contact). The contact
   * selector is hidden.
   */
  bulk?: boolean;
  /**
   * Number of participants targeted by the form, shown as a subtitle in the dialog header.
   * Pass 1 for the single-participant flow, the cart size for bulk.
   */
  participantCount?: number;
}

const NONE_VALUE = "__none__";

/** Blank form values (method defaults to email, date to today). */
function emptyValues(): CommunicationValues {
  return {
    methodCode: "email",
    contactId: "",
    subjectCode: "",
    outcomeCode: NONE_VALUE,
    commDate: todayISO(),
    comment: "",
  };
}

export function CommunicationFormDialog({
  open,
  onOpenChange,
  participantId,
  contacts = [],
  communication,
  onSuccess,
  bulk = false,
  participantCount,
}: CommunicationFormDialogProps) {
  const { t, i18n } = useTranslation();
  const { enums } = useEnums();
  const isEdit = !!communication;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const schema = communicationSchema(t, bulk);

  const form = useForm<CommunicationValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const methodCode = form.watch("methodCode");
  const outcomeCode = form.watch("outcomeCode");
  const contactId = form.watch("contactId");

  // Reset form when dialog opens or communication changes
  useEffect(() => {
    if (!open) return;
    if (communication) {
      form.reset({
        methodCode: communication.method_code,
        contactId: String(communication.contact_id),
        subjectCode: communication.subject_code,
        outcomeCode: communication.outcome_code ?? NONE_VALUE,
        commDate: communication.communication_date.slice(0, 10),
        comment: communication.comment ?? "",
      });
    } else {
      form.reset(emptyValues());
    }
    setSubmitError(null);
  }, [open, communication, form]);

  // Pick the right outcome list based on method
  const filteredOutcomes = useMemo(
    () =>
      methodCode === "email"
        ? (enums?.email_outcomes ?? [])
        : (enums?.phone_outcomes ?? []),
    [enums, methodCode],
  );

  // Reset outcome when method changes (if current outcome doesn't match)
  useEffect(() => {
    if (
      outcomeCode !== NONE_VALUE &&
      !filteredOutcomes.some((o) => o.code === outcomeCode)
    ) {
      form.setValue("outcomeCode", NONE_VALUE);
    }
  }, [filteredOutcomes, outcomeCode, form]);

  // Resolve the phone/email from the selected contact based on method
  const resolvedContactValue = useMemo(() => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c.id === Number(contactId));
    if (!contact) return null;
    return methodCode === "email" ? contact.email : contact.phone;
  }, [contactId, methodCode, contacts]);

  const onSubmit = async (data: CommunicationValues) => {
    setSubmitError(null);
    try {
      if (bulk) {
        const { data: result } = await api.post<{
          created: number;
          skipped: number[];
        }>("/cart/communications", {
          method_code: data.methodCode,
          subject_code: data.subjectCode,
          outcome_code:
            data.outcomeCode !== NONE_VALUE ? data.outcomeCode : null,
          communication_date: data.commDate,
          comment: data.comment.trim() || null,
        });
        onOpenChange(false);
        onSuccess(result);
        return;
      }

      const payload = {
        contact_id: Number(data.contactId),
        contact_value: resolvedContactValue || null,
        method_code: data.methodCode,
        subject_code: data.subjectCode,
        outcome_code: data.outcomeCode !== NONE_VALUE ? data.outcomeCode : null,
        communication_date: data.commDate,
        comment: data.comment.trim() || null,
      };

      if (isEdit) {
        await api.put(`/communications/${communication.id}`, payload);
      } else {
        await api.post(
          `/participants/${participantId}/communications`,
          payload,
        );
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setSubmitError(t("common.error"));
      // In bulk mode the form was closed before confirmation; reopen it so
      // the error is visible and the user can retry or cancel.
      if (bulk) onOpenChange(true);
    }
  };

  /** In bulk mode, validate first, then close the form and ask for confirmation. */
  const handleBulkConfirm = form.handleSubmit(() => {
    onOpenChange(false);
    setBulkConfirmOpen(true);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? t("participant_detail.edit_communication")
                : t("participant_detail.add_communication")}
            </DialogTitle>
            {participantCount !== undefined && (
              <DialogDescription className="flex items-center gap-1.5">
                {t("cart.communication_subtitle", { count: participantCount })}
                {bulk && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={t("cart.bulk_communication_hint")}
                        >
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {t("cart.bulk_communication_hint")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* Method */}
              <FormField
                schema={schema}
                control={form.control}
                name="methodCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.communication_method")}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4"
                      >
                        {enums?.communication_methods?.map((m) => (
                          <div key={m.code} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={m.code}
                              id={`method-${m.code}`}
                            />
                            <Label
                              htmlFor={`method-${m.code}`}
                              className="font-normal cursor-pointer"
                            >
                              {localizedField(m, "name", i18n.language)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Contact — hidden in bulk mode; backend resolves each participant's primary contact (see tooltip in subtitle) */}
              {!bulk && (
                <FormField
                  schema={schema}
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("participant_detail.communication_contact")}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.first_name} {c.last_name}
                              {c.is_primary
                                ? ` — ${t("participant_detail.primary_contact")}`
                                : c.relationship_code !== "self"
                                  ? ` — ${enumLabel(enums?.relationship, c.relationship_code, i18n.language)}`
                                  : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {/* Subject */}
              <FormField
                schema={schema}
                control={form.control}
                name="subjectCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.communication_subject")}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "participant_detail.communication_subject",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {enums?.communication_subjects?.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {localizedField(s, "name", i18n.language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                schema={schema}
                control={form.control}
                name="commDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.communication_date")}
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? "")}
                        maxDate={new Date()}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Outcome */}
              <FormField
                schema={schema}
                control={form.control}
                name="outcomeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.communication_outcome")}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>—</SelectItem>
                        {filteredOutcomes.map((o) => (
                          <SelectItem key={o.code} value={o.code}>
                            {localizedField(o, "name", i18n.language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Comment */}
              <FormField
                schema={schema}
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("participant_detail.communication_comment")}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.cancel")}
                </Button>
                {bulk ? (
                  <Button type="button" onClick={handleBulkConfirm}>
                    {t("common.save")}
                  </Button>
                ) : (
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {t("common.save")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {bulk && (
        <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("cart.bulk_communication_confirm_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("cart.bulk_communication_confirm", {
                  count: participantCount ?? 0,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                {t("common.save")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
