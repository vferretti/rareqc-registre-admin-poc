import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Users, History, ChevronDown, UserRound, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/layout/user-avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/base/ui/dropdown-menu";

const FAKE_USER = {
  id: "fake-user-1",
  name: "John Smith",
  email: "john.smith@gmail.com",
};

export function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: "/participants", label: t("nav.patients"), icon: Users },
    { to: "/activity", label: t("nav.activity"), icon: History },
  ];

  const toggleLanguage = () => {
    const nextLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className="h-[var(--height-navbar)] bg-navbar text-navbar-foreground flex items-center px-4">
      <Link to="/home" className="mr-8 hover:opacity-80 transition-opacity">
        <img
          src="/RARE-Qc_Logo-Colour-300px.png"
          alt="RareQC"
          className="h-8"
        />
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
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-navbar-accent transition-colors outline-none cursor-pointer">
            <UserAvatar userId={FAKE_USER.id} name={FAKE_USER.name} />
            <span className="font-medium">{FAKE_USER.name}</span>
            <ChevronDown className="size-3.5 text-navbar-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {t("user_menu.connected_as", { email: FAKE_USER.email })}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound />
              {t("user_menu.profile_settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/")}>
              <LogOut />
              {t("user_menu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={toggleLanguage}
          className="text-sm text-navbar-muted hover:text-navbar-active transition-colors uppercase"
        >
          {i18n.language === "fr" ? "EN" : "FR"}
        </button>
      </div>
    </nav>
  );
}
