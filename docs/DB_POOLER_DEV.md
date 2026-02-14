# DATABASE_URL: use pooler in dev

## Symptom and cause

**Symptom:** `GET /admin/check` returns 500 `ADMIN_CHECK_DB_ERROR` with message `getaddrinfo ENOTFOUND db.<ref>.supabase.co`.

**Cause:** The API’s `DATABASE_URL` points at the direct DB host `db.<ref>.supabase.co`. On many networks that host does not resolve (DNS failure). The **pooler** host `aws-1-eu-west-1.pooler.supabase.com` resolves reliably — use it in `.env` for local dev.

## Correct format

In the **.env file that the API loads** (see startup log `loadedEnvPath`; usually repo root `.env` or `apps/api/.env`), set:

```bash
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Replace:

- `<PROJECT_REF>` — your Supabase project reference (e.g. `fggheegqtghedvibisma`), from Supabase Dashboard → Project Settings → General.
- `<PASSWORD>` — your database password (Supabase Dashboard → Project Settings → Database).

Example (with placeholder password):

```bash
DATABASE_URL="postgresql://postgres.fggheegqtghedvibisma:YOUR_DB_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

## zsh and `!` in password

If your password contains `!`, in a **.env file** you can usually leave it unquoted or use double quotes; the bang is not interpreted by the shell when dotenv reads the file.

If you set `DATABASE_URL` **in the terminal** (e.g. `export DATABASE_URL=...`), zsh may interpret `!` as history expansion. To avoid that:

- Use single quotes so the whole value is literal:  
  `export DATABASE_URL='postgresql://postgres.REF:PASS@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require'`
- Or use double quotes and escape the bang:  
  `export DATABASE_URL="postgresql://...PASS\!...postgres?sslmode=require"`

Prefer editing the `.env` file and restarting the API so the process gets the value from the file.

**Copy-paste safe (zsh, password with `!`):** use single quotes so the value is literal:

```bash
export DATABASE_URL='postgresql://postgres.fggheegqtghedvibisma:frostdesk2025!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require'
```

## Verify

After changing `.env` and restarting the API:

```bash
# Process on 3001 should show pooler host, not db.*.supabase.co
PID="$(lsof -ti tcp:3001 | head -n 1)"
ps eww -p "$PID" | tr ' ' '\n' | rg "DATABASE_URL"
```

You should see `pooler.supabase.com` in the value, not `db.fggheegqtghedvibisma.supabase.co`.

## Startup guard

In **development**, if `DATABASE_URL` still contains `db.` and `supabase.co`, the API logs an error and **exits with code 1** so the wrong URL is never used. In **production** it only logs a warning and continues.

## Verification (run after starting API)

1. Start the API with the pooler env (from repo root):
   ```bash
   pnpm api:dev
   ```
2. Health check must return 200:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health
   ```
   Expected: `200`
3. Admin check with a valid JWT must not return 500 `ADMIN_CHECK_DB_ERROR` due to ENOTFOUND:
   ```bash
   curl -i "http://127.0.0.1:3001/admin/check" -H "Authorization: Bearer $TOKEN"
   ```
   Expected: 200 if user is in `admin_users`, or 403 `ADMIN_ONLY` if not — never 500 with `getaddrinfo ENOTFOUND db....supabase.co`.
