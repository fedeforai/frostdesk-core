-- Dashboard query indexes: speed up admin comprehensive dashboard queries that filter
-- by created_at / updated_at or by key + created_at. Use IF NOT EXISTS for idempotency.

-- conversations: today's counts (DATE(created_at) = CURRENT_DATE → range scan)
CREATE INDEX IF NOT EXISTS idx_conversations_created_at
  ON public.conversations (created_at);

-- messages: today's counts and direction filters
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at);

-- bookings: today created/updated counts
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON public.bookings (created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at
  ON public.bookings (updated_at);

-- message_metadata: ai_draft / ai_draft_error / webhook_error by key and date
CREATE INDEX IF NOT EXISTS idx_message_metadata_key_created_at
  ON public.message_metadata (key, created_at);

-- audit_log: already has idx_audit_log_created_at_desc; add (action, created_at) for action filters
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created_at
  ON public.audit_log (action, created_at DESC);
