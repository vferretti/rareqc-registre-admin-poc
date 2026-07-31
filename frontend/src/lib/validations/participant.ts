import { z } from "zod";
import { type TFunction } from "i18next";

/** RAMQ format: 4 uppercase letters, space, 4 digits, space, 4 digits (e.g. "TREB 1503 1412"). */
const RAMQ_PATTERN = /^[A-Z]{4} \d{4} \d{4}$/;

/** Zod schema for a contact form entry (used in the contacts array). */
export const contactSchema = (t: TFunction) =>
  z.object({
    id: z.number().optional(),
    first_name: z.string().min(1, t("validation.required")),
    last_name: z.string().min(1, t("validation.required")),
    relationship_code: z.string().min(1, t("validation.required")),
    preferred_language: z.string(),
    same_coordinates: z.boolean(),
    is_primary: z.boolean(),
    email: z
      .string()
      .email(t("validation.email_format"))
      .optional()
      .or(z.literal("")),
    phone: z.string(),
    apartment_number: z.string(),
    street_address: z.string(),
    city: z.string(),
    province: z.string(),
    code_postal: z.string(),
  });

/** Zod schema for the participant form (identity + coordinates + contacts). */
export const participantSchema = (t: TFunction) =>
  z.object({
    first_name: z.string().min(1, t("validation.required")),
    last_name: z.string().min(1, t("validation.required")),
    date_of_birth: z.string().min(1, t("validation.required")),
    sex_at_birth_code: z.string().min(1, t("validation.required")),
    city_of_birth: z.string(),
    ramq: z.string().refine((v) => v === "" || RAMQ_PATTERN.test(v), {
      message: t("validation.ramq_format"),
    }),
    vital_status_code: z.string(),
    date_of_death: z.string(),
    email: z
      .string()
      .email(t("validation.email_format"))
      .optional()
      .or(z.literal("")),
    phone: z.string(),
    apartment_number: z.string(),
    street_address: z.string(),
    city: z.string(),
    province: z.string(),
    code_postal: z.string(),
    preferred_language: z.string(),
    contacts: z.array(contactSchema(t)),
  });

export type ParticipantFormValues = z.infer<
  ReturnType<typeof participantSchema>
>;
export type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>;

/** Auto-format RAMQ input: uppercase letters (4), then digits (8), with spaces at positions 4 and 8 */
export function formatRAMQ(raw: string): string {
  const stripped = raw.replace(/[^a-zA-Z0-9]/g, "");
  let letters = "";
  let digits = "";

  for (const ch of stripped) {
    if (letters.length < 4 && /[a-zA-Z]/.test(ch)) {
      letters += ch.toUpperCase();
    } else if (digits.length < 8 && /\d/.test(ch)) {
      digits += ch;
    }
  }

  let result = letters;
  if (digits.length > 0) result += " " + digits.slice(0, 4);
  if (digits.length > 4) result += " " + digits.slice(4);
  return result;
}
