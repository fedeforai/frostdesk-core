-- Create whatsapp_inbound_raw table
CREATE TABLE IF NOT EXISTS whatsapp_inbound_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  sender_id TEXT,
  message_id TEXT,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false
);
