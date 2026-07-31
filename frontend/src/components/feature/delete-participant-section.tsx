import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/base/ui/button";
import { Input } from "@/components/base/ui/input";
import { Label } from "@/components/base/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/base/ui/alert-dialog";
import type { Participant } from "@/types/participant";

/** Admin section for permanently deleting a participant. */
export function DeleteParticipantSection() {
  const { t } = useTranslation();
  const [searchId, setSearchId] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const expectedName = participant
    ? `${participant.first_name} ${participant.last_name}`
    : "";

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchError(null);
    setParticipant(null);
    setDeleted(false);
    try {
      const { data } = await api.get<Participant>(
        `/participants/${searchId.trim()}`,
      );
      setParticipant(data);
    } catch {
      setSearchError(t("admin.delete_participant.not_found"));
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openConfirm = () => {
    setConfirmName("");
    setConfirmOpen(true);
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!participant || confirmName !== expectedName) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/participants/${participant.id}`);
      setConfirmOpen(false);
      setParticipant(null);
      setSearchId("");
      setDeleted(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? t("common.error");
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            {t("admin.delete_participant.warning")}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label>{t("admin.delete_participant.search_label")}</Label>
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("admin.delete_participant.search_placeholder")}
              className="font-mono"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSearch}
            disabled={!searchId.trim() || searching}
          >
            {t("common.search")}
          </Button>
        </div>

        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}

        {deleted && (
          <p className="text-sm text-green-foreground">
            {t("admin.delete_participant.success")}
          </p>
        )}

        {participant && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {participant.first_name} {participant.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {participant.id}
                  {participant.ramq && ` — RAMQ: ${participant.ramq}`}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={openConfirm}>
                {t("admin.delete_participant.delete_button")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              {t("admin.delete_participant.confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t("admin.delete_participant.confirm_description")}</p>
                <p className="font-medium text-foreground">
                  {expectedName} (ID: {participant?.id})
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    {t("admin.delete_participant.confirm_irreversible")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("admin.delete_participant.confirm_type_name", {
                      name: expectedName,
                    })}
                  </Label>
                  <Input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={expectedName}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-6">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmName !== expectedName || deleting}
            >
              {t("admin.delete_participant.confirm_delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
