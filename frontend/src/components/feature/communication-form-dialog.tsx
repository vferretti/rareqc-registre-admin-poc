import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Info } from "lucide-react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/base/ui/dialog";
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

  const [methodCode, setMethodCode] = useState("email");
  const [contactId, setContactId] = useState<string>("");
  const [subjectCode, setSubjectCode] = useState("");
  const [outcomeCode, setOutcomeCode] = useState<string>(NONE_VALUE);
  const [commDate, setCommDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Reset form when dialog opens or communication changes
  useEffect(() => {
    if (!open) return;
    if (communication) {
      setMethodCode(communication.method_code);
      setContactId(String(communication.contact_id));
      setSubjectCode(communication.subject_code);
      setOutcomeCode(communication.outcome_code ?? NONE_VALUE);
      setCommDate(communication.communication_date.slice(0, 10));
      setComment(communication.comment ?? "");
    } else {
      setMethodCode("email");
      setContactId("");
      setSubjectCode("");
      setOutcomeCode(NONE_VALUE);
      setCommDate(format(new Date(), "yyyy-MM-dd"));
      setComment("");
    }
  }, [open, communication]);

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
      setOutcomeCode(NONE_VALUE);
    }
  }, [methodCode, filteredOutcomes, outcomeCode]);

  // Resolve the phone/email from the selected contact based on method
  const resolvedContactValue = useMemo(() => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c.id === Number(contactId));
    if (!contact) return null;
    return methodCode === "email" ? contact.email : contact.phone;
  }, [contactId, methodCode, contacts]);

  const canSubmit =
    methodCode && subjectCode && commDate && (bulk || contactId);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setSubmitError(null);
    try {
      if (bulk) {
        const { data } = await api.post<{
          created: number;
          skipped: number[];
        }>("/cart/communications", {
          method_code: methodCode,
          subject_code: subjectCode,
          outcome_code: outcomeCode !== NONE_VALUE ? outcomeCode : null,
          communication_date: commDate,
          comment: comment.trim() || null,
        });
        onOpenChange(false);
        onSuccess(data);
        return;
      }

      const payload = {
        contact_id: Number(contactId),
        contact_value: resolvedContactValue || null,
        method_code: methodCode,
        subject_code: subjectCode,
        outcome_code: outcomeCode !== NONE_VALUE ? outcomeCode : null,
        communication_date: commDate,
        comment: comment.trim() || null,
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
    } finally {
      setSaving(false);
    }
  };

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

          <div className="space-y-4">
            {/* Method */}
            <div className="space-y-2">
              <Label>{t("participant_detail.communication_method")}</Label>
              <RadioGroup
                value={methodCode}
                onValueChange={setMethodCode}
                className="flex gap-4"
              >
                {enums?.communication_methods?.map((m) => (
                  <div key={m.code} className="flex items-center gap-2">
                    <RadioGroupItem value={m.code} id={`method-${m.code}`} />
                    <Label
                      htmlFor={`method-${m.code}`}
                      className="font-normal cursor-pointer"
                    >
                      {localizedField(m, "name", i18n.language)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Contact — hidden in bulk mode; backend resolves each participant's primary contact (see tooltip in subtitle) */}
            {!bulk && (
              <div className="space-y-2">
                <Label>{t("participant_detail.communication_contact")}</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <Label>{t("participant_detail.communication_subject")}</Label>
              <Select value={subjectCode} onValueChange={setSubjectCode}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("participant_detail.communication_subject")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {enums?.communication_subjects?.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {localizedField(s, "name", i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>{t("participant_detail.communication_date")}</Label>
              <DatePicker
                value={commDate}
                onChange={(v) => setCommDate(v ?? "")}
                maxDate={new Date()}
              />
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label>{t("participant_detail.communication_outcome")}</Label>
              <Select value={outcomeCode} onValueChange={setOutcomeCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {filteredOutcomes.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {localizedField(o, "name", i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>{t("participant_detail.communication_comment")}</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={
                bulk
                  ? () => {
                      onOpenChange(false);
                      setBulkConfirmOpen(true);
                    }
                  : handleSubmit
              }
              disabled={!canSubmit || saving}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
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
              <AlertDialogAction onClick={handleSubmit}>
                {t("common.save")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
