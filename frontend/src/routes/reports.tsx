import { useTranslation } from "react-i18next";
import {
  Users,
  HeartPulse,
  FileCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/base/page/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { useReportsSummary } from "@/hooks/useReportsSummary";

/** A single stat row inside the summary card. */
function StatRow({
  icon,
  label,
  value,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className={muted ? "text-muted-foreground" : ""}>
          {label}
        </span>
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const { summary, isLoading } = useReportsSummary();

  if (isLoading || !summary) {
    return (
      <>
        <PageHeader
          title={t("reports.title")}
          description={t("reports.description")}
        />
        <div className="p-8 text-muted-foreground">{t("common.loading")}</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
      />
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {/* Participants */}
              <StatRow
                icon={<Users className="size-4 text-primary" />}
                label={t("reports.total_participants")}
                value={summary.total_participants}
              />
              <StatRow
                label={t("reports.female_count")}
                value={summary.female_count}
                muted
              />
              <StatRow
                label={t("reports.male_count")}
                value={summary.male_count}
                muted
              />
              <StatRow
                label={t("reports.average_age")}
                value={`${summary.average_age.toFixed(1)} ${t("reports.years")}`}
                muted
              />
              <StatRow
                icon={<HeartPulse className="size-4 text-destructive" />}
                label={t("reports.deceased_count")}
                value={summary.deceased_count}
              />

              {/* Consents */}
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm font-medium pb-1">
                  <FileCheck className="size-4 text-primary" />
                  {t("reports.valid_consents")}
                </div>
              </div>
              <StatRow
                label={t("enums.clause_type.registry")}
                value={summary.consent_registry}
                muted
              />
              <StatRow
                label={t("enums.clause_type.recontact")}
                value={summary.consent_recontact}
                muted
              />
              <StatRow
                label={t("enums.clause_type.external_linkage")}
                value={summary.consent_ext_linkage}
                muted
              />

              {/* External systems */}
              {summary.external_systems.length > 0 && (
                <>
                  <div className="pt-2">
                    <div className="text-sm font-medium pb-1">
                      {t("reports.external_systems")}
                    </div>
                  </div>
                  {summary.external_systems.map((es) => (
                    <StatRow
                      key={es.name}
                      label={es.name}
                      value={es.count}
                      muted
                    />
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Growth chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.growth_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.growth_by_quarter.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noResults")}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={summary.growth_by_quarter}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t("reports.total_participants")}
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "var(--chart-1)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
