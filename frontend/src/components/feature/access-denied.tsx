import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/ui/button";
import { useAuthContext } from "@/contexts/use-auth-context";

/**
 * Shown to an authenticated user whose account lacks the registre_admin
 * role (e.g. a participant reaching the admin portal through SSO). The
 * only way forward is logging out — API calls would all answer 403.
 */
export function AccessDenied() {
  const { t } = useTranslation();
  const { user, logout } = useAuthContext();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-hero text-hero-foreground">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 p-6 text-center">
        <img
          src="/RARE-Qc_Logo-Colour-300px.png"
          alt="RareQC"
          className="h-16"
        />
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">
            {t("auth.access_denied.title")}
          </h1>
          <p className="text-base opacity-70">
            {t("auth.access_denied.description", { email: user?.email })}
          </p>
        </div>
        <Button
          size="lg"
          className="bg-cta text-cta-foreground hover:bg-cta/90"
          onClick={logout}
        >
          {t("user_menu.logout")}
        </Button>
      </div>
    </div>
  );
}
