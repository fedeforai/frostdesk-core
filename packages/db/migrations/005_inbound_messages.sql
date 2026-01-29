-- Inbound Messages Table
-- Scope: persist inbound messages in readable, normalized form
-- Mode: append-only, observability and future human review
-- 
-- WHAT THIS TABLE DOES:
-- - Persists inbound messages in readable form
-- - Links messages to an EXISTING conversation_id
-- - Preserves original raw payload for audit
-- - Enables chronological inspection
--
-- WHAT THIS TABLE DOES NOT DO:
-- - Does NOT create conversations
-- - Does NOT resolve identities
-- - Does NOT trigger routing
-- - Does NOT imply message handling
-- - Does NOT generate replies
-- - Does NOT introduce AI or automation

CREATE TABLE IF NOT EXISTS inbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL,
    conversation_id UUID NOT NULL,
    external_message_id TEXT NOT NULL,
    sender_identity TEXT NOT NULL,
    message_type TEXT NOT NULL,
    message_text TEXT,
    raw_payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT inbound_messages_channel_external_id_unique
        UNIQUE (channel, external_message_id)
);

-- Notes:
-- - No foreign keys (explicitly avoided)
-- - No triggers
-- - No indexes beyond primary key and uniqueness constraint
-- - Append-only design (no UPDATE or DELETE operations)
-- - conversation_id must already exist (not validated by this table)
