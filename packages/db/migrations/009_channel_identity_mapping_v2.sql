-- Channel Identity Mapping (RALPH-SAFE)
-- Scope: map external channel identities to internal conversation ids
-- Mode: deterministic, minimal, auditable, pilot-safe
--
-- WHAT THIS MIGRATION DOES:
-- - Creates channel_identity_mapping table with FK to conversations
-- - Enforces unique (channel, customer_identifier)
-- - Minimal indexes (only unique constraint)
--
-- WHAT THIS MIGRATION DOES NOT DO:
-- - No modifications to existing tables
-- - No triggers
-- - No additional indexes beyond unique constraint
-- - No automation

CREATE TABLE IF NOT EXISTS channel_identity_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    channel TEXT NOT NULL,
    customer_identifier TEXT NOT NULL,
    
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT channel_identity_mapping_unique
        UNIQUE (channel, customer_identifier)
);

-- Notes:
-- - Foreign key ensures referential integrity
-- - ON DELETE CASCADE: if conversation is deleted, mapping is deleted
-- - Unique constraint prevents duplicate mappings
-- - No additional indexes (minimal approach)
