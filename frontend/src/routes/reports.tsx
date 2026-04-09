import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Table2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/base/page/page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/base/ui/card";
import { Button } from "@/components/base/ui/button";
import { DatePicker } from "@/components/base/ui/date-picker";
import { InformationField } from "@/components/base/information/information-field";
import { useReportsSummary } from "@/hooks/useReportsSummary";

/** Returns today's date as YYYY-MM-DD. */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Formats a count with its percentage of total. */
function pct(value: number, total: number): string {
  return total > 0
    ? `${value} (${((value / total) * 100).toFixed(1)}%)`
    : `${value}`;
}

/** Resolves CSS variables in SVG attributes to computed values. */
function resolveCssVars(svg: SVGElement) {
  const style = getComputedStyle(document.documentElement);
  svg.querySelectorAll("*").forEach((el) => {
    for (const attr of ["fill", "stroke"]) {
      const val = el.getAttribute(attr);
      if (val?.startsWith("var(")) {
        const varName = val.slice(4, -1).trim();
        const resolved = style.getPropertyValue(varName).trim();
        if (resolved) el.setAttribute(attr, resolved);
      }
    }
  });
}

/** Downloads the content of a container (title + chart SVG) as a PNG file. */
function downloadPng(container: HTMLDivElement | null, fileName: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGElement;
  resolveCssVars(clone);

  // Get title text if present
  const titleEl = container?.querySelector("[data-chart-title]");
  const titleText = titleEl?.textContent || "";

  const svgRect = svg.getBoundingClientRect();
  const scale = 2;
  const titleHeight = titleText ? 36 : 0;
  const canvasW = svgRect.width * scale;
  const canvasH = (svgRect.height + titleHeight) * scale;

  // Set explicit dimensions on the clone
  clone.setAttribute("width", String(svgRect.width));
  clone.setAttribute("height", String(svgRect.height));

  const serializer = new XMLSerializer();
  const svgSource = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgSource], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d")!;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw title
    if (titleText) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold ${14 * scale}px sans-serif`;
      ctx.fillText(titleText, 12 * scale, 24 * scale);
    }

    // Draw chart
    ctx.drawImage(img, 0, titleHeight * scale, canvasW, svgRect.height * scale);
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.src = svgUrl;
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [reportDate, setReportDate] = useState(todayStr);
  const growthChartRef = useRef<HTMLDivElement>(null);
  const ageChartRef = useRef<HTMLDivElement>(null);
  const cityChartRef = useRef<HTMLDivElement>(null);
  const [showGrowthTable, setShowGrowthTable] = useState(false);
  const [showAgeTable, setShowAgeTable] = useState(false);
  const [showCityTable, setShowCityTable] = useState(false);

  const { summary, isLoading } = useReportsSummary(reportDate);

  const dateDescription = (
    <span className="inline-flex items-center gap-1.5 relative">
      {t("reports.as_of")}{" "}
      {new Date(reportDate + "T00:00:00").toLocaleDateString(
        i18n.language === "fr" ? "fr-CA" : "en-CA",
      )}
      <DatePicker
        value={reportDate}
        onChange={(v) => {
          if (v) setReportDate(v);
        }}
        maxDate={new Date()}
        iconOnly
      />
    </span>
  );

  if (isLoading || !summary) {
    return (
      <>
        <PageHeader title={t("reports.title")} description={dateDescription} />
        <div className="p-8 text-muted-foreground">{t("common.loading")}</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("reports.title")} description={dateDescription} />
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary card */}
          <Card>
            <CardHeader className="border-b [.border-b]:pb-2">
              <CardTitle>{t("reports.summary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <InformationField label={t("reports.total_participants")}>
                  {summary.total_participants}
                </InformationField>
                <InformationField label={t("reports.female_count")}>
                  {pct(summary.female_count, summary.total_participants)}
                </InformationField>
                <InformationField label={t("reports.male_count")}>
                  {pct(summary.male_count, summary.total_participants)}
                </InformationField>
                <InformationField label={t("reports.average_age")}>
                  {summary.average_age.toFixed(1)} {t("reports.years")}
                </InformationField>
                <InformationField label={t("reports.deceased_count")}>
                  {pct(summary.deceased_count, summary.total_participants)}
                </InformationField>
              </div>

              {/* Valid consents */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">
                  {t("reports.valid_consents")}
                </div>
                <div className="flex flex-col gap-2">
                  <InformationField label={t("enums.clause_type.registry")}>
                    {pct(summary.consent_registry, summary.total_participants)}
                  </InformationField>
                  <InformationField label={t("enums.clause_type.recontact")}>
                    {pct(summary.consent_recontact, summary.total_participants)}
                  </InformationField>
                  <InformationField
                    label={t("enums.clause_type.external_linkage")}
                  >
                    {pct(
                      summary.consent_ext_linkage,
                      summary.total_participants,
                    )}
                  </InformationField>
                </div>
              </div>

              {/* External systems */}
              {summary.external_systems.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">
                    {t("reports.external_systems")}
                  </div>
                  <div className="flex flex-col gap-2">
                    {summary.external_systems.map((es) => (
                      <InformationField key={es.name} label={es.name}>
                        {pct(es.count, summary.total_participants)}
                      </InformationField>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Growth chart */}
          <Card>
            <CardHeader className="border-b [.border-b]:pb-2">
              <CardTitle>{t("reports.growth_title")}</CardTitle>
              <CardAction>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowGrowthTable((v) => !v)}
                  >
                    <Table2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      downloadPng(growthChartRef.current, "croissance")
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {summary.growth_by_quarter.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noResults")}
                </p>
              ) : (
                <div ref={growthChartRef}>
                  <span data-chart-title className="sr-only">
                    {t("reports.growth_title")}
                  </span>
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart
                      data={summary.growth_by_quarter}
                      margin={{ bottom: 25, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="quarter"
                        tick={{ fontSize: 12 }}
                        label={{
                          value: t("reports.quarter"),
                          position: "insideBottom",
                          offset: -10,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[
                          0,
                          (max: number) => {
                            const tick =
                              max <= 50
                                ? 10
                                : max <= 200
                                  ? 25
                                  : max <= 500
                                    ? 50
                                    : 100;
                            return Math.ceil(max / tick) * tick + tick;
                          },
                        ]}
                        label={{
                          value: `# ${t("reports.participants")}`,
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          fontSize: 12,
                          style: { textAnchor: "middle" },
                        }}
                      />
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
                </div>
              )}
              {showGrowthTable && summary.growth_by_quarter.length > 0 && (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">
                        {t("reports.quarter")}
                      </th>
                      <th className="py-2 font-medium text-right">{`# ${t("reports.participants")}`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.growth_by_quarter.map((q) => (
                      <tr key={q.quarter} className="border-b last:border-0">
                        <td className="py-2 pr-4">{q.quarter}</td>
                        <td className="py-2 text-right tabular-nums">
                          {q.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          {/* Age distribution */}
          <Card>
            <CardHeader className="border-b [.border-b]:pb-2">
              <CardTitle>{t("reports.age_distribution")}</CardTitle>
              <CardAction>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowAgeTable((v) => !v)}
                  >
                    <Table2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      downloadPng(ageChartRef.current, "distribution_age")
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {!summary.age_distribution?.length ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noResults")}
                </p>
              ) : (
                <div ref={ageChartRef}>
                  <span data-chart-title className="sr-only">
                    {t("reports.age_distribution")}
                  </span>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={summary.age_distribution}
                      margin={{ bottom: 25, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 12 }}
                        label={{
                          value: t("reports.age_range"),
                          position: "insideBottom",
                          offset: -10,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        label={{
                          value: `# ${t("reports.participants")}`,
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          fontSize: 12,
                          style: { textAnchor: "middle" },
                        }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name={t("reports.participants")}
                        fill="var(--chart-1)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {showAgeTable && summary.age_distribution?.length > 0 && (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">
                        {t("reports.age_range")}
                      </th>
                      <th className="py-2 font-medium text-right">{`# ${t("reports.participants")}`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.age_distribution.map((a) => (
                      <tr key={a.range} className="border-b last:border-0">
                        <td className="py-2 pr-4">{a.range}</td>
                        <td className="py-2 text-right tabular-nums">
                          {a.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          {/* City distribution */}
          <Card>
            <CardHeader className="border-b [.border-b]:pb-2">
              <CardTitle>{t("reports.geographic_distribution")}</CardTitle>
              <CardAction>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowCityTable((v) => !v)}
                  >
                    <Table2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      downloadPng(
                        cityChartRef.current,
                        "distribution_geographique",
                      )
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {!summary.city_distribution?.length ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noResults")}
                </p>
              ) : (
                <div ref={cityChartRef}>
                  <span data-chart-title className="sr-only">
                    {t("reports.geographic_distribution")}
                  </span>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(
                      300,
                      summary.city_distribution.length * 32,
                    )}
                  >
                    <BarChart
                      data={summary.city_distribution}
                      layout="vertical"
                      margin={{ left: 20, right: 30, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        label={{
                          value: `# ${t("reports.participants")}`,
                          position: "insideBottom",
                          offset: -10,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fontSize: 12 }}
                        width={140}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name={t("reports.participants")}
                        fill="var(--chart-1)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {showCityTable && summary.city_distribution?.length > 0 && (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">
                        {t("reports.city")}
                      </th>
                      <th className="py-2 font-medium text-right">{`# ${t("reports.participants")}`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.city_distribution.map((c) => (
                      <tr key={c.city} className="border-b last:border-0">
                        <td className="py-2 pr-4">{c.city}</td>
                        <td className="py-2 text-right tabular-nums">
                          {c.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
