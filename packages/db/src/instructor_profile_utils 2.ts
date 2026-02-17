/**
 * Pure helpers for instructor profile (no DB client). Used by repository and tests.
 */

export interface CreateInstructorProfileParamsDisplayName {
  display_name?: string | null;
  full_name: string;
}

/**
 * Resolve display_name for insert.
 * Returns the explicit value when provided, otherwise null.
 * We intentionally do NOT fallback to full_name because the partial unique
 * index uq_instructor_profiles_display_name would cause collisions when
 * multiple profiles share the same full_name.
 */
export function resolveDisplayNameForInsert(
  params: CreateInstructorProfileParamsDisplayName
): string | null {
  const { display_name } = params;
  if (display_name !== undefined && display_name !== null && display_name.trim() !== '') return display_name;
  return null;
}
