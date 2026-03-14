import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const links = [
    { to: "/participants", label: t("nav.patients"), icon: Users },
  ];

  const toggleLanguage = () => {
    const nextLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className="h-[var(--height-navbar)] bg-navbar text-navbar-foreground flex items-center px-4">
      <Link to="/" className="mr-8 hover:opacity-80 transition-opacity">
        <img src="/RARE-Qc_Logo-Colour-300px.png" alt="RareQC" className="h-8" />
      </Link>
      <div className="flex gap-2 flex-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-navbar-muted transition-colors hover:bg-navbar-accent hover:text-navbar-active",
              location.pathname === link.to && "text-navbar-active",
            )}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={toggleLanguage}
        className="text-sm text-navbar-muted hover:text-navbar-active transition-colors uppercase"
      >
        {i18n.language === "fr" ? "EN" : "FR"}
      </button>
    </nav>
  );
}
