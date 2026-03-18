import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/base/ui/card";
import { Button } from "@/components/base/ui/button";
import { Badge } from "@/components/base/badges/badge";
import { useConsents } from "@/hooks/useConsents";
import { ConsentFormDialog } from "@/components/feature/consent-form-dialog";
import { formatDate } from "@/lib/format";
import type { ConsentResponse } from "@/types/consent";
import type { Contact } from "@/types/participant";

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  valid: CheckCircle2,
  expired: Clock,
  withdrawn: XCircle,
};

const STATUS_BADGE: Record<
  string,
  "green" | "secondary" | "destructive" | "amber"
> = {
  valid: "green",
  expired: "secondary",
  withdrawn: "destructive",
  replaced_by_new_version: "amber",
};

interface ParticipantConsentsProps {
  participantId: number;
  contacts: Contact[];
  consents?: ConsentResponse[];
  onConsentAdded?: () => void;
}

/** Displays the consent status for a participant with a dialog to add new consents. */
export function ParticipantConsents({
  participantId,
  contacts,
  consents: externalConsents,
  onConsentAdded,
}: ParticipantConsentsProps) {
  const { t } = useTranslation();
  const {
    consents: fetchedConsents,
    isLoading,
    mutate,
  } = useConsents(externalConsents ? undefined : participantId);
  const consents = externalConsents ?? fetchedConsents;
  const [dialogOpen, setDialogOpen] = useState(false);

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `/api/participants/${participantId}/consents/pdf`,
                  "_blank",
                )
              }
            >
              <Download className="size-4" />
              {t("participant_detail.download_consent")}
            </Button>
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
                const Icon = STATUS_ICON[c.status_code] ?? CheckCircle2;
                return (
                  <div key={c.id} className="flex items-start gap-3">
                    <Icon
                      className={`size-5 shrink-0 mt-0.5 ${
                        c.status_code === "valid"
                          ? "text-green-600"
                          : c.status_code === "withdrawn"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {t(`enums.clause_type.${c.clause_type_code}`, {
                            defaultValue: c.clause_type_code,
                          })}
                        </span>
                        <Badge
                          variant={
                            STATUS_BADGE[c.status_code] ?? "secondary"
                          }
                        >
                          {t(`enums.consent_status.${c.status_code}`, {
                            defaultValue: c.status_code,
                          })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(c.date)}
                        {c.signed_by_name && (
                          <>
                            {" — "}
                            {t("participant_detail.signed_by", {
                              name: c.signed_by_name,
                              relationship: t(
                                `enums.relationship.${c.signed_by_relationship}`,
                                {
                                  defaultValue: c.signed_by_relationship,
                                },
                              ),
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4 mr-1" />
            {t("participant_detail.add_consent")}
          </Button>
        </CardContent>
      </Card>

      <ConsentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        contacts={contacts}
        onSuccess={handleSuccess}
      />
    </>
  );
}
