import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Phone, Mail, Plus, Pencil, Trash2, Eye } from "lucide-react";
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
import { useCommunications } from "@/hooks/useCommunications";
import { CommunicationFormDialog } from "@/components/feature/communication-form-dialog";
import { formatDate } from "@/lib/format";
import api from "@/lib/api";
import type { CommunicationResponse } from "@/types/communication";
import type { Contact } from "@/types/participant";

interface ParticipantCommunicationsProps {
  participantId: number;
  contacts: Contact[];
}

export function ParticipantCommunications({
  participantId,
  contacts,
}: ParticipantCommunicationsProps) {
  const { t, i18n } = useTranslation();
  const { communications, isLoading, mutate } =
    useCommunications(participantId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<CommunicationResponse | null>(null);
  const [editing, setEditing] = useState<CommunicationResponse | null>(null);
  const [deleting, setDeleting] = useState<CommunicationResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const lang = i18n.language === "en" ? "en" : "fr";

  const handleSuccess = () => {
    mutate();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await api.delete(`/communications/${deleting.id}`);
      mutate();
      setDeleting(null);
    } catch {
      setDeleteError(t("common.error"));
    }
  };

  const MethodIcon = ({ code }: { code: string }) =>
    code === "email" ? (
      <Mail className="size-4 shrink-0 text-muted-foreground" />
    ) : (
      <Phone className="size-4 shrink-0 text-muted-foreground" />
    );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("participant_detail.section_communications")}
          </CardTitle>
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
                {t("participant_detail.add_communication")}
              </TooltipContent>
            </Tooltip>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : communications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("participant_detail.no_communications")}
            </p>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => {
                const subjectLabel =
                  lang === "en" ? comm.subject_name_en : comm.subject_name_fr;
                const outcomeLabel = comm.outcome_code
                  ? lang === "en"
                    ? comm.outcome_name_en
                    : comm.outcome_name_fr
                  : null;
                const contactName =
                  comm.contact_first_name && comm.contact_last_name
                    ? `${comm.contact_first_name} ${comm.contact_last_name}`
                    : comm.contact_id === null || comm.contact_id === undefined
                      ? null
                      : t("participant_detail.unknown_contact");

                return (
                  <div key={comm.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <MethodIcon code={comm.method_code} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {subjectLabel}
                        </span>
                        {outcomeLabel && (
                          <Badge variant="secondary">{outcomeLabel}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(comm.communication_date)}
                        {comm.author && ` — ${comm.author}`}
                      </p>
                      {(contactName || comm.contact_value) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {contactName}
                          {contactName && comm.contact_value && " — "}
                          {comm.contact_value}
                        </p>
                      )}
                      {comm.comment && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {comm.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setViewing(comm)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("participant_detail.view_communication")}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditing(comm)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("common.edit")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleting(comm)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("common.delete")}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <CommunicationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        participantId={participantId}
        contacts={contacts}
        participantCount={1}
        onSuccess={handleSuccess}
      />

      {/* Edit dialog */}
      <CommunicationFormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        participantId={participantId}
        contacts={contacts}
        communication={editing}
        participantCount={1}
        onSuccess={() => {
          setEditing(null);
          handleSuccess();
        }}
      />

      {/* Detail dialog (read-only) */}
      <Dialog
        open={!!viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewing &&
                (lang === "en"
                  ? viewing.subject_name_en
                  : viewing.subject_name_fr)}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.communication_method")}
                  </p>
                  <p className="text-sm">
                    {lang === "en"
                      ? viewing.method_name_en
                      : viewing.method_name_fr}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.communication_date")}
                  </p>
                  <p className="text-sm">
                    {formatDate(viewing.communication_date)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.communication_subject")}
                  </p>
                  <Badge variant="secondary">
                    {lang === "en"
                      ? viewing.subject_name_en
                      : viewing.subject_name_fr}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("participant_detail.communication_outcome")}
                  </p>
                  {viewing.outcome_code ? (
                    <Badge variant="secondary">
                      {lang === "en"
                        ? viewing.outcome_name_en
                        : viewing.outcome_name_fr}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("participant_detail.communication_contact")}
                </p>
                <p className="text-sm">
                  {viewing.contact_first_name && viewing.contact_last_name
                    ? `${viewing.contact_first_name} ${viewing.contact_last_name}`
                    : "—"}
                  {viewing.contact_value && ` — ${viewing.contact_value}`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("participant_detail.communication_author")}
                </p>
                <p className="text-sm">{viewing.author || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("participant_detail.communication_comment")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {viewing.comment || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("participant_detail.delete_communication")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("participant_detail.confirm_delete_communication")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
