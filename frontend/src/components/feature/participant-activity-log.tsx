import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Button } from "@/components/base/ui/button";
import { ActivityTimelineItem } from "@/components/feature/activity-timeline-item";
import { cn } from "@/lib/utils";

interface ParticipantActivityLogProps {
  participantId: number;
}

/** Timeline-style activity log for a single participant, with progressive loading. */
export function ParticipantActivityLog({
  participantId,
}: ParticipantActivityLogProps) {
  const { t } = useTranslation();
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
        {logs.map((log, index) => (
          <ActivityTimelineItem
            key={log.id}
            log={log}
            showLine={index < logs.length - 1}
          />
        ))}
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
