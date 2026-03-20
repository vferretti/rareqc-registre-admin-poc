import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import api from "@/lib/api";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { Button } from "@/components/base/ui/button";
import { Input } from "@/components/base/ui/input";
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
import type { ExternalSystem } from "@/hooks/useExternalSystems";

interface ExternalSystemCardProps {
  systems: ExternalSystem[];
  onMutate: () => void;
}

interface EditingRow {
  id: number | null;
  name: string;
  title_fr: string;
  title_en: string;
  isNew: boolean;
}

export function ExternalSystemCard({
  systems,
  onMutate,
}: ExternalSystemCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [deleteSystem, setDeleteSystem] = useState<ExternalSystem | null>(null);
  const [saving, setSaving] = useState(false);

  const startAdd = () => {
    setEditing({ id: null, name: "", title_fr: "", title_en: "", isNew: true });
  };

  const startEdit = (system: ExternalSystem) => {
    setEditing({
      id: system.id,
      name: system.name,
      title_fr: system.title_fr,
      title_en: system.title_en,
      isNew: false,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const canSave =
    editing !== null &&
    editing.name.trim() !== "" &&
    editing.title_fr.trim() !== "" &&
    editing.title_en.trim() !== "";

  const handleSave = async () => {
    if (!editing || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        title_fr: editing.title_fr.trim(),
        title_en: editing.title_en.trim(),
      };
      if (editing.isNew) {
        await api.post("/external-systems", payload);
      } else {
        await api.put(`/external-systems/${editing.id}`, payload);
      }
      setEditing(null);
      onMutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSystem) return;
    try {
      await api.delete(`/external-systems/${deleteSystem.id}`);
      onMutate();
    } finally {
      setDeleteSystem(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSave) {
      handleSave();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.external_systems.title")}</CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startAdd}
              disabled={editing !== null}
            >
              <Plus className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={200}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    {t("admin.external_systems.name")}
                  </th>
                  <th className="py-2 px-4 font-medium">
                    {t("admin.external_systems.title_fr")}
                  </th>
                  <th className="py-2 px-4 font-medium">
                    {t("admin.external_systems.title_en")}
                  </th>
                  <th className="py-2 pl-4 font-medium text-center">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {systems.map((system) => {
                  const isEditing =
                    editing !== null &&
                    !editing.isNew &&
                    editing.id === system.id;

                  if (isEditing) {
                    return (
                      <tr key={system.id} className="border-b last:border-0">
                        <td className="py-1 pr-4">
                          <Input
                            value={editing.name}
                            onChange={(e) =>
                              setEditing({ ...editing, name: e.target.value })
                            }
                            onKeyDown={handleKeyDown}
                            className="h-8 font-mono text-xs"
                            autoFocus
                          />
                        </td>
                        <td className="py-1 px-4">
                          <Input
                            value={editing.title_fr}
                            onChange={(e) =>
                              setEditing({ ...editing, title_fr: e.target.value })
                            }
                            onKeyDown={handleKeyDown}
                            className="h-8"
                          />
                        </td>
                        <td className="py-1 px-4">
                          <Input
                            value={editing.title_en}
                            onChange={(e) =>
                              setEditing({ ...editing, title_en: e.target.value })
                            }
                            onKeyDown={handleKeyDown}
                            className="h-8"
                          />
                        </td>
                        <td className="py-2 pl-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleSave}
                              disabled={!canSave || saving}
                            >
                              <Check className="size-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={cancelEdit}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={system.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {system.name}
                      </td>
                      <td className="py-2 px-4">{system.title_fr}</td>
                      <td className="py-2 px-4">{system.title_en}</td>
                      <td className="py-2 pl-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(system)}
                            disabled={editing !== null}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={system.is_referenced || editing !== null}
                                  onClick={() => setDeleteSystem(system)}
                                >
                                  <Trash2
                                    className={`size-4 ${system.is_referenced ? "" : "text-destructive"}`}
                                  />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {system.is_referenced && (
                              <TooltipContent>
                                {t("admin.external_systems.cannot_delete")}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* New entry row */}
                {editing?.isNew && (
                  <tr className="border-b last:border-0">
                    <td className="py-1 pr-4">
                      <Input
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={t("admin.external_systems.name")}
                        className="h-8 font-mono text-xs"
                        autoFocus
                      />
                    </td>
                    <td className="py-1 px-4">
                      <Input
                        value={editing.title_fr}
                        onChange={(e) =>
                          setEditing({ ...editing, title_fr: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={t("admin.external_systems.title_fr")}
                        className="h-8"
                      />
                    </td>
                    <td className="py-1 px-4">
                      <Input
                        value={editing.title_en}
                        onChange={(e) =>
                          setEditing({ ...editing, title_en: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={t("admin.external_systems.title_en")}
                        className="h-8"
                      />
                    </td>
                    <td className="py-2 pl-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleSave}
                          disabled={!canSave || saving}
                        >
                          <Check className="size-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={cancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TooltipProvider>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteSystem !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteSystem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.external_systems.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.external_systems.delete_confirm", {
                name: deleteSystem?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
