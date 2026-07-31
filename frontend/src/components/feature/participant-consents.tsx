import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Download, CheckCircle2, Plus, Pencil, Eye } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/base/ui/card";
import { Button } from "@/components/base/ui/button";
import { Badge } from "@/components/base/badges/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/base/ui/dialog";
import { useConsents } from "@/hooks/useConsents";
import { ConsentFormDialog } from "@/components/feature/consent-form-dialog";
import { ConsentEditDialog } from "@/components/feature/consent-edit-dialog";
import { formatDate } from "@/lib/format";
import {
  CONSENT_STATUS_BADGE,
  CONSENT_STATUS_ICON,
  CONSENT_STATUS_COLOR,
} from "@/lib/badge-variants";
import { enumLabel, localizedField } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";
import type { ConsentResponse } from "@/types/consent";
import type { Contact } from "@/types/participant";

interface ParticipantConsentsProps {
  participantId: number;
  contacts: Contact[];
  consents?: ConsentResponse[];
  onConsentAdded?: () => void;
}

/**
 * Human-readable "signed by" label: the participant themselves, or the
 * signatory's name and relationship. Returns null when there is no signatory.
 */
function signedByLabel(
  consent: Pick<ConsentResponse, "signed_by_name" | "signed_by_relationship">,
  t: ReturnType<typeof useTranslation>["t"],
  enums: ReturnType<typeof useEnums>["enums"],
  lang: string,
): string | null {
  if (!consent.signed_by_name) return null;
  if (consent.signed_by_relationship === "self") {
    return t("participant_detail.signed_by_participant");
  }
  return t("participant_detail.signed_by", {
    name: consent.signed_by_name,
    relationship: enumLabel(
      enums?.relationship,
      consent.signed_by_relationship,
      lang,
    ),
  });
}

/** Displays the consent status for a participant with a dialog to add new consents. */
export function ParticipantConsents({
  participantId,
  contacts,
  consents: externalConsents,
  onConsentAdded,
}: ParticipantConsentsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  const {
    consents: fetchedConsents,
    isLoading,
    mutate,
  } = useConsents(externalConsents ? undefined : participantId);
  const consents = externalConsents ?? fetchedConsents;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<ConsentResponse | null>(
    null,
  );
  const [viewingClause, setViewingClause] = useState<ConsentResponse | null>(
    null,
  );

  const handleSuccess = () => {
    mutate();
    onConsentAdded?.();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("participant_detail.section_consents")}</CardTitle>
          <CardAction>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("participant_detail.add_consent")}
              </TooltipContent>
            </Tooltip>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("participant_detail.no_consents")}
            </p>
          ) : (
            <div className="space-y-3">
              {consents.map((c) => {
                const Icon = CONSENT_STATUS_ICON[c.status_code] ?? CheckCircle2;
                return (
                  <div key={c.id} className="flex items-start gap-3">
                    <Icon
                      className={`size-5 shrink-0 mt-0.5 ${CONSENT_STATUS_COLOR[c.status_code] ?? "text-muted-foreground"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {enumLabel(
                            enums?.clause_type,
                            c.clause_type_code,
                            lang,
                          )}
                        </span>
                        <Badge
                          variant={
                            CONSENT_STATUS_BADGE[c.status_code] ?? "secondary"
                          }
                        >
                          {enumLabel(
                            enums?.consent_status,
                            c.status_code,
                            lang,
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(c.date)}
                        {c.signed_by_name &&
                          ` — ${signedByLabel(c, t, enums, lang)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setViewingClause(c)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("participant_detail.view_clause")}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingConsent(c)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("common.edit")}</TooltipContent>
                      </Tooltip>
                      {c.document_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                window.open(
                                  `/api/documents/${c.document_id}/file`,
                                  "_blank",
                                )
                              }
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("participant_detail.download_consent")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConsentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        contacts={contacts}
        onSuccess={handleSuccess}
      />

      <ConsentEditDialog
        open={!!editingConsent}
        onOpenChange={(open) => {
          if (!open) setEditingConsent(null);
        }}
        consent={editingConsent}
        contacts={contacts}
        onSuccess={() => {
          setEditingConsent(null);
          handleSuccess();
        }}
      />

      {/* Consent detail dialog */}
      <Dialog
        open={!!viewingClause}
        onOpenChange={(open) => {
          if (!open) setViewingClause(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewingClause &&
                enumLabel(
                  enums?.clause_type,
                  viewingClause.clause_type_code,
                  lang,
                )}
            </DialogTitle>
          </DialogHeader>
          {viewingClause && (
            <div className="space-y-4">
              {viewingClause.template_name && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.consent_template")}
                  </p>
                  <p className="text-sm">{viewingClause.template_name}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("participant_detail.consent_clause")}
                </p>
                <p className="text-sm leading-relaxed">
                  {localizedField(viewingClause, "clause", i18n.language)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.consent_status")}
                  </p>
                  <Badge
                    variant={
                      CONSENT_STATUS_BADGE[viewingClause.status_code] ??
                      "secondary"
                    }
                  >
                    {enumLabel(
                      enums?.consent_status,
                      viewingClause.status_code,
                      lang,
                    )}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.consent_date")}
                  </p>
                  <p className="text-sm">{formatDate(viewingClause.date)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("participant_detail.signed_by_label")}
                </p>
                <p className="text-sm">
                  {signedByLabel(viewingClause, t, enums, lang) ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  <Trans i18nKey="participant_detail.document_signed">
                    Document <strong>signed</strong>
                  </Trans>
                </p>
                {viewingClause.document_id ? (
                  <button
                    className="text-sm text-primary hover:underline cursor-pointer"
                    onClick={() =>
                      window.open(
                        `/api/documents/${viewingClause.document_id}/file`,
                        "_blank",
                      )
                    }
                  >
                    {viewingClause.document_name}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
