export interface PersistInboundMessageParams {
    channel: string;
    conversation_id: string;
    external_message_id: string;
    sender_identity: string;
    message_type: string;
    message_text: string | null;
    raw_payload: any;
    received_at: string;
}
export interface PersistInboundMessageResult {
    status: 'inserted' | 'already_exists';
    message_id: string;
}
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
export declare function persistInboundMessage(params: PersistInboundMessageParams): Promise<PersistInboundMessageResult>;
//# sourceMappingURL=inbound_message_persistence_service.d.ts.map