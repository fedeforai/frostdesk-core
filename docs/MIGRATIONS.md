# Database Migrations

## Source of truth

**Production schema is driven exclusively by `supabase/migrations/`.**

Files in `packages/db/migrations/` are legacy/reference and are NOT applied in production.
All new migrations must be created in `supabase/migrations/` with timestamped names
(format: `YYYYMMDDHHMMSS_description.sql`).

## Rules

1. **Idempotent**: Use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.
2. **No duplicates**: Never commit files with spaces or numbered suffixes
   (e.g., `file 2.sql`, `file 20.sql`). These are macOS Finder artifacts.
3. **Additive only**: Prefer additive changes (add column, add index) over destructive
   ones (drop column, drop table). If destructive, document the rollback.
4. **Test on staging first**: Apply new migrations to the staging Supabase project
   before production.

## Applying migrations

```bash
# Via Supabase CLI (recommended)
supabase db push

# Or via Supabase dashboard: Database → Migrations
```

## Legacy migrations

`packages/db/migrations/` contains early-stage migrations (001_init through 018).
These were used before the Supabase migration system was adopted.
They remain in the repo for reference but should NOT be applied to production.
