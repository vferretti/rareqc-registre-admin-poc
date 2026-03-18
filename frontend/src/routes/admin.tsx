import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/base/page/page-header";
import { Card, CardContent } from "@/components/base/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";

export default function Admin() {
  const { t } = useTranslation();

  const links = [
    {
      to: "/admin/users",
      icon: ShieldCheck,
      label: t("admin.users"),
      description: t("admin.users_description"),
      disabled: true,
    },
    {
      to: "/admin/consents",
      icon: FileText,
      label: t("admin.consents"),
      description: t("admin.consents_description"),
      disabled: true,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <TooltipProvider>
              {links.map((link) => {
                const content = (
                  <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <link.icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{link.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {link.description}
                      </div>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                );

                if (link.disabled) {
                  return (
                    <Tooltip key={link.to}>
                      <TooltipTrigger asChild>
                        <div className="opacity-50 cursor-not-allowed">
                          {content}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{t("admin.coming_soon")}</TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="hover:bg-accent"
                  >
                    {content}
                  </Link>
                );
              })}
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
