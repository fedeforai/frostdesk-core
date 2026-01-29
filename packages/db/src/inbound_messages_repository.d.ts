export interface InboundMessage {
    id: string;
    channel: string;
    conversation_id: string;
    external_message_id: string;
    sender_identity: string;
    message_type: string;
    message_text: string | null;
    raw_payload: any;
    received_at: string;
    created_at: string;
}
export interface InsertInboundMessageParams {
    channel: string;
    conversation_id: string;
    external_message_id: string;
    sender_identity: string;
    message_type: string;
    message_text: string | null;
    raw_payload: any;
    received_at: string;
}
/**
 * Inserts a new inbound message.
 *
 * WHAT IT DOES:
 * - INSERTs new inbound message with all provided fields
 * - Relies on UNIQUE (channel, external_message_id) constraint
 * - Returns inserted row id
 * - Throws on uniqueness violation (channel + external_message_id already exists)
 *
 * WHAT IT DOES NOT DO:
 * - No UPDATE
 * - No DELETE
 * - No UPSERT
 * - No conversation creation
 * - No identity resolution
 * - No routing
 * - No side effects
 */
export declare function insertInboundMessage(params: InsertInboundMessageParams): Promise<string>;
/**
 * Finds an inbound message by external message ID.
 *
 * WHAT IT DOES:
 * - SELECTs message by (channel, external_message_id)
 * - Returns message row or null if not found
 * - Used for idempotency checks
 *
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing
 * - No side effects
 * - No state mutations
 */
export declare function findInboundMessageByExternalId(channel: string, externalMessageId: string): Promise<InboundMessage | null>;
/**
 * Lists inbound messages for a conversation.
 *
 * WHAT IT DOES:
 * - SELECTs messages by conversation_id
 * - Orders by received_at ASC (chronological)
 * - Supports optional limit and cursor-based pagination
 * - Returns messages in chronological order
 *
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing
 * - No processing
 * - No side effects
 * - No state mutations
 */
export declare function listInboundMessagesByConversation(conversationId: string, limit?: number, cursor?: string): Promise<InboundMessage[]>;
//# sourceMappingURL=inbound_messages_repository.d.ts.map