import { z } from "zod";
import { type TFunction } from "i18next";

/** Zod schema for one clause of a consent template (type + bilingual text). */
export const clauseEntrySchema = (t: TFunction) =>
  z.object({
    clauseTypeCode: z.string().min(1, t("validation.required")),
    clauseFr: z.string().trim().min(1, t("validation.required")),
    clauseEn: z.string().trim().min(1, t("validation.required")),
  });

/**
 * Zod schema for the consent template form. The PDF file is required when
 * creating a template but optional in edit mode (the existing file is kept).
 */
export const consentTemplateSchema = (t: TFunction, isEdit: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, t("validation.required")),
      file: z.instanceof(File).nullable(),
      clauses: z.array(clauseEntrySchema(t)).min(1),
    })
    .superRefine((values, ctx) => {
      if (!isEdit && !values.file) {
        ctx.addIssue({
          code: "custom",
          path: ["file"],
          message: t("validation.required"),
        });
      }
    });

export type ConsentTemplateValues = z.infer<
  ReturnType<typeof consentTemplateSchema>
>;
