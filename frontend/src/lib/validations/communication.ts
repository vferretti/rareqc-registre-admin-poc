import { z } from "zod";
import { type TFunction } from "i18next";

/**
 * Zod schema for the communication form. The contact is required in the
 * single-participant flow but absent in bulk mode (the backend resolves each
 * participant's primary contact).
 */
export const communicationSchema = (t: TFunction, bulk: boolean) =>
  z.object({
    methodCode: z.string().min(1, t("validation.required")),
    contactId: bulk ? z.string() : z.string().min(1, t("validation.required")),
    subjectCode: z.string().min(1, t("validation.required")),
    outcomeCode: z.string(),
    commDate: z.string().min(1, t("validation.required")),
    comment: z.string(),
  });

export type CommunicationValues = z.infer<
  ReturnType<typeof communicationSchema>
>;
