/** Badge variant mappings for enum codes, shared across list and detail views. */

export const SEX_BADGE: Record<string, "blue" | "violet" | "secondary"> = {
  male: "blue",
  female: "violet",
};

export const VITAL_STATUS_BADGE: Record<
  string,
  "green" | "destructive" | "secondary"
> = {
  alive: "green",
  deceased: "destructive",
};

export const ACTION_BADGE: Record<
  string,
  "green" | "blue" | "amber" | "destructive" | "secondary"
> = {
  participant_created: "green",
  participant_edited: "blue",
  contact_created: "blue",
  contact_edited: "amber",
  contact_deleted: "destructive",
  consent_added: "green",
};
