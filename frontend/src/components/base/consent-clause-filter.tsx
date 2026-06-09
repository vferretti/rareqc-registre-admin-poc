import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { Button } from "@/components/base/ui/button";
import { Checkbox } from "@/components/base/ui/checkbox";
import { Badge } from "@/components/base/badges/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/base/ui/dropdown-menu";
import { enumLabel } from "@/lib/enum-label";
import { useEnums } from "@/hooks/useEnums";

interface ClauseFilterState {
  registry: string[];
  recontact: string[];
  external_linkage: string[];
}

type ClauseType = keyof ClauseFilterState;

interface ConsentClauseFilterProps {
  value: ClauseFilterState;
  onChange: (value: ClauseFilterState) => void;
}

/** Grouped consent filter dropdown — one section per clause type, each with status checkboxes. */
export function ConsentClauseFilter({
  value,
  onChange,
}: ConsentClauseFilterProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enums } = useEnums();
  // Only the clause types the filter state knows about. Guards against
  // unexpected reference-table rows (e.g. test data) crashing the page.
  const knownClauseTypes: ClauseType[] = [
    "registry",
    "recontact",
    "external_linkage",
  ];
  const clauseTypes = (enums?.clause_type?.map((e) => e.code) ?? []).filter(
    (code): code is ClauseType => knownClauseTypes.includes(code as ClauseType),
  );
  const consentStatuses = enums?.consent_status?.map((e) => e.code) ?? [];

  const totalSelected =
    value.registry.length +
    value.recontact.length +
    value.external_linkage.length;

  const toggle = (clause: ClauseType, status: string) => {
    const current = value[clause] ?? [];
    onChange({
      ...value,
      [clause]: current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status],
    });
  };

  const clear = () =>
    onChange({ registry: [], recontact: [], external_linkage: [] });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="size-4" />
          {t("participants.consent_filter")}
          {totalSelected > 0 && (
            <Badge variant="default" className="ml-1">
              {totalSelected}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-3 min-w-56">
        <div className="flex flex-col gap-3">
          {clauseTypes.map((clause) => (
            <div key={clause}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t(`participants.columns.consent_${clause}`)}
              </div>
              <div className="flex flex-col gap-1.5 pl-1">
                {consentStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={value[clause].includes(status)}
                      onCheckedChange={() => toggle(clause, status)}
                    />
                    {enumLabel(enums?.consent_status, status, lang)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={clear}
          >
            {t("common.clear")}
          </Button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { ClauseFilterState };
