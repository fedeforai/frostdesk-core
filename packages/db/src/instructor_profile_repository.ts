import { sql } from './client.js';
import { resolveDisplayNameForInsert } from './instructor_profile_utils.js';

export interface InstructorProfile {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
  /** Additional languages (table column languages text[]). */
  languages?: string[];
  onboarding_completed_at?: string | null;
  display_name?: string | null;
  slug?: string | null;
  /** IANA timezone (e.g. Europe/Rome). Present when column exists. */
  timezone?: string | null;
  /** JSONB; present when selected (e.g. getInstructorProfileByUserId). */
  marketing_fields?: Record<string, unknown>;
  /** JSONB; present when selected (e.g. getInstructorProfileByUserId). */
  operational_fields?: Record<string, unknown>;
}

export interface UpdateInstructorProfileParams {
  instructorId: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

export interface CreateInstructorProfileParams {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
  /** Optional; fallback to full_name or '' for DB. Draft-friendly: omit for incomplete profiles. */
  display_name?: string | null;
}

export interface UpdateInstructorProfileByUserIdParams {
  userId: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

/** Extended update: 4 scalars + optional languages, display_name, slug, timezone + optional JSONB (shallow merge when provided). */
export interface UpdateInstructorProfileByUserIdExtendedParams {
  userId: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
  languages?: string[];
  display_name?: string | null;
  slug?: string | null;
  timezone?: string | null;
  marketing_fields?: Record<string, unknown>;
  operational_fields?: Record<string, unknown>;
}

/**
 * Retrieves instructor profile by ID.
 * 
 * @param instructorId - Instructor ID
 * @returns Instructor profile or null if not found
 */
export async function getInstructorProfile(
  instructorId: string
): Promise<InstructorProfile | null> {
  const result = await sql<(InstructorProfile & { onboarding_completed_at: string | null })[]>`
    SELECT 
      id,
      full_name,
      base_resort,
      working_language,
      contact_email,
      onboarding_completed_at,
      timezone
    FROM instructor_profiles
    WHERE id = ${instructorId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Updates instructor profile.
 * 
 * @param params - Update parameters
 * @returns Updated instructor profile
 */
export async function updateInstructorProfile(
  params: UpdateInstructorProfileParams
): Promise<InstructorProfile> {
  const { instructorId, full_name, base_resort, working_language, contact_email } = params;

  const result = await sql<InstructorProfile[]>`
    UPDATE instructor_profiles
    SET 
      full_name = ${full_name},
      base_resort = ${base_resort},
      working_language = ${working_language},
      contact_email = ${contact_email},
      updated_at = NOW()
    WHERE id = ${instructorId}
    RETURNING 
      id,
      full_name,
      base_resort,
      working_language,
      contact_email
  `;

  if (result.length === 0) {
    throw new Error(`Instructor profile not found: ${instructorId}`);
  }

  return result[0];
}

/**
 * Retrieves instructor profile by auth user ID.
 * Prefers user_id column (migration 20260220120000); falls back to id = userId if column missing or no row.
 * Includes marketing_fields and operational_fields when the table has those columns.
 */
export async function getInstructorProfileByUserId(
  userId: string
): Promise<InstructorProfile | null> {
  try {
    const byUserId = await sql<(InstructorProfile & { onboarding_completed_at: string | null })[]>`
      SELECT id, full_name, base_resort, working_language, contact_email, onboarding_completed_at,
             display_name, slug,
             timezone,
             COALESCE(languages, ARRAY[]::text[]) AS languages,
             COALESCE(marketing_fields, '{}'::jsonb) AS marketing_fields,
             COALESCE(operational_fields, '{}'::jsonb) AS operational_fields
      FROM instructor_profiles
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    if (byUserId.length > 0) return byUserId[0];
  } catch {
    // user_id or jsonb/languages columns may not exist yet; fall through to id lookup
  }
  const legacy = await getInstructorProfile(userId);
  if (!legacy) return null;
  return { ...legacy, languages: [], marketing_fields: {}, operational_fields: {} };
}

/**
 * Creates an instructor profile. Minimal insert; display_name optional (fallback full_name or '').
 * Draft-friendly: omit display_name for incomplete profiles (DB allows NULL).
 */
export async function createInstructorProfile(
  params: CreateInstructorProfileParams
): Promise<InstructorProfile> {
  const { id, full_name, base_resort, working_language, contact_email } = params;
  const displayNameValue = resolveDisplayNameForInsert({
    display_name: params.display_name,
    full_name: params.full_name,
  });
  const result = await sql<InstructorProfile[]>`
    INSERT INTO instructor_profiles (id, full_name, base_resort, working_language, contact_email, display_name)
    VALUES (${id}::uuid, ${full_name}, ${base_resort}, ${working_language}, ${contact_email}, ${displayNameValue})
    RETURNING id, full_name, base_resort, working_language, contact_email
  `;
  if (result.length === 0) throw new Error('Insert failed');
  return result[0];
}

/**
 * Updates instructor profile by auth user ID (instructor_profiles.id = userId).
 */
export async function updateInstructorProfileByUserId(
  params: UpdateInstructorProfileByUserIdParams
): Promise<InstructorProfile> {
  return updateInstructorProfile({
    instructorId: params.userId,
    full_name: params.full_name,
    base_resort: params.base_resort,
    working_language: params.working_language,
    contact_email: params.contact_email,
  });
}

/** Shallow merge: existing keys kept, incoming keys added/overwritten. */
function shallowMerge(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
  return { ...base, ...incoming };
}

/**
 * Extended update by user_id: 4 scalars + optional marketing_fields/operational_fields.
 * When provided, JSONB columns are shallow-merged (existing then incoming). Omitted keys are left unchanged.
 */
export async function updateInstructorProfileByUserIdExtended(
  params: UpdateInstructorProfileByUserIdExtendedParams
): Promise<InstructorProfile> {
  const {
    userId,
    full_name,
    base_resort,
    working_language,
    contact_email,
    languages: languagesIn,
    display_name: displayNameIn,
    slug: slugIn,
    timezone: timezoneIn,
    marketing_fields: marketingFieldsIn,
    operational_fields: operationalFieldsIn,
  } = params;

  const hasMarketing = marketingFieldsIn !== undefined && typeof marketingFieldsIn === 'object' && marketingFieldsIn !== null && !Array.isArray(marketingFieldsIn);
  const hasOperational = operationalFieldsIn !== undefined && typeof operationalFieldsIn === 'object' && operationalFieldsIn !== null && !Array.isArray(operationalFieldsIn);
  const hasLanguages = Array.isArray(languagesIn);
  const hasDisplayName = displayNameIn !== undefined;
  const hasSlug = slugIn !== undefined;
  const hasTimezone = timezoneIn !== undefined;

  if (!hasMarketing && !hasOperational && !hasLanguages && !hasDisplayName && !hasSlug && !hasTimezone) {
    const updated = await updateInstructorProfileByUserId({
      userId,
      full_name,
      base_resort,
      working_language,
      contact_email,
    });
    return { ...updated, languages: [], marketing_fields: {}, operational_fields: {} };
  }

  try {
    type Row = InstructorProfile & { onboarding_completed_at: string | null; marketing_fields?: Record<string, unknown>; operational_fields?: Record<string, unknown> };
    const current = await sql<Row[]>`
      SELECT id, full_name, base_resort, working_language, contact_email, onboarding_completed_at,
             display_name, slug,
             timezone,
             COALESCE(languages, ARRAY[]::text[]) AS languages,
             COALESCE(marketing_fields, '{}'::jsonb) AS marketing_fields,
             COALESCE(operational_fields, '{}'::jsonb) AS operational_fields
      FROM instructor_profiles
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    if (current.length === 0) throw new Error(`Instructor profile not found: user_id=${userId}`);

    const cur = current[0];
    const mergedMarketing = hasMarketing ? shallowMerge(cur.marketing_fields, marketingFieldsIn as Record<string, unknown>) : (cur.marketing_fields ?? {});
    const mergedOperational = hasOperational ? shallowMerge(cur.operational_fields, operationalFieldsIn as Record<string, unknown>) : (cur.operational_fields ?? {});
    const languagesFinal = hasLanguages ? languagesIn : (cur.languages ?? []);
    const displayNameFinal = hasDisplayName ? displayNameIn : (cur.display_name ?? null);
    const slugFinal = hasSlug ? slugIn : (cur.slug ?? null);
    const timezoneFinal = hasTimezone ? timezoneIn : (cur.timezone ?? null);

    const result = await sql<Row[]>`
      UPDATE instructor_profiles
      SET
        full_name = ${full_name},
        base_resort = ${base_resort},
        working_language = ${working_language},
        contact_email = ${contact_email},
        updated_at = NOW(),
        display_name = ${displayNameFinal ?? cur.display_name ?? null},
        slug = ${slugFinal},
        timezone = ${timezoneFinal},
        languages = ${hasLanguages ? languagesFinal : (cur.languages ?? [])}::text[],
        marketing_fields = ${JSON.stringify(mergedMarketing)}::jsonb,
        operational_fields = ${JSON.stringify(mergedOperational)}::jsonb
      WHERE user_id = ${userId}::uuid
      RETURNING id, full_name, base_resort, working_language, contact_email, onboarding_completed_at,
                display_name, slug,
                timezone,
                COALESCE(languages, ARRAY[]::text[]) AS languages,
                COALESCE(marketing_fields, '{}'::jsonb) AS marketing_fields,
                COALESCE(operational_fields, '{}'::jsonb) AS operational_fields
    `;
    if (result.length === 0) throw new Error(`Instructor profile not found: user_id=${userId}`);
    return result[0];
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) throw e;
    const updated = await updateInstructorProfileByUserId({
      userId,
      full_name,
      base_resort,
      working_language,
      contact_email,
    });
    return { ...updated, languages: [], marketing_fields: {}, operational_fields: {} };
  }
}

/**
 * Marks onboarding as completed for the given instructor.
 * Sets onboarding_completed_at, onboarding_status and profile_status so the app (requireInstructorAccess) sees gate 'ready' and keeps user on dashboard.
 */
export async function completeInstructorOnboarding(instructorId: string): Promise<void> {
  await sql`
    UPDATE instructor_profiles
    SET
      onboarding_completed_at = NOW(),
      onboarding_status = 'completed',
      profile_status = 'active',
      updated_at = NOW()
    WHERE id = ${instructorId}::uuid
  `;
}
