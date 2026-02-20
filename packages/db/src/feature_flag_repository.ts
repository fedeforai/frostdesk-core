import { createDbClient } from './supabase_client.js';
import { sql } from './client.js';

/** Keys that can be updated from the admin UI. */
const ALLOWED_FLAG_KEYS = ['ai_enabled', 'ai_whatsapp_enabled'] as const;
export type AdminFeatureFlagKey = (typeof ALLOWED_FLAG_KEYS)[number];

function isAllowedKey(key: string): key is AdminFeatureFlagKey {
  return ALLOWED_FLAG_KEYS.includes(key as AdminFeatureFlagKey);
}

type Env = 'dev' | 'staging' | 'prod';

/** Sentinel UUID for global (non-tenant) flags; PK does not allow NULL. */
const GLOBAL_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Retrieves a feature flag value.
 * 
 * Resolution rules (ORDERED, EXPLICIT):
 * 1. If exists (key, env, tenant_id = tenantId) → use that
 * 2. Else if exists (key, env, tenant_id = GLOBAL_TENANT_ID) → use that
 * 3. Else → false
 * 
 * @param key - Feature flag key
 * @param env - Environment (dev | staging | prod)
 * @param tenantId - Optional tenant ID for tenant-specific flags
 * @returns true if feature is enabled, false otherwise
 */
export async function getFeatureFlag(
  key: string,
  env: Env,
  tenantId?: string
): Promise<boolean> {
  const db = createDbClient();

  // 1️⃣ tenant-specific override
  if (tenantId) {
    const { data, error } = await db
      .from('feature_flags')
      .select('enabled')
      .eq('key', key)
      .eq('env', env)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data.enabled;
    }
  }

  // 2️⃣ global flag (sentinella UUID; PK non ammette NULL)
  const { data, error } = await db
    .from('feature_flags')
    .select('enabled')
    .eq('key', key)
    .eq('env', env)
    .eq('tenant_id', GLOBAL_TENANT_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data.enabled;
  }

  // 3️⃣ default OFF
  return false;
}

/**
 * Checks if a feature flag is enabled.
 *
 * PILOT STUB: All feature flags disabled by default.
 * No database queries to avoid blocking API boot.
 *
 * @param key - Feature flag key
 * @param context - Optional context (unused in stub)
 * @returns false (all features disabled during pilot)
 */
export async function isFeatureEnabled(
  key: string,
  context?: Record<string, any>
): Promise<boolean> {
  // PILOT STUB: all feature flags disabled
  return false;
}

/**
 * Sets a feature flag (admin-only). Only ai_enabled and ai_whatsapp_enabled are allowed.
 * Uses raw sql so it updates the same rows read by the comprehensive dashboard.
 *
 * @param key - Must be 'ai_enabled' or 'ai_whatsapp_enabled'
 * @param enabled - New value
 * @returns Updated enabled value
 * @throws Error if key is not allowed
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean
): Promise<{ key: string; enabled: boolean }> {
  if (!isAllowedKey(key)) {
    throw new Error(`Feature flag key not allowed: ${key}`);
  }
  const rows = await sql<Array<{ key: string; enabled: boolean }>>`
    UPDATE feature_flags
    SET enabled = ${enabled}, updated_at = NOW()
    WHERE key = ${key}
    RETURNING key, enabled
  `;
  if (rows.length === 0) {
    throw new Error(`Feature flag not found: ${key}`);
  }
  return rows[0];
}
