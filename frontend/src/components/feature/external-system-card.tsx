import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { EditableTableCard } from "@/components/feature/editable-table-card";
import type { ExternalSystem } from "@/hooks/useExternalSystems";

interface ExternalSystemCardProps {
  systems: ExternalSystem[];
  onMutate: () => void;
}

export function ExternalSystemCard({
  systems,
  onMutate,
}: ExternalSystemCardProps) {
  const { t } = useTranslation();

  // Derive referenced systems (those with is_referenced === true)
  const referencedNames = systems
    .filter((s) => s.is_referenced)
    .map((s) => s.name);

  return (
    <EditableTableCard
      title={t("admin.external_systems.title")}
      columns={[
        { key: "name", label: t("admin.external_systems.name"), mono: true },
        { key: "title_fr", label: t("admin.external_systems.title_fr") },
        { key: "title_en", label: t("admin.external_systems.title_en") },
      ]}
      entries={systems.map((s) => ({
        name: s.name,
        title_fr: s.title_fr,
        title_en: s.title_en,
        _id: String(s.id),
      }))}
      referencedCodes={referencedNames}
      codeField="name"
      cannotDeleteMessage={t("admin.external_systems.cannot_delete")}
      deleteTitle={t("admin.external_systems.delete_title")}
      deleteConfirmMessage={(name) =>
        t("admin.external_systems.delete_confirm", { name })
      }
      onAdd={async (entry) => {
        await api.post("/external-systems", {
          name: entry.name,
          title_fr: entry.title_fr,
          title_en: entry.title_en,
        });
        onMutate();
      }}
      onEdit={async (name, entry) => {
        const system = systems.find((s) => s.name === name);
        if (!system) return;
        await api.put(`/external-systems/${system.id}`, {
          name: entry.name,
          title_fr: entry.title_fr,
          title_en: entry.title_en,
        });
        onMutate();
      }}
      onDelete={async (name) => {
        const system = systems.find((s) => s.name === name);
        if (!system) return;
        await api.delete(`/external-systems/${system.id}`);
        onMutate();
      }}
    />
  );
}
