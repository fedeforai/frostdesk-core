import { sql } from './client.js';
/**
 * Retrieves a feature flag by key, environment, and optionally tenant ID.
 *
 * Rules:
 * - SELECT only (read-only)
 * - No implicit fallback
 * - Returns null if flag does not exist
 *
 * @param key - Feature flag key
 * @param env - Environment (dev | staging | prod)
 * @param tenantId - Optional tenant ID for tenant-specific flags
 * @returns Feature flag or null if not found
 */
export async function getFeatureFlag(key, env, tenantId) {
    let result;
    if (tenantId) {
        // If tenantId provided: match tenant-specific flag OR global flag (tenant_id IS NULL)
        // ORDER BY ensures tenant-specific takes precedence
        result = await sql `
      SELECT key, enabled, env, tenant_id, updated_at
      FROM feature_flags
      WHERE key = ${key}
        AND env = ${env}
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      ORDER BY tenant_id DESC NULLS LAST
      LIMIT 1
    `;
    }
    else {
        // If no tenantId: only match global flags (tenant_id IS NULL)
        result = await sql `
      SELECT key, enabled, env, tenant_id, updated_at
      FROM feature_flags
      WHERE key = ${key}
        AND env = ${env}
        AND tenant_id IS NULL
      LIMIT 1
    `;
    }
    return result.length > 0 ? result[0] : null;
}
//# sourceMappingURL=feature_flag_repository.js.map