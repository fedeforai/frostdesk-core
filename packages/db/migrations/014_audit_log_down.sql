-- Rollback: drop audit_log table and indexes.

DROP INDEX IF EXISTS idx_audit_log_created_at_desc;
DROP INDEX IF EXISTS idx_audit_log_actor_id;
DROP INDEX IF EXISTS idx_audit_log_entity_type_entity_id;
DROP TABLE IF EXISTS audit_log;
