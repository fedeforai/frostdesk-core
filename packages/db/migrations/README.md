# Database migrations

Apply in **numeric order** by filename: `001_*` → `002_*` → … → `017_*`.

- If your runner uses alphabetical order, this folder is already correct.
- If you run "only latest" or a custom set, ensure **017_audit_log.sql** is included (required for `public.audit_log`; API audit writes fail otherwise).
- If you use a migrations table, record each applied filename so 017 is not skipped.

**Verification after applying 017:**

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'audit_log'
);
-- Expected: true
```
