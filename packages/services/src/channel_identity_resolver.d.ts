export interface ChannelIdentityResolution {
    status: 'mapped' | 'unmapped';
    conversation_id?: string;
}
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
export declare function resolveChannelIdentity(channel: string, externalIdentity: string): Promise<ChannelIdentityResolution>;
//# sourceMappingURL=channel_identity_resolver.d.ts.map