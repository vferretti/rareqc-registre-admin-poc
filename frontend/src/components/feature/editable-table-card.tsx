import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";

interface Column {
  key: string;
  label: string;
  mono?: boolean;
}

interface EditableTableCardProps {
  title: string;
  columns: Column[];
  entries: Record<string, string>[];
  referencedCodes?: string[];
  codeField: string;
  onAdd: (entry: Record<string, string>) => Promise<void>;
  onEdit: (code: string, entry: Record<string, string>) => Promise<void>;
  onDelete: (code: string) => Promise<void>;
  cannotDeleteMessage?: string;
  deleteTitle?: string;
  deleteConfirmMessage?: (code: string) => string;
}

export function EditableTableCard({
  title,
  columns,
  entries,
  referencedCodes = [],
  codeField,
  onAdd,
  onEdit,
  onDelete,
  cannotDeleteMessage,
  deleteTitle,
  deleteConfirmMessage,
}: EditableTableCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<{
    values: Record<string, string>;
    isNew: boolean;
    originalCode: string;
  } | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isReferenced = (code: string) => referencedCodes.includes(code);

  const emptyRow = () => {
    const values: Record<string, string> = {};
    for (const col of columns) {
      values[col.key] = "";
    }
    return values;
  };

  const startAdd = () => {
    setEditing({ values: emptyRow(), isNew: true, originalCode: "" });
  };

  const startEdit = (entry: Record<string, string>) => {
    setEditing({
      values: { ...entry },
      isNew: false,
      originalCode: entry[codeField],
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const canSave =
    editing !== null &&
    columns.every((col) => editing.values[col.key]?.trim() !== "");

  const handleSave = async () => {
    if (!editing || !canSave) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const col of columns) {
        payload[col.key] = editing.values[col.key].trim();
      }
      if (editing.isNew) {
        await onAdd(payload);
      } else {
        await onEdit(editing.originalCode, payload);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCode) return;
    try {
      await onDelete(deleteCode);
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

  const updateField = (key: string, value: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      values: { ...editing.values, [key]: value },
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead className="text-center">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const code = entry[codeField];
                  const isEditing =
                    editing !== null &&
                    !editing.isNew &&
                    editing.originalCode === code;
                  const referenced = isReferenced(code);

                  if (isEditing) {
                    return (
                      <TableRow key={code}>
                        {columns.map((col, i) => (
                          <TableCell key={col.key}>
                            {col.key === codeField ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground">
                                    {code}
                                  </span>
                                </TooltipTrigger>
                                {referenced && (
                                  <TooltipContent>
                                    {cannotDeleteMessage ??
                                      t("common.referenced")}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            ) : (
                              <Input
                                value={editing.values[col.key]}
                                onChange={(e) =>
                                  updateField(col.key, e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="h-8"
                                autoFocus={i === 1}
                              />
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleSave}
                              disabled={!canSave || saving}
                            >
                              <Check className="size-4 text-green-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={cancelEdit}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={code}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={col.mono ? "font-mono text-xs" : undefined}
                        >
                          {entry[col.key]}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
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
                                  onClick={() => setDeleteCode(code)}
                                >
                                  <Trash2
                                    className={`size-4 ${referenced ? "" : "text-destructive"}`}
                                  />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {referenced && (
                              <TooltipContent>
                                {cannotDeleteMessage ?? t("common.referenced")}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* New entry row */}
                {editing?.isNew && (
                  <TableRow>
                    {columns.map((col, i) => (
                      <TableCell key={col.key}>
                        <Input
                          value={editing.values[col.key]}
                          onChange={(e) => updateField(col.key, e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={col.label}
                          className={`h-8 ${col.mono ? "font-mono text-xs" : ""}`}
                          autoFocus={i === 0}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleSave}
                          disabled={!canSave || saving}
                        >
                          <Check className="size-4 text-green-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={cancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
              {deleteTitle ?? t("common.delete")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMessage
                ? deleteConfirmMessage(deleteCode ?? "")
                : deleteCode}
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
