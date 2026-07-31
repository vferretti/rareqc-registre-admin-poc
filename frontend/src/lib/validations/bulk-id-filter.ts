import { z } from "zod";
import { type TFunction } from "i18next";

/**
 * Zod schema for the bulk ID filter form. The pasted IDs are additionally
 * validated asynchronously against the API (resolve-ids) by the dialog.
 */
export const bulkIdFilterSchema = (t: TFunction) =>
  z.object({
    source: z.string().min(1, t("validation.required")),
    idsText: z.string().trim().min(1, t("validation.required")),
  });

export type BulkIdFilterValues = z.infer<ReturnType<typeof bulkIdFilterSchema>>;
