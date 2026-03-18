import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { useConsentClauses } from "@/hooks/useConsentClauses";
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

const CONSENT_STATUS_OPTIONS = [
  "valid",
  "expired",
  "withdrawn",
  "replaced_by_new_version",
] as const;

/** Dialog to add a consent for a participant. */
export function ConsentFormDialog({
  open,
  onOpenChange,
  participantId,
  contacts,
  onSuccess,
}: ConsentFormDialogProps) {
  const { t } = useTranslation();
  const { clauses } = useConsentClauses();

  const [clauseId, setClauseId] = useState("");
  const [statusCode, setStatusCode] = useState("valid");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [signedById, setSignedById] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selfContact = contacts.find((c) => c.relationship_code === "self");
  const nonSelfContacts = contacts.filter(
    (c) => c.relationship_code !== "self",
  );

  const resetForm = () => {
    setClauseId("");
    setStatusCode("valid");
    setDate(new Date().toISOString().slice(0, 10));
    setSignedById("");
    setSubmitError(null);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    if (!clauseId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/participants/${participantId}/consents`, {
        clause_id: Number(clauseId),
        status_code: statusCode,
        date,
        signed_by_id: signedById ? Number(signedById) : null,
      });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("participant_detail.add_consent_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("participant_detail.consent_clause")}</Label>
            <Select value={clauseId} onValueChange={setClauseId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("participant_detail.consent_clause")}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("enums.consent_status.valid")}</Label>
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
              <Label>{t("participant_detail.consent_date")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("participant_detail.signed_by_label")}</Label>
            <Select value={signedById} onValueChange={setSignedById}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("participant_detail.signed_by_placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {selfContact && (
                  <SelectItem value={String(selfContact.id)}>
                    {t("participant_detail.signed_by_self")}
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
          <Button onClick={handleSubmit} disabled={!clauseId || submitting}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
