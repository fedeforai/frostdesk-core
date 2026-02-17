/**
 * Repository for definitive instructor profile: full row by user_id, PATCH with JSONB merge, reviews, assets.
 * All lookups by instructor_id are scoped; never trust client-provided instructor_id for auth.
 */

import { sql } from './client.js';
import type {
  InstructorProfileDefinitive,
  InstructorAsset,
  InstructorReviewDefinitive,
  MarketingFields,
  OperationalFields,
  PricingConfig,
  AiConfigProfile,
  Compliance,
  PatchProfileBody,
} from './instructor_profile_definitive_domain.js';

type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string;
  slug: string | null;
  profile_status: string;
  timezone: string;
  availability_mode: string;
  calendar_sync_enabled: boolean;
  marketing_fields: MarketingFields;
  operational_fields: OperationalFields;
  pricing_config: PricingConfig;
  ai_config: AiConfigProfile;
  compliance: Compliance;
  approval_status: string;
  risk_score: number;
  internal_notes: string | null;
  account_health: string;
  fraud_flag: boolean;
  billing_status: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_plan?: string | null;
  created_at: string;
  updated_at: string;
  base_resort?: string;
  working_language?: string;
  contact_email?: string;
  onboarding_completed_at?: string | null;
};

function rowToDefinitive(r: ProfileRow): InstructorProfileDefinitive {
  return {
    id: r.id,
    user_id: r.user_id,
    full_name: r.full_name,
    display_name: r.display_name,
    slug: r.slug,
    profile_status: r.profile_status as InstructorProfileDefinitive['profile_status'],
    timezone: r.timezone,
    availability_mode: r.availability_mode as InstructorProfileDefinitive['availability_mode'],
    calendar_sync_enabled: r.calendar_sync_enabled,
    marketing_fields: r.marketing_fields ?? {},
    operational_fields: r.operational_fields ?? {},
    pricing_config: r.pricing_config ?? {},
    ai_config: r.ai_config ?? {},
    compliance: r.compliance ?? {},
    approval_status: r.approval_status as InstructorProfileDefinitive['approval_status'],
    risk_score: r.risk_score ?? 0,
    internal_notes: r.internal_notes,
    account_health: r.account_health as InstructorProfileDefinitive['account_health'],
    fraud_flag: r.fraud_flag ?? false,
    billing_status: r.billing_status as InstructorProfileDefinitive['billing_status'],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Deep-merge two objects (for JSONB). Arrays and primitives from patch replace.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const p = patch[key];
    if (p === undefined) continue;
    const b = out[key];
    if (
      typeof p === 'object' &&
      p !== null &&
      !Array.isArray(p) &&
      typeof b === 'object' &&
      b !== null &&
      !Array.isArray(b)
    ) {
      (out as Record<string, unknown>)[key as string] = deepMerge(
        b as Record<string, unknown>,
        p as Record<string, unknown>
      );
    } else {
      (out as Record<string, unknown>)[key as string] = p;
    }
  }
  return out;
}

/** Response shape for GET profile: definitive + legacy fields for backward compatibility. */
export type InstructorProfileDefinitiveRow = InstructorProfileDefinitive & {
  base_resort?: string | null;
  working_language?: string | null;
  contact_email?: string | null;
  onboarding_completed_at?: string | null;
};

/**
 * Get full instructor profile by auth user_id (for GET /instructor/profile).
 * Returns null if no profile. Uses columns added in definitive schema migration.
 * Includes legacy base_resort, working_language, contact_email, onboarding_completed_at when present.
 */
export async function getInstructorProfileDefinitiveByUserId(
  userId: string
): Promise<InstructorProfileDefinitiveRow | null> {
  try {
    const rows = await sql<ProfileRow[]>`
      SELECT
        id,
        user_id,
        full_name,
        COALESCE(display_name, full_name, '') AS display_name,
        slug,
        COALESCE(profile_status, 'draft') AS profile_status,
        COALESCE(timezone, 'Europe/Rome') AS timezone,
        COALESCE(availability_mode, 'manual') AS availability_mode,
        COALESCE(calendar_sync_enabled, false) AS calendar_sync_enabled,
        COALESCE(marketing_fields, '{}'::jsonb) AS marketing_fields,
        COALESCE(operational_fields, '{}'::jsonb) AS operational_fields,
        COALESCE(pricing_config, '{}'::jsonb) AS pricing_config,
        COALESCE(ai_config, '{}'::jsonb) AS ai_config,
        COALESCE(compliance, '{}'::jsonb) AS compliance,
        COALESCE(approval_status, 'pending') AS approval_status,
        COALESCE(risk_score, 0) AS risk_score,
        internal_notes,
        COALESCE(account_health, 'ok') AS account_health,
        COALESCE(fraud_flag, false) AS fraud_flag,
        COALESCE(billing_status, 'pilot') AS billing_status,
        created_at,
        updated_at,
        base_resort,
        working_language,
        contact_email,
        onboarding_completed_at
      FROM instructor_profiles
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...rowToDefinitive(row),
      base_resort: row.base_resort ?? null,
      working_language: row.working_language ?? null,
      contact_email: row.contact_email ?? null,
      onboarding_completed_at: row.onboarding_completed_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Patch instructor profile by user_id. Scalar fields replace; JSONB fields deep-merge.
 */
export async function patchInstructorProfileByUserId(
  userId: string,
  body: PatchProfileBody
): Promise<InstructorProfileDefinitiveRow | null> {
  const current = await getInstructorProfileDefinitiveByUserId(userId);
  if (!current) return null;

  const full_name = body.full_name ?? current.full_name;
  const display_name = body.display_name ?? current.display_name;
  const slug = body.slug !== undefined ? body.slug : current.slug;
  const profile_status = body.profile_status ?? current.profile_status;
  const timezone = body.timezone ?? current.timezone;
  const availability_mode = body.availability_mode ?? current.availability_mode;
  const calendar_sync_enabled = body.calendar_sync_enabled ?? current.calendar_sync_enabled;
  const marketing_fields = body.marketing_fields
    ? deepMerge(current.marketing_fields, body.marketing_fields)
    : current.marketing_fields;
  const operational_fields = body.operational_fields
    ? deepMerge(current.operational_fields, body.operational_fields)
    : current.operational_fields;
  const pricing_config = body.pricing_config
    ? deepMerge(current.pricing_config, body.pricing_config)
    : current.pricing_config;
  const ai_config = body.ai_config
    ? deepMerge(current.ai_config, body.ai_config)
    : current.ai_config;
  const compliance = body.compliance
    ? deepMerge(current.compliance, body.compliance)
    : current.compliance;

  const result = await sql<ProfileRow[]>`
    UPDATE instructor_profiles
    SET
      full_name = ${full_name},
      display_name = ${display_name},
      slug = ${slug},
      profile_status = ${profile_status},
      timezone = ${timezone},
      availability_mode = ${availability_mode},
      calendar_sync_enabled = ${calendar_sync_enabled},
      marketing_fields = ${JSON.stringify(marketing_fields)}::jsonb,
      operational_fields = ${JSON.stringify(operational_fields)}::jsonb,
      pricing_config = ${JSON.stringify(pricing_config)}::jsonb,
      ai_config = ${JSON.stringify(ai_config)}::jsonb,
      compliance = ${JSON.stringify(compliance)}::jsonb,
      updated_at = now()
    WHERE user_id = ${userId}::uuid
    RETURNING
      id, user_id, full_name, display_name, slug, profile_status, timezone, availability_mode, calendar_sync_enabled,
      marketing_fields, operational_fields, pricing_config, ai_config, compliance, approval_status, risk_score, internal_notes, account_health, fraud_flag, billing_status, created_at, updated_at,
      base_resort, working_language, contact_email, onboarding_completed_at
  `;
  if (result.length === 0) return current;
  const row = result[0];
  return {
    ...rowToDefinitive(row),
    base_resort: row.base_resort ?? null,
    working_language: row.working_language ?? null,
    contact_email: row.contact_email ?? null,
    onboarding_completed_at: row.onboarding_completed_at ?? null,
  };
}

/** List reviews for an instructor (by instructor_id). */
export async function listInstructorReviews(
  instructorId: string
): Promise<InstructorReviewDefinitive[]> {
  try {
    const rows = await sql<{
      id: string;
      instructor_id: string;
      source: string;
      rating: number;
      title: string | null;
      body: string | null;
      reviewer_name: string | null;
      occurred_at: string | null;
      created_at: string;
    }[]>`
      SELECT id, instructor_id, COALESCE(source, 'internal') AS source, rating,
             title, body, reviewer_name, occurred_at::text AS occurred_at, created_at
      FROM instructor_reviews
      WHERE instructor_id = ${instructorId}::uuid
      ORDER BY created_at DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      instructor_id: r.instructor_id,
      source: r.source as InstructorReviewDefinitive['source'],
      rating: r.rating,
      title: r.title,
      body: r.body ?? null,
      reviewer_name: r.reviewer_name,
      occurred_at: r.occurred_at,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

/** List assets for an instructor (by instructor_id). Returns [] if table missing or error. */
export async function listInstructorAssets(
  instructorId: string
): Promise<InstructorAsset[]> {
  try {
    const rows = await sql<{
      id: string;
      instructor_id: string;
      kind: string;
      storage_path: string;
      mime_type: string | null;
      meta: Record<string, unknown>;
      created_at: string;
    }[]>`
      SELECT id, instructor_id, kind, storage_path, mime_type, COALESCE(meta, '{}'::jsonb) AS meta, created_at
      FROM instructor_assets
      WHERE instructor_id = ${instructorId}::uuid
      ORDER BY created_at DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      instructor_id: r.instructor_id,
      kind: r.kind as InstructorAsset['kind'],
      storage_path: r.storage_path,
      mime_type: r.mime_type,
      meta: r.meta ?? {},
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}
