import {
  findChannelIdentityMapping,
  insertChannelIdentityMapping,
} from '../../db/src/channel_identity_mapping_repository.js';

export class ChannelIdentityMappingExistsError extends Error {
  constructor(channel: string, externalIdentity: string) {
    super(`Channel identity mapping already exists: ${channel}:${externalIdentity}`);
    this.name = 'ChannelIdentityMappingExistsError';
  }
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
export async function createChannelIdentityMapping(
  channel: string,
  externalIdentity: string,
  conversationId: string
): Promise<string> {
  const existing = await findChannelIdentityMapping(channel, externalIdentity);

  if (existing !== null) {
    throw new ChannelIdentityMappingExistsError(channel, externalIdentity);
  }

  return insertChannelIdentityMapping(channel, externalIdentity, conversationId);
}
