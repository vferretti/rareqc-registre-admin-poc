import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/ui/button";

export function LandingPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-hero text-hero-foreground">
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 text-sm opacity-70 hover:opacity-100 transition-opacity uppercase"
      >
        {i18n.language === "fr" ? "EN" : "FR"}
      </button>
      <div className="flex w-full max-w-lg flex-col items-center gap-12 p-6">
        {/* Scientist illustration */}
        <img
          src="/RARE-Qc_Scientist-magnifying-glass-1000px.png"
          alt=""
          className="h-40"
        />

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/RARE-Qc_Logo-Colour-300px.png"
            alt="RareQC"
            className="h-20"
          />
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold">{t("landing.title")}</h1>
          <p className="text-base opacity-70">{t("landing.description")}</p>
        </div>

        {/* Buttons */}
        <div className="flex w-full justify-center gap-4">
          <Button
            size="lg"
            className="bg-cta text-cta-foreground hover:bg-cta/90"
            onClick={() => navigate("/home")}
          >
            {t("landing.enter")}
          </Button>
        </div>
      </div>
    </div>
  );
}
