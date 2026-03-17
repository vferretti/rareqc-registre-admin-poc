import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Users, Activity, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/base/ui/card";
import { PageHeader } from "@/components/base/page/page-header";
import { ActivityTimelineItem } from "@/components/feature/activity-timeline-item";
import { SearchBox } from "@/components/feature/search-box";
import { useActivityLogs } from "@/hooks/useActivityLogs";

/** Home page with search, navigation cards, and recent activity. */
export default function Home() {
  const { t } = useTranslation();
  const { logs } = useActivityLogs({
    pageIndex: 0,
    pageSize: 5,
    sortField: "created_at",
    sortOrder: "desc",
  });

  return (
    <>
      <PageHeader
        title={t("home.title")}
        description={t("home.description")}
      />
      <div className="p-8">
        <div className="flex flex-col gap-6">
          {/* Search bar */}
          <SearchBox />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("home.explore_title")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link
                  to="/participants"
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t("home.explore_participants")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("home.explore_participants_description")}
                    </div>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
                <Link
                  to="/activity"
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t("home.explore_activity")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("home.explore_activity_description")}
                    </div>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>

            {/* Recent activity card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("home.recent_activity")}</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("activity_log.empty")}
                  </p>
                ) : (
                  <div className="space-y-0">
                    {logs.map((log, index) => (
                      <ActivityTimelineItem
                        key={log.id}
                        log={log}
                        showLine={index < logs.length - 1}
                        showParticipantLink
                      />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  to="/activity"
                  className="text-sm text-primary hover:underline"
                >
                  {t("home.view_all_activity")}
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
