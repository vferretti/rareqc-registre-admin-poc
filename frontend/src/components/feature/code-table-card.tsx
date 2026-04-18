import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { EditableTableCard } from "@/components/feature/editable-table-card";
import type { CodeEntry } from "@/hooks/useCodeTables";

interface CodeTableCardProps {
  table: string;
  entries: CodeEntry[];
  referencedCodes: string[];
  onMutate: () => void;
}

export function CodeTableCard({
  table,
  entries,
  referencedCodes,
  onMutate,
}: CodeTableCardProps) {
  const { t } = useTranslation();

  return (
    <EditableTableCard
      title={t(`admin.code_tables.${table}`)}
      columns={[
        { key: "code", label: t("admin.code_tables.code"), mono: true },
        { key: "name_fr", label: t("admin.code_tables.label_fr") },
        { key: "name_en", label: t("admin.code_tables.label_en") },
      ]}
      entries={entries.map((e) => ({
        code: e.code,
        name_fr: e.name_fr,
        name_en: e.name_en,
      }))}
      referencedCodes={referencedCodes}
      codeField="code"
      cannotDeleteMessage={t("admin.code_tables.cannot_delete")}
      deleteTitle={t("admin.code_tables.delete_title")}
      deleteConfirmMessage={(code) =>
        t("admin.code_tables.delete_confirm", { code })
      }
      onAdd={async (entry) => {
        await api.post(`/code-tables/${table}/entries`, entry);
        onMutate();
      }}
      onEdit={async (code, entry) => {
        await api.put(`/code-tables/${table}/entries/${code}`, entry);
        onMutate();
      }}
      onDelete={async (code) => {
        await api.delete(`/code-tables/${table}/entries/${code}`);
        onMutate();
      }}
    />
  );
}
