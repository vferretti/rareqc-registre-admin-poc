import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Button } from "@/components/base/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { ActivityTimelineItem } from "@/components/feature/activity-timeline-item";
import { cn } from "@/lib/utils";

interface ParticipantActivityLogProps {
  participantId: number;
}

const DEFAULT_PAGE_SIZE = 5;

/** Timeline-style activity log for a single participant, with progressive loading. */
export function ParticipantActivityLog({
  participantId,
}: ParticipantActivityLogProps) {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { logs, total, isLoading, error } = useActivityLogs({
    pageIndex: 0,
    pageSize,
    sortField: "created_at",
    sortOrder: "desc",
    participantId,
  });

  const title = total > 0
    ? `${t("activity_log.participant_section_title")} (${t("activity_log.activity_count", { count: total })})`
    : t("activity_log.participant_section_title");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive text-sm">{t("common.error")}</p>
        ) : !isLoading && logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("activity_log.empty")}</p>
        ) : (
          <div className={cn("transition-opacity", isLoading && "opacity-50")}>
            <div className="space-y-0">
              {logs.map((log, index) => (
                <ActivityTimelineItem
                  key={log.id}
                  log={log}
                  showLine={index < logs.length - 1}
                />
              ))}
            </div>

            {total > DEFAULT_PAGE_SIZE && (
              <div className="flex gap-2 pt-2">
                {pageSize > DEFAULT_PAGE_SIZE ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setPageSize(DEFAULT_PAGE_SIZE)}
                  >
                    <ChevronUp className="size-4 mr-1" />
                    {t("activity_log.show_less")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setPageSize((s) => s + 5)}
                  >
                    <ChevronDown className="size-4 mr-1" />
                    {t("activity_log.show_more")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
