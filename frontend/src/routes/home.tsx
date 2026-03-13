import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("app.title")}</h1>
      <p className="text-muted-foreground">{t("app.description")}</p>
    </div>
  );
}
