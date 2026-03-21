import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/base/page/page-header";

export default function Reports() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
      />
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-muted-foreground">
        <Construction className="size-12" />
        <p className="text-lg">{t("reports.under_construction")}</p>
      </div>
    </>
  );
}
