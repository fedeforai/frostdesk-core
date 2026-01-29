-- Channel Identity Mapping
-- Scope: map external channel identities to internal conversation ids
-- Mode: deterministic, minimal, auditable

CREATE TABLE IF NOT EXISTS channel_identity_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    channel TEXT NOT NULL,
    external_identity TEXT NOT NULL,

    conversation_id UUID NOT NULL,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT channel_identity_unique
        UNIQUE (channel, external_identity)
);

-- Notes:
-- - No foreign keys (explicitly avoided)
-- - No triggers
-- - No indexes beyond primary key and uniqueness constraint
-- - last_seen_at must be updated explicitly by application code (no automation)
