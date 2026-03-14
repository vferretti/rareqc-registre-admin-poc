import { z } from "zod";

/**
 * Helper function to check if a field is required in the Zod schema
 */
export function isFieldRequired(
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  fieldName: string,
): boolean {
  try {
    const shape =
      typeof schema._def.shape === "function"
        ? schema._def.shape()
        : schema._def.shape;

    if (!shape || !(fieldName in shape)) return false;

    const fieldSchema = shape[fieldName];
    if (!fieldSchema) return false;

    return !isOptionalField(fieldSchema);
  } catch {
    return false;
  }
}

function isOptionalField(fieldSchema: z.ZodTypeAny): boolean {
  const typeName = fieldSchema._def?.typeName;

  if (typeName === "ZodOptional") return true;

  // Has a default value → user doesn't need to fill it
  if (typeName === "ZodDefault") return true;

  if (typeName === "ZodNullable") {
    return isOptionalField(fieldSchema._def.innerType);
  }

  // .refine() / .transform() — unwrap and check inner type
  if (typeName === "ZodEffects") {
    return isOptionalField(fieldSchema._def.schema);
  }

  if (typeName === "ZodUnion") {
    return fieldSchema._def.options.some(
      (option: z.ZodTypeAny) =>
        option._def.typeName === "ZodUndefined" ||
        option._def.typeName === "ZodNull",
    );
  }

  // A string with min(0) or no min constraint is effectively optional for display
  if (typeName === "ZodString") {
    const checks = fieldSchema._def.checks ?? [];
    return !checks.some(
      (c: { kind: string }) =>
        c.kind === "min" && (c as { value: number }).value > 0,
    );
  }

  return false;
}
