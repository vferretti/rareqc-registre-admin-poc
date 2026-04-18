import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/base/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";
import { Badge } from "@/components/base/badges/badge";
import { Field } from "@/components/base/field";
import { enumLabel } from "@/lib/enum-label";
import { formatPhone, formatAddress } from "@/lib/format";
import type { Contact, EnumsResponse } from "@/types/participant";

type TFunc = (key: string, options?: Record<string, string>) => string;

interface ContactCardProps {
  contact: Contact;
  t: TFunc;
  enums: EnumsResponse | undefined;
  lang: string;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}

/** Renders a single contact card with name, relationship, coordinates, and action buttons. */
export function ContactCard({
  contact,
  t,
  enums,
  lang,
  onEdit,
  onDelete,
  canDelete = true,
}: ContactCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {contact.first_name} {contact.last_name}
          </span>
          <Badge variant="secondary">
            {enumLabel(enums?.relationship, contact.relationship_code, lang)}
          </Badge>
          {contact.is_primary && (
            <Badge variant="blue">
              {t("participant_detail.primary_contact")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("common.edit")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={canDelete ? onDelete : undefined}
                  disabled={!canDelete}
                >
                  <Trash2
                    className={`size-4 ${canDelete ? "text-destructive" : ""}`}
                  />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canDelete
                ? t("common.delete")
                : t("participant_detail.cannot_delete_contact_referenced")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Field label={t("participant_detail.email")}>
          {contact.email || "\u2014"}
        </Field>
        <Field label={t("participant_detail.phone")}>
          {formatPhone(contact.phone)}
        </Field>
        <Field label={t("participant_detail.street_address")}>
          {formatAddress(
            contact.apartment_number,
            contact.street_address,
            contact.city,
            contact.province,
            contact.code_postal,
          )}
        </Field>
        <Field label={t("participant_detail.preferred_language")}>
          {t(`enums.language.${contact.preferred_language}`, {
            defaultValue: contact.preferred_language,
          })}
        </Field>
      </dl>
    </div>
  );
}
