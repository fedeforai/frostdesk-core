export declare class ChannelIdentityMappingExistsError extends Error {
    constructor(channel: string, externalIdentity: string);
}
/**
 * Creates a channel identity mapping explicitly.
 *
 * WHAT IT DOES:
 * - Checks if mapping already exists (explicit check)
 * - Fails explicitly if mapping exists (no silent fallback)
 * - INSERTs new mapping with provided channel, external_identity, conversation_id
 * - Returns inserted mapping id on success
 * - Requires explicit conversation_id (must already exist)
 *
 * WHAT IT DOES NOT DO:
 * - No auto-create of mappings
 * - No inference of conversation_id
 * - No routing
 * - No AI calls
 * - No silent fallback if mapping exists
 * - No retries
 * - No conversation creation
 * - No validation of conversation_id existence
 * - No side effects beyond database INSERT
 */
export declare function createChannelIdentityMapping(channel: string, externalIdentity: string, conversationId: string): Promise<string>;
//# sourceMappingURL=channel_identity_mapping_creator.d.ts.map