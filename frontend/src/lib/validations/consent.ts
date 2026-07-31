import { z } from "zod";
import { type TFunction } from "i18next";

/** Zod schema for one consent entry (clause + date + signatory). */
export const consentEntrySchema = (t: TFunction) =>
  z.object({
    clauseId: z.string().min(1, t("validation.required")),
    date: z.string().min(1, t("validation.required")),
    signedById: z.string().min(1, t("validation.required")),
  });

/** Zod schema for the consent creation form: a template and one or more entries. */
export const consentFormSchema = (t: TFunction) =>
  z.object({
    templateId: z.string().min(1, t("validation.required")),
    entries: z.array(consentEntrySchema(t)).min(1),
  });

/** Zod schema for the consent edit form (status, date, signatory). */
export const consentEditSchema = (t: TFunction) =>
  z.object({
    statusCode: z.string().min(1, t("validation.required")),
    date: z.string().min(1, t("validation.required")),
    signedById: z.string().min(1, t("validation.required")),
  });

export type ConsentFormValues = z.infer<ReturnType<typeof consentFormSchema>>;
export type ConsentEditValues = z.infer<ReturnType<typeof consentEditSchema>>;
