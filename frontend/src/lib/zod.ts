import { z } from "zod";

/**
 * Check if a field is required in the Zod schema (Zod v4 API).
 * A field is considered required if it has a min(1+) check on a string type.
 * Fields that are optional, have defaults, or are plain strings without min are not required.
 */
export function isFieldRequired(
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  fieldName: string,
): boolean {
  try {
    const fieldSchema = schema.shape[fieldName];
    if (!fieldSchema) return false;

    return isRequiredField(fieldSchema);
  } catch {
    return false;
  }
}

function isRequiredField(fieldSchema: z.ZodTypeAny): boolean {
  // Optional or has a default → not required
  if (fieldSchema.isOptional()) return false;

  const defType = (fieldSchema as { _zod?: { def?: { type?: string } } })._zod
    ?.def?.type;

  // Nullable → check inner type
  if (defType === "nullable") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = (fieldSchema as any)._zod.def.innerType as z.ZodTypeAny;
    return isRequiredField(inner);
  }

  // String → required only if it has a min(1+) constraint
  if (defType === "string") {
    const minLength = (fieldSchema as z.ZodString).minLength;
    return minLength != null && minLength > 0;
  }

  return false;
}
