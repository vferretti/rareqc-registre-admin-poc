import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/ui/button";

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-primary">
      <div className="flex w-full max-w-lg flex-col items-center gap-12 p-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl font-bold text-primary-foreground">RareQC</span>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-primary-foreground">{t("landing.title")}</h1>
          <p className="text-base text-primary-foreground/80">{t("landing.description")}</p>
        </div>

        {/* Buttons */}
        <div className="flex w-full justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/participants")}
          >
            {t("landing.enter")}
          </Button>
        </div>
      </div>
    </div>
  );
}
