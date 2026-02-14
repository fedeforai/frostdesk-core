# Supabase Cloud dev — schema sync and verification

Apply migrations to your always-on Supabase Cloud DB so `/api/instructor/services` returns 200 (or 403 if onboarding required), not 500.

## 1) Apply migrations — preferred: Supabase CLI

Link the repo to your Cloud project, then push migrations (no local Supabase/Docker).

```bash
# From repo root. Install Supabase CLI if needed: https://supabase.com/docs/guides/cli
cd /Users/federiconovello/Desktop/frostdesk-core

# Link to your Cloud project (you need project ref from Dashboard → Settings → General)
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations in supabase/migrations/ to the linked DB
supabase db push
```

Expected: `Applying migration ...` for each file; `Finished supabase db push.`

## 2) Apply migrations — alternative: psql with DATABASE_URL

If you don't use Supabase CLI, run the migration SQL with a direct Postgres connection. Ensure `DATABASE_URL` uses the pooler and `sslmode=require`.

```bash
cd /Users/federiconovello/Desktop/frostdesk-core

# Load env (repo root .env or apps/api/.env)
export $(grep -v '^#' .env | xargs)

# Run the migration that creates instructor_profiles + instructor_services
psql "$DATABASE_URL" -f supabase/migrations/20260217120000_instructor_profiles_and_services.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX`, `DO` with no errors. If `instructor_profiles` or `instructor_services` already exist, `IF NOT EXISTS` keeps it safe.

To run all migrations in order (only if your DB is empty or you know what’s already applied):

```bash
for f in supabase/migrations/*.sql; do echo "=== $f ==="; psql "$DATABASE_URL" -f "$f" || exit 1; done
```

## 3) Verify

- **Debug endpoint (dev only):**  
  `GET http://localhost:3001/debug/info`  
  Should return `schemaCheck: { instructor_services: true, instructor_profiles: true }` and `databaseHost` matching your pooler.

- **Instructor services:**  
  - `GET http://localhost:3012/api/instructor/services` — 200 (with list) or 403 if onboarding required; not 500.  
  - `POST http://localhost:3012/api/instructor/services` with valid JWT and body — creates a service.

## 4) If still failing — 3 things to check

1. **Project mismatch** — Instructor app and API must use the same Supabase project (same `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` and keys). `DATABASE_URL` must point to that project’s DB (pooler).
2. **Wrong DATABASE_URL** — API must use the pooler URL (e.g. `aws-1-eu-west-1.pooler.supabase.com`) with `sslmode=require`. Check `GET /debug/info` → `databaseHost`.
3. **Migrations not pushed** — Either run `supabase db push` or apply `20260217120000_instructor_profiles_and_services.sql` via psql. After restart, API startup will fail in dev if core tables are missing.

## 5) Verification script (6-line bash)

Run from repo root. Load env first: `set -a && source .env && set +a` (or export DATABASE_URL).

```bash
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL not set"; exit 1; }
echo "DB host: $(echo "$DATABASE_URL" | sed -n 's|@\([^/]*\)/.*|\1|p')"
psql "$DATABASE_URL" -t -c "SELECT to_regclass('public.instructor_services')::text, to_regclass('public.instructor_profiles')::text;"
pnpm --filter api dev &
sleep 4 && PORT=3012 pnpm --filter @frostdesk/instructor dev &
sleep 8 && curl -s -w "\nHTTP %{http_code}\n" http://localhost:3012/api/instructor/services
```

1–2: env + DB host. 3: schema check. 4–5: start API then instructor (background). 6: curl instructor services (expect 200 or 403, not 500).
