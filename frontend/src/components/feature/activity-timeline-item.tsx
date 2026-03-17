import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { UserAvatar } from "@/components/layout/user-avatar";
import type { ActivityLog } from "@/types/activity-log";

interface ActivityTimelineItemProps {
  log: ActivityLog;
  /** Show the vertical line below the avatar (false for the last item). */
  showLine?: boolean;
  /** Show a link to the participant (useful on pages that aren't scoped to one participant). */
  showParticipantLink?: boolean;
}

/** Formats an ISO date string to a locale-aware "yyyy-MM-dd, h:mm a" format. */
function formatDateTime(date: string, lang: string): string {
  try {
    return format(parseISO(date), "yyyy-MM-dd, h:mm a", {
      locale: lang === "fr" ? fr : enUS,
    });
  } catch {
    return date;
  }
}

/** A single entry in the activity timeline with avatar, action, details, and timestamp. */
export function ActivityTimelineItem({
  log,
  showLine = true,
  showParticipantLink = false,
}: ActivityTimelineItemProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex gap-3">
      {/* Timeline line + avatar */}
      <div className="flex flex-col items-center">
        <UserAvatar userId={log.author} name={log.author} size="sm" />
        {showLine && <div className="w-px flex-1 bg-border min-h-4" />}
      </div>

      {/* Content */}
      <div className="pb-5 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t(`enums.action_type.${log.action_type_code}`, {
            defaultValue: log.action_type_code,
          })}
        </p>
        {log.details && (
          <p className="text-sm text-muted-foreground">
            {log.details}
            {showParticipantLink &&
              log.participant_name &&
              log.participant_id && (
                <>
                  {" — "}
                  <Link
                    to={`/participants/${log.participant_id}`}
                    className="text-primary hover:underline"
                  >
                    {log.participant_name}
                  </Link>
                </>
              )}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {log.author}, {formatDateTime(log.created_at, i18n.language)}
        </p>
      </div>
    </div>
  );
}
