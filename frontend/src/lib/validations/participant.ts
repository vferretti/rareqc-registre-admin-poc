import { z } from "zod";
import { type TFunction } from "i18next";

const RAMQ_PATTERN = /^[A-Z]{4} \d{4} \d{4}$/;

export const contactSchema = (t: TFunction) =>
  z.object({
    id: z.number().optional(),
    first_name: z.string().min(1, t("validation.required")),
    last_name: z.string().min(1, t("validation.required")),
    relationship_code: z.string().min(1, t("validation.required")),
    preferred_language: z.string(),
    same_coordinates: z.boolean(),
    is_primary: z.boolean(),
    email: z.string(),
    phone: z.string(),
    street_address: z.string(),
    city: z.string(),
    province: z.string(),
    code_postal: z.string(),
  });

export const participantSchema = (t: TFunction) =>
  z.object({
    first_name: z.string().min(1, t("validation.required")),
    last_name: z.string().min(1, t("validation.required")),
    date_of_birth: z.string().min(1, t("validation.required")),
    sex_at_birth_code: z.string().min(1, t("validation.required")),
    ramq: z.string().refine((v) => v === "" || RAMQ_PATTERN.test(v), {
      message: t("validation.ramq_format"),
    }),
    vital_status_code: z.string(),
    date_of_death: z.string(),
    email: z.string(),
    phone: z.string(),
    street_address: z.string(),
    city: z.string(),
    province: z.string(),
    code_postal: z.string(),
    contacts: z.array(contactSchema(t)),
  });

export type ParticipantFormValues = z.infer<
  ReturnType<typeof participantSchema>
>;
export type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>;
