import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/base/ui/dialog";
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
import { enumLabel } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";
import type { CommunicationResponse } from "@/types/communication";
import type { Contact } from "@/types/participant";

interface CommunicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  contacts: Contact[];
  communication?: CommunicationResponse | null;
  onSuccess: () => void;
}

const NONE_VALUE = "__none__";

export function CommunicationFormDialog({
  open,
  onOpenChange,
  participantId,
  contacts,
  communication,
  onSuccess,
}: CommunicationFormDialogProps) {
  const { t, i18n } = useTranslation();
  const { enums } = useEnums();
  const isEdit = !!communication;

  const [methodCode, setMethodCode] = useState("email");
  const [contactId, setContactId] = useState<string>(NONE_VALUE);
  const [subjectCode, setSubjectCode] = useState("");
  const [outcomeCode, setOutcomeCode] = useState<string>(NONE_VALUE);
  const [commDate, setCommDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens or communication changes
  useEffect(() => {
    if (!open) return;
    if (communication) {
      setMethodCode(communication.method_code);
      setContactId(
        communication.contact_id
          ? String(communication.contact_id)
          : NONE_VALUE,
      );
      setSubjectCode(communication.subject_code);
      setOutcomeCode(communication.outcome_code ?? NONE_VALUE);
      setCommDate(communication.communication_date.slice(0, 10));
      setComment(communication.comment ?? "");
    } else {
      setMethodCode("email");
      setContactId(NONE_VALUE);
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
    if (contactId === NONE_VALUE) return null;
    const contact = contacts.find((c) => c.id === Number(contactId));
    if (!contact) return null;
    return methodCode === "email" ? contact.email : contact.phone;
  }, [contactId, methodCode, contacts]);

  const canSubmit = methodCode && subjectCode && commDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        contact_id: contactId !== NONE_VALUE ? Number(contactId) : null,
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
      // Error handling is minimal — toast could be added later
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("participant_detail.edit_communication")
              : t("participant_detail.add_communication")}
          </DialogTitle>
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
                    {i18n.language === "en" ? m.name_en : m.name_fr}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label>{t("participant_detail.communication_contact")}</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>—</SelectItem>
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
                    {i18n.language === "en" ? s.name_en : s.name_fr}
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
                    {i18n.language === "en" ? o.name_en : o.name_fr}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
