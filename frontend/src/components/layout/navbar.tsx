import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/patients", label: t("nav.patients") },
  ];

  const toggleLanguage = () => {
    const nextLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className="h-[var(--height-navbar)] bg-primary text-primary-foreground flex items-center px-4">
      <span className="font-semibold mr-8">RareQC</span>
      <div className="flex gap-4 flex-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "text-sm hover:opacity-80 transition-opacity",
              location.pathname === link.to && "font-bold underline underline-offset-4",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={toggleLanguage}
        className="text-sm hover:opacity-80 transition-opacity uppercase"
      >
        {i18n.language === "fr" ? "EN" : "FR"}
      </button>
    </nav>
  );
}
