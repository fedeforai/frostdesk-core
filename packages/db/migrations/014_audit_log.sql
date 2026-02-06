-- Audit log: append-only trail for admin actions and critical lifecycle events.
-- No updates/deletes from application code.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL,
  actor_id TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  request_id TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  payload JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type_entity_id ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON audit_log (created_at DESC);
