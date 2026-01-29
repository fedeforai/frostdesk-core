import { insertInboundMessage, findInboundMessageByExternalId, } from '../../db/src/inbound_messages_repository.js';
/**
 * Persists an inbound message with explicit idempotency check.
 *
 * WHAT IT DOES:
 * - Checks if message already exists via findInboundMessageByExternalId()
 * - If exists → returns { status: "already_exists", message_id: string }
 * - If not exists → INSERTs new message and returns { status: "inserted", message_id: string }
 * - Accepts all required fields as explicit inputs
 * - Performs explicit idempotency check before INSERT
 * - Returns deterministic result based on message existence
 *
 * WHAT IT DOES NOT DO:
 * - No routing logic
 * - No message processing
 * - No AI calls
 * - No automation
 * - No retries
 * - No conversation creation
 * - No identity resolution
 * - No side effects beyond DB INSERT
 * - No UPDATE or DELETE operations
 */
export async function persistInboundMessage(params) {
    const existing = await findInboundMessageByExternalId(params.channel, params.external_message_id);
    if (existing !== null) {
        return {
            status: 'already_exists',
            message_id: existing.id,
        };
    }
    const messageId = await insertInboundMessage(params);
    return {
        status: 'inserted',
        message_id: messageId,
    };
}
//# sourceMappingURL=inbound_message_persistence_service.js.map