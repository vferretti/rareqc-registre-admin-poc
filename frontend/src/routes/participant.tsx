import { useState, useCallback } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import Joyride, { type CallBackProps, STATUS } from "react-joyride";
import { ArrowLeft, Check, Copy, Fingerprint, HelpCircle, Pencil, Trash2, UserPlus } from "lucide-react";
import { useParticipant } from "@/hooks/useParticipant";
import api from "@/lib/api";
import { PageHeader } from "@/components/base/page/page-header";
import { Button } from "@/components/base/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { Badge } from "@/components/base/badges/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/base/ui/dialog";
import { ParticipantFormDialog } from "@/components/feature/create-participant-dialog";
import { ContactFormDialog } from "@/components/feature/contact-form-dialog";
import { ParticipantActivityLog } from "@/components/feature/participant-activity-log";
import { ParticipantConsents } from "@/components/feature/participant-consents";
import { useConsents } from "@/hooks/useConsents";
import { formatDate, formatAddress, formatPhone } from "@/lib/format";
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

/** Renders a single contact card with name, relationship, coordinates, and action buttons. */
function ContactCard({
  contact,
  t,
  onEdit,
  onDelete,
  canDelete = true,
}: {
  contact: Contact;
  t: (key: string, options?: Record<string, string>) => string;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
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
          {contact.is_primary && (
            <Badge variant="blue">
              {t("participant_detail.primary_contact")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.edit")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={canDelete ? onDelete : undefined}
                  disabled={!canDelete}
                >
                  <Trash2 className={`size-4 ${canDelete ? "text-destructive" : ""}`} />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canDelete ? t("common.delete") : t("participant_detail.cannot_delete_signer")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Field label={t("participant_detail.email")}>
          {contact.email || "—"}
        </Field>
        <Field label={t("participant_detail.phone")}>
          {formatPhone(contact.phone)}
        </Field>
        <Field label={t("participant_detail.street_address")}>
          {formatAddress(
            contact.apartment_number,
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
  const { consents } = useConsents(participant?.id);
  const signerContactIds = new Set(
    consents.filter((c) => c.signed_by_id).map((c) => c.signed_by_id),
  );
  const [editParticipantOpen, setEditParticipantOpen] = useState(false);
  const [editContactsOpen, setEditContactsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [guidDialogOpen, setGuidDialogOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const tourSteps = [
    {
      target: '[data-tour="identity"]',
      title: t("tour.identity_title"),
      content: t("tour.identity_content"),
      disableBeacon: true,
    },
    {
      target: '[data-tour="contacts"]',
      title: t("tour.contacts_title"),
      content: t("tour.contacts_content"),
    },
    {
      target: '[data-tour="consents"]',
      title: t("tour.consents_title"),
      content: t("tour.consents_content"),
    },
    {
      target: '[data-tour="activity"]',
      title: t("tour.activity_title"),
      content: t("tour.activity_content"),
    },
  ];

  const handleTourCallback = useCallback((data: CallBackProps) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRunTour(false);
    }
  }, []);
  const [copiedGuid, setCopiedGuid] = useState<string | null>(null);

  /** Deletes a contact after user confirmation. */
  const confirmDeleteContact = async () => {
    if (!deletingContact) return;
    setDeleteError(null);
    try {
      await api.delete(`/contacts/${deletingContact.id}`);
      mutate(undefined, { revalidate: true });
      setDeletingContact(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? t("common.error");
      setDeleteError(message);
    }
  };

  const copyGuid = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedGuid(value);
    setTimeout(() => setCopiedGuid(null), 2000);
  };

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
    <TooltipProvider>
    <>
      <PageHeader
        title={`${participant.first_name} ${participant.last_name}`}
        actions={
          <div className="flex gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setRunTour(true)} title={t("tour.start")}>
            <HelpCircle className="size-4" />
          </Button>
          <Button variant="outline" asChild>
            <Link to="/participants">
              <ArrowLeft className="mr-1 size-4" />
              {t("participant_detail.back")}
            </Link>
          </Button>
          </div>
        }
      />

      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        callback={handleTourCallback}
        locale={{
          back: t("tour.back"),
          close: t("tour.close"),
          last: t("tour.last"),
          next: t("tour.next"),
          skip: t("tour.skip"),
        }}
        styles={{
          options: {
            primaryColor: "oklch(0.55 0.11 230)",
            zIndex: 10000,
          },
        }}
      />

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — Identity + Contacts */}
          <div className="space-y-6">
            {/* Identity & coordinates card */}
            <Card data-tour="identity">
              <CardHeader>
                <CardTitle>
                  {t("participant_detail.section_identity")}
                </CardTitle>
                <CardAction>
                  {participant.guid && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setGuidDialogOpen(true)}
                        >
                          <Fingerprint className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("participant_detail.view_guids")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditParticipantOpen(true)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.edit")}</TooltipContent>
                  </Tooltip>
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
                  <Field label={t("participant_detail.city_of_birth")}>
                    {participant.city_of_birth || "—"}
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
                    {formatPhone(selfContact?.phone)}
                  </Field>
                  <Field label={t("participant_detail.street_address")}>
                    {selfContact
                      ? formatAddress(
                          selfContact.apartment_number,
                          selfContact.street_address,
                          selfContact.city,
                          selfContact.province,
                          selfContact.code_postal,
                        )
                      : "—"}
                  </Field>
                  <Field label={t("participant_detail.preferred_language")}>
                    {selfContact
                      ? t(`enums.language.${selfContact.preferred_language}`, {
                          defaultValue: selfContact.preferred_language,
                        })
                      : "—"}
                  </Field>
                </dl>
              </CardContent>
            </Card>

            {/* Contacts card */}
            <Card data-tour="contacts">
              <CardHeader>
                <CardTitle>
                  {t("participant_detail.section_contacts")}
                </CardTitle>
                <CardAction>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditContactsOpen(true)}
                      >
                        <UserPlus className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("participant_detail.add_contacts")}</TooltipContent>
                  </Tooltip>
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
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        t={t}
                        onEdit={() => setEditingContact(contact)}
                        onDelete={() => setDeletingContact(contact)}
                        canDelete={!signerContactIds.has(contact.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — Consents + Activity history */}
          <div className="flex flex-col gap-6">
            <div data-tour="consents">
            <ParticipantConsents
              participantId={participant.id}
              contacts={participant.contacts ?? []}
              consents={consents}
              onConsentAdded={handleSuccess}
            />
            </div>
            <div data-tour="activity">
            <ParticipantActivityLog participantId={participant.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit participant dialog */}
      <ParticipantFormDialog
        open={editParticipantOpen}
        onOpenChange={setEditParticipantOpen}
        participant={participant}
        onSuccess={handleSuccess}
      />

      {/* Add contact dialog */}
      <ContactFormDialog
        open={editContactsOpen}
        onOpenChange={setEditContactsOpen}
        participant={participant}
        onSuccess={handleSuccess}
      />

      {/* Edit single contact dialog */}
      <ContactFormDialog
        open={!!editingContact}
        onOpenChange={(open) => { if (!open) setEditingContact(null); }}
        participant={participant}
        contact={editingContact}
        onSuccess={() => { setEditingContact(null); handleSuccess(); }}
      />

      {/* Delete contact confirmation */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingContact(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("participant_detail.delete_contact_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                t("participant_detail.confirm_delete_contact", {
                  name: deletingContact
                    ? `${deletingContact.first_name} ${deletingContact.last_name}`
                    : "",
                })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction onClick={confirmDeleteContact}>
                {t("common.delete")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GUID dialog */}
      <Dialog open={guidDialogOpen} onOpenChange={setGuidDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("participant_detail.guid_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { key: "guid_basic", value: participant.guid?.guid_basic },
              { key: "guid_ramq", value: participant.guid?.guid_ramq },
              { key: "guid_birthplace", value: participant.guid?.guid_birthplace },
            ].map(({ key, value }) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium">
                  {t(`participant_detail.${key}`)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t(`participant_detail.${key}_desc`)}
                </div>
                {value ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted rounded px-2 py-1.5 break-all">
                      {value}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyGuid(value)}
                    >
                      {copiedGuid === value ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    {t("participant_detail.guid_not_available")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
    </TooltipProvider>
  );
}
