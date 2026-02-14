/**
 * Pure helpers for instructor profile (no DB client). Used by repository and tests.
 */

export interface CreateInstructorProfileParamsDisplayName {
  display_name?: string | null;
  full_name: string;
}

/**
 * Resolve display_name for insert: explicit value, or fallback to full_name or ''.
 * Ensures we never send undefined to DB; draft-friendly when DB allows NULL (caller can pass null).
 */
export function resolveDisplayNameForInsert(
  params: CreateInstructorProfileParamsDisplayName
): string {
  const { display_name, full_name } = params;
  if (display_name !== undefined && display_name !== null) return display_name;
  return full_name || '';
}
