import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/base/page/page-header";

export default function Communications() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t("communications.title")}
        description={t("communications.description")}
      />
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-muted-foreground">
        <Construction className="size-12" />
        <p className="text-lg">{t("communications.under_construction")}</p>
      </div>
    </>
  );
}
