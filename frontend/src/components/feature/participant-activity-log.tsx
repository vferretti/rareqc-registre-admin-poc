import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { UserAvatar } from "@/components/layout/user-avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/base/ui/button";
import { ChevronDown } from "lucide-react";

interface ParticipantActivityLogProps {
  participantId: number;
}

function formatDateTime(date: string, lang: string): string {
  try {
    return format(parseISO(date), "yyyy-MM-dd, h:mm a", {
      locale: lang === "fr" ? fr : enUS,
    });
  } catch {
    return date;
  }
}

export function ParticipantActivityLog({
  participantId,
}: ParticipantActivityLogProps) {
  const { t, i18n } = useTranslation();
  const [pageSize, setPageSize] = useState(10);

  const { logs, total, isLoading, error } = useActivityLogs({
    pageIndex: 0,
    pageSize,
    sortField: "created_at",
    sortOrder: "desc",
    participantId,
  });

  if (error) {
    return <p className="text-destructive text-sm">{t("common.error")}</p>;
  }

  if (!isLoading && logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("activity_log.empty")}</p>
    );
  }

  return (
    <div className={cn("transition-opacity", isLoading && "opacity-50")}>
      <div className="space-y-0">
        {logs.map((log, index) => {
          const actionLabel = t(`enums.action_type.${log.action_type_code}`, {
            defaultValue: log.action_type_code,
          });
          const isLast = index === logs.length - 1;

          return (
            <div key={log.id} className="flex gap-3">
              {/* Timeline line + avatar */}
              <div className="flex flex-col items-center">
                <UserAvatar
                  userId={log.author}
                  name={log.author}
                  size="sm"
                />
                {!isLast && (
                  <div className="w-px flex-1 bg-border min-h-4" />
                )}
              </div>

              {/* Content */}
              <div className="pb-5 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {actionLabel}
                </p>
                {log.details && (
                  <p className="text-sm text-muted-foreground">{log.details}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.author}, {formatDateTime(log.created_at, i18n.language)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {total > pageSize && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setPageSize((s) => s + 10)}
          >
            <ChevronDown className="size-4 mr-1" />
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
