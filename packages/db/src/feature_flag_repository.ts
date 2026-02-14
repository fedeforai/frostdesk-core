import { createDbClient } from './supabase_client.js';
import { sql } from './client.js';

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
