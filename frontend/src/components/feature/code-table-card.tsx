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
import type { CodeEntry } from "@/hooks/useCodeTables";

interface CodeTableCardProps {
  table: string;
  entries: CodeEntry[];
  referencedCodes: string[];
  onMutate: () => void;
}

interface EditingRow {
  code: string;
  name_en: string;
  name_fr: string;
  isNew: boolean;
}

export function CodeTableCard({
  table,
  entries,
  referencedCodes,
  onMutate,
}: CodeTableCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isReferenced = (code: string) => referencedCodes.includes(code);

  const startAdd = () => {
    setEditing({ code: "", name_en: "", name_fr: "", isNew: true });
  };

  const startEdit = (entry: CodeEntry) => {
    setEditing({ ...entry, isNew: false });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const canSave =
    editing !== null &&
    editing.code.trim() !== "" &&
    editing.name_en.trim() !== "" &&
    editing.name_fr.trim() !== "";

  const handleSave = async () => {
    if (!editing || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        code: editing.code.trim(),
        name_en: editing.name_en.trim(),
        name_fr: editing.name_fr.trim(),
      };
      if (editing.isNew) {
        await api.post(`/code-tables/${table}/entries`, payload);
      } else {
        await api.put(`/code-tables/${table}/entries/${editing.code}`, payload);
      }
      setEditing(null);
      onMutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCode) return;
    try {
      await api.delete(`/code-tables/${table}/entries/${deleteCode}`);
      onMutate();
    } finally {
      setDeleteCode(null);
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
          <CardTitle>{t(`admin.code_tables.${table}`)}</CardTitle>
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
                    {t("admin.code_tables.code")}
                  </th>
                  <th className="py-2 px-4 font-medium">
                    {t("admin.code_tables.label_fr")}
                  </th>
                  <th className="py-2 px-4 font-medium">
                    {t("admin.code_tables.label_en")}
                  </th>
                  <th className="py-2 pl-4 font-medium text-center">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isEditing =
                    editing !== null &&
                    !editing.isNew &&
                    editing.code === entry.code;
                  const referenced = isReferenced(entry.code);

                  if (isEditing) {
                    return (
                      <tr key={entry.code} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground">
                                {entry.code}
                              </span>
                            </TooltipTrigger>
                            {referenced && (
                              <TooltipContent>
                                {t("admin.code_tables.code_referenced")}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </td>
                        <td className="py-1 px-4">
                          <Input
                            value={editing.name_fr}
                            onChange={(e) =>
                              setEditing({ ...editing, name_fr: e.target.value })
                            }
                            onKeyDown={handleKeyDown}
                            className="h-8"
                            autoFocus
                          />
                        </td>
                        <td className="py-1 px-4">
                          <Input
                            value={editing.name_en}
                            onChange={(e) =>
                              setEditing({ ...editing, name_en: e.target.value })
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
                    <tr key={entry.code} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {entry.code}
                      </td>
                      <td className="py-2 px-4">{entry.name_fr}</td>
                      <td className="py-2 px-4">{entry.name_en}</td>
                      <td className="py-2 pl-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(entry)}
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
                                  disabled={referenced || editing !== null}
                                  onClick={() => setDeleteCode(entry.code)}
                                >
                                  <Trash2
                                    className={`size-4 ${referenced ? "" : "text-destructive"}`}
                                  />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {referenced && (
                              <TooltipContent>
                                {t("admin.code_tables.cannot_delete")}
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
                        value={editing.code}
                        onChange={(e) =>
                          setEditing({ ...editing, code: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="code"
                        className="h-8 font-mono text-xs"
                        autoFocus
                      />
                    </td>
                    <td className="py-1 px-4">
                      <Input
                        value={editing.name_fr}
                        onChange={(e) =>
                          setEditing({ ...editing, name_fr: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={t("admin.code_tables.label_fr")}
                        className="h-8"
                      />
                    </td>
                    <td className="py-1 px-4">
                      <Input
                        value={editing.name_en}
                        onChange={(e) =>
                          setEditing({ ...editing, name_en: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={t("admin.code_tables.label_en")}
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
        open={deleteCode !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteCode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.code_tables.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.code_tables.delete_confirm", { code: deleteCode })}
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
