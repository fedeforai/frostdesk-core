/**
 * Dev-only startup check: fail fast if core tables are missing.
 * Skips in production unless STARTUP_SCHEMA_CHECK=true.
 */
import { sql } from '@frostdesk/db';

const RUN_CHECK =
  process.env.NODE_ENV !== 'production' || process.env.STARTUP_SCHEMA_CHECK === 'true';

export async function runStartupSchemaCheck(): Promise<void> {
  if (!RUN_CHECK) return;

  type Row = { services: string | null; profiles: string | null };
  const rows = await sql<Row[]>`
    SELECT
      to_regclass('public.instructor_services')::text AS services,
      to_regclass('public.instructor_profiles')::text AS profiles
  `;
  const r = rows[0];
  if (!r) {
    console.error('❌ Startup schema check: no row from DB.');
    process.exit(1);
  }
  const missing: string[] = [];
  if (!r.services) missing.push('public.instructor_services');
  if (!r.profiles) missing.push('public.instructor_profiles');
  if (missing.length > 0) {
    console.error('');
    console.error('❌ Startup schema check failed: missing table(s):', missing.join(', '));
    console.error('   Apply migrations to your Supabase Cloud DB (e.g. supabase db push or run migration SQL).');
    console.error('   See docs/DB_POOLER_DEV.md and supabase/migrations/20260217120000_instructor_profiles_and_services.sql');
    console.error('');
    process.exit(1);
  }
}
