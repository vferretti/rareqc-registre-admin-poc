import { useState } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil } from "lucide-react";
import { useParticipant } from "@/hooks/useParticipant";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { Badge } from "@/components/base/badges/badge";
import { ParticipantFormDialog } from "@/components/feature/create-participant-dialog";
import { ParticipantActivityLog } from "@/components/feature/participant-activity-log";
import { formatDate, formatAddress } from "@/lib/format";
import { SEX_BADGE, VITAL_STATUS_BADGE } from "@/lib/badge-variants";
import type { Contact } from "@/types/participant";

/** Displays a label/value pair inside a definition list. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children || "—"}</dd>
    </div>
  );
}

/** Renders a single contact card with name, relationship, and coordinates. */
function ContactCard({
  contact,
  t,
}: {
  contact: Contact;
  t: (key: string, options?: Record<string, string>) => string;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {contact.first_name} {contact.last_name}
          </span>
          <Badge variant="secondary">
            {t(`enums.relationship.${contact.relationship_code}`, {
              defaultValue: contact.relationship_code,
            })}
          </Badge>
        </div>
        {contact.is_primary && (
          <Badge variant="blue">
            {t("participant_detail.primary_contact")}
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Field label={t("participant_detail.email")}>
          {contact.email || "—"}
        </Field>
        <Field label={t("participant_detail.phone")}>
          {contact.phone || "—"}
        </Field>
        <Field label={t("participant_detail.street_address")}>
          {formatAddress(
            contact.street_address,
            contact.city,
            contact.province,
            contact.code_postal,
          )}
        </Field>
        <Field label={t("participant_detail.preferred_language")}>
          {t(`enums.language.${contact.preferred_language}`, {
            defaultValue: contact.preferred_language,
          })}
        </Field>
      </dl>
    </div>
  );
}

/** Participant detail page — identity, coordinates, contacts, and activity history. */
export default function ParticipantDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { participant, isLoading, error, mutate } = useParticipant(id);
  const [editParticipantOpen, setEditParticipantOpen] = useState(false);
  const [editContactsOpen, setEditContactsOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("common.loading")} />
        <div className="p-8">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </>
    );
  }

  if (error || !participant) {
    return (
      <>
        <PageHeader title={t("participant_detail.not_found")} />
        <div className="p-8">
          <p className="text-muted-foreground mb-4">
            {t("participant_detail.not_found")}
          </p>
          <Button variant="outline" asChild>
            <Link to="/participants">
              <ArrowLeft className="mr-1 size-4" />
              {t("participant_detail.back")}
            </Link>
          </Button>
        </div>
      </>
    );
  }

  const selfContact = participant.contacts?.find(
    (c) => c.relationship_code === "self",
  );
  const otherContacts =
    participant.contacts?.filter((c) => c.relationship_code !== "self") ?? [];

  const handleSuccess = () => void mutate(undefined, { revalidate: true });

  return (
    <>
      <PageHeader
        title={`${participant.first_name} ${participant.last_name}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/participants">
              <ArrowLeft className="mr-1 size-4" />
              {t("participant_detail.back")}
            </Link>
          </Button>
        }
      />

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — Identity + Contacts */}
          <div className="space-y-6">
            {/* Identity & coordinates card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("participant_detail.section_identity")}
                </CardTitle>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditParticipantOpen(true)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label={t("participant_detail.last_name")}>
                    {participant.last_name}
                  </Field>
                  <Field label={t("participant_detail.first_name")}>
                    {participant.first_name}
                  </Field>
                  <Field label={t("participant_detail.date_of_birth")}>
                    {formatDate(participant.date_of_birth)}
                  </Field>
                  <Field label={t("participant_detail.sex_at_birth")}>
                    <Badge
                      variant={
                        SEX_BADGE[participant.sex_at_birth_code] ?? "secondary"
                      }
                    >
                      {t(
                        `enums.sex_at_birth.${participant.sex_at_birth_code}`,
                        { defaultValue: participant.sex_at_birth_code },
                      )}
                    </Badge>
                  </Field>
                  <Field label={t("participant_detail.ramq")}>
                    <span className="font-mono">
                      {participant.ramq || "—"}
                    </span>
                  </Field>
                  <Field label={t("participant_detail.vital_status")}>
                    <Badge
                      variant={
                        VITAL_STATUS_BADGE[participant.vital_status_code] ??
                        "secondary"
                      }
                    >
                      {t(
                        `enums.vital_status.${participant.vital_status_code}`,
                        { defaultValue: participant.vital_status_code },
                      )}
                    </Badge>
                  </Field>
                  {participant.vital_status_code === "deceased" && (
                    <Field label={t("participant_detail.date_of_death")}>
                      {formatDate(participant.date_of_death)}
                    </Field>
                  )}
                </dl>

                <hr className="border-border" />

                <h3 className="text-sm font-semibold text-foreground">
                  {t("participant_detail.section_coordinates")}
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label={t("participant_detail.email")}>
                    {selfContact?.email || "—"}
                  </Field>
                  <Field label={t("participant_detail.phone")}>
                    {selfContact?.phone || "—"}
                  </Field>
                  <Field label={t("participant_detail.street_address")}>
                    {selfContact
                      ? formatAddress(
                          selfContact.street_address,
                          selfContact.city,
                          selfContact.province,
                          selfContact.code_postal,
                        )
                      : "—"}
                  </Field>
                </dl>
              </CardContent>
            </Card>

            {/* Contacts card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("participant_detail.section_contacts")}
                </CardTitle>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditContactsOpen(true)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {otherContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("participant_detail.no_contacts")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {otherContacts.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} t={t} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — Activity history */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("activity_log.participant_section_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantActivityLog participantId={participant.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit participant dialog */}
      <ParticipantFormDialog
        open={editParticipantOpen}
        onOpenChange={setEditParticipantOpen}
        participant={participant}
        editSection="participant"
        onSuccess={handleSuccess}
      />

      {/* Edit contacts dialog */}
      <ParticipantFormDialog
        open={editContactsOpen}
        onOpenChange={setEditContactsOpen}
        participant={participant}
        editSection="contacts"
        onSuccess={handleSuccess}
      />
    </>
  );
}
