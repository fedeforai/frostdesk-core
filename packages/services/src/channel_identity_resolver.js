import { findChannelIdentityMapping } from '../../db/src/channel_identity_mapping_repository.js';
/**
 * Resolves a channel identity to a conversation_id.
 *
 * WHAT IT DOES:
 * - Calls repository SELECT to find existing mapping
 * - Returns explicit resolution result:
 *   - If mapping exists: { status: "mapped", conversation_id: string }
 *   - If mapping does NOT exist: { status: "unmapped" }
 * - Provides deterministic, explicit resolution logic
 *
 * WHAT IT DOES NOT DO:
 * - No DB writes (INSERT/UPDATE)
 * - No conversation creation
 * - No mapping creation
 * - No routing
 * - No AI calls
 * - No automation
 * - No inference
 * - No state mutations
 * - No side effects
 */
export async function resolveChannelIdentity(channel, externalIdentity) {
    const mapping = await findChannelIdentityMapping(channel, externalIdentity);
    if (mapping === null) {
        return {
            status: 'unmapped',
        };
    }
    return {
        status: 'mapped',
        conversation_id: mapping.conversation_id,
    };
}
//# sourceMappingURL=channel_identity_resolver.js.map