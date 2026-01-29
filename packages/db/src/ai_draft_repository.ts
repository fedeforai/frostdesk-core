import { sql } from './client.js';

export interface AIDraftMetadata {
  text: string;
  model: string;
  created_at: string;
  prompt_version: string;
  snapshot_id?: string; // Optional: explicit linkage to AI snapshot
}

export async function saveAIDraft(params: {
  conversationId: string;
  text: string;
  model: string;
  created_at: string;
}): Promise<AIDraftMetadata> {
  const { conversationId, text, model, created_at } = params;

  const existing = await sql<Array<{
    value: AIDraftMetadata;
  }>>`
    SELECT value
    FROM message_metadata
    WHERE conversation_id = ${conversationId}
      AND key = 'ai_draft'
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].value;
  }

  const draftMetadata: AIDraftMetadata = {
    text,
    model,
    created_at,
    prompt_version: 'v1',
  };

  await sql`
    INSERT INTO message_metadata (conversation_id, key, value)
    VALUES (
      ${conversationId},
      'ai_draft',
      ${JSON.stringify(draftMetadata)}::jsonb
    )
  `;

  return draftMetadata;
}

export async function getAIDraftMetadata(conversationId: string): Promise<AIDraftMetadata | null> {
  const existing = await sql<Array<{
    value: AIDraftMetadata;
  }>>`
    SELECT value
    FROM message_metadata
    WHERE conversation_id = ${conversationId}
      AND key = 'ai_draft'
    LIMIT 1
  `;

  return existing.length > 0 ? existing[0].value : null;
}

/**
 * Finds AI draft by message_id (read-only).
 * 
 * Used for idempotency checks: determines if a draft already exists
 * for a specific message before attempting to create one.
 * 
 * @param message_id - Message UUID
 * @returns Draft metadata or null if not found
 */
export async function findDraftByMessageId(message_id: string): Promise<AIDraftMetadata | null> {
  const existing = await sql<Array<{
    value: AIDraftMetadata;
  }>>`
    SELECT value
    FROM message_metadata
    WHERE message_id = ${message_id}::uuid
      AND key = 'ai_draft'
    LIMIT 1
  `;

  return existing.length > 0 ? existing[0].value : null;
}

/**
 * Inserts AI draft once (idempotent by message_id).
 * 
 * Guarantees at most one draft per message_id:
 * - If draft exists for message_id, returns existing draft (no overwrite)
 * - If draft does not exist, creates new draft with snapshot_id linkage
 * 
 * This prevents duplicate drafts on webhook retries and ensures
 * explicit audit trail via snapshot_id.
 * 
 * @param params - Draft creation parameters
 * @returns Draft metadata (existing or newly created)
 */
export async function insertDraftOnce(params: {
  message_id: string;
  snapshot_id: string;
  text: string;
  model: string;
  created_at: string;
}): Promise<AIDraftMetadata> {
  const { message_id, snapshot_id, text, model, created_at } = params;

  // Check if draft already exists (idempotency guard)
  const existing = await findDraftByMessageId(message_id);
  if (existing) {
    return existing;
  }

  // Create new draft with snapshot_id linkage
  const draftMetadata: AIDraftMetadata = {
    text,
    model,
    created_at,
    prompt_version: 'v1',
    snapshot_id, // Explicit linkage to AI snapshot
  };

  await sql`
    INSERT INTO message_metadata (message_id, key, value)
    VALUES (
      ${message_id}::uuid,
      'ai_draft',
      ${JSON.stringify(draftMetadata)}::jsonb
    )
  `;

  return draftMetadata;
}
