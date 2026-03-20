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

interface ClauseFilterState {
  registry: string[];
  recontact: string[];
  external_linkage: string[];
}

type ClauseType = keyof ClauseFilterState;

const CLAUSE_TYPES: ClauseType[] = [
  "registry",
  "recontact",
  "external_linkage",
];

const STATUS_CODES = [
  "valid",
  "expired",
  "withdrawn",
  "replaced_by_new_version",
] as const;

interface ConsentClauseFilterProps {
  value: ClauseFilterState;
  onChange: (value: ClauseFilterState) => void;
}

/** Grouped consent filter dropdown — one section per clause type, each with status checkboxes. */
export function ConsentClauseFilter({
  value,
  onChange,
}: ConsentClauseFilterProps) {
  const { t } = useTranslation();

  const totalSelected =
    value.registry.length +
    value.recontact.length +
    value.external_linkage.length;

  const toggle = (clause: ClauseType, status: string) => {
    const current = value[clause];
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
          {CLAUSE_TYPES.map((clause) => (
            <div key={clause}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {t(`participants.columns.consent_${clause}`)}
              </div>
              <div className="flex flex-col gap-1.5 pl-1">
                {STATUS_CODES.map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={value[clause].includes(status)}
                      onCheckedChange={() => toggle(clause, status)}
                    />
                    {t(`enums.consent_status.${status}`)}
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
