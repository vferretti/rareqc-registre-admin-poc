export const LANGUAGE_OPTIONS = ["fr", "en"] as const;

export const PROVINCE_OPTIONS = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

export const CLAUSE_TYPES = [
  "registry",
  "recontact",
  "external_linkage",
] as const;

export const CONSENT_STATUSES = [
  "valid",
  "expired",
  "withdrawn",
  "replaced_by_new_version",
] as const;

export const ACTION_TYPES = [
  "participant_created",
  "participant_edited",
  "contact_created",
  "contact_edited",
  "contact_deleted",
  "consent_added",
  "consent_edited",
] as const;
