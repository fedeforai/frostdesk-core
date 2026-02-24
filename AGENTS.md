# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

FrostDesk is an AI-powered customer support / CRM platform for driving instructors. It is a **pnpm monorepo** (pnpm v10.29.3 via corepack) with TypeScript throughout. See `package.json` `scripts` for the full list of run commands.

### Key services

| Service | Package | Dev command | Port |
|---------|---------|-------------|------|
| API (Fastify) | `apps/api` | `pnpm --filter @frostdesk/api dev` | 3001 |
| Admin (Next.js 14) | `apps/admin` | `pnpm dev:admin` | 3000 |
| Instructor (Next.js 14) | `apps/instructor` | `pnpm dev:instructor` | 3000 |
| Web (Vite + React) | `apps/web` | `pnpm dev:web` | 5173 |
| Worker | `apps/worker` | `pnpm --filter @frostdesk/worker dev` | — |

### Library packages (must be built before the API)

```
pnpm --filter @frostdesk/ai build
pnpm --filter @frostdesk/db build
```

These produce `dist/` output consumed by `apps/api`. Rebuild after changing `packages/ai` or `packages/db` source.

### Running lint

- **Admin**: `pnpm --filter @frostdesk/admin lint` (requires `.eslintrc.json` in `apps/admin`)
- **Instructor**: `pnpm --filter @frostdesk/instructor lint`
- The instructor app has pre-existing lint errors (import restrictions, unescaped entities, hook rule violations).

### Running tests

- **API**: `pnpm --filter @frostdesk/api test` (vitest). 12 failures in `bookings.test.ts` are pre-existing (402 PILOT_ONLY gating).
- **DB**: `pnpm --filter @frostdesk/db test` (vitest). Some pre-existing failures.
- Root `pnpm test` is a placeholder (`echo 'Add test scripts'`).

### Environment variables

The API loads `.env` from several candidate paths (see `apps/api/src/loadEnv.ts`). A root-level `.env` file is the simplest approach. Key required vars:

- `DATABASE_URL` — required at import time by `packages/db/src/client.ts` (throws if absent)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — required for Supabase client
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required by Next.js frontends
- `AI_EMERGENCY_DISABLE=true` — disables AI when no OpenAI key is available

Without real Supabase credentials, the API starts and responds to `/health` but DB-dependent routes will fail.

### Generating .env files

The environment secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` are injected as shell environment variables. You must write **two** files:

**1. Root `.env`** — consumed by the API via `apps/api/src/loadEnv.ts`:

```bash
cat > /workspace/.env << ENVEOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL=$DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:3001
AI_EMERGENCY_DISABLE=true
META_WHATSAPP_TOKEN=placeholder
META_WHATSAPP_PHONE_NUMBER_ID=placeholder
META_VERIFY_TOKEN=placeholder
ENVEOF
```

**2. Next.js app `.env.local` files** — Next.js reads `.env.local` from each app's own directory, NOT the workspace root. The `NEXT_PUBLIC_*` variables must be present at Next.js startup (they are inlined at build/dev time). Create these for each frontend you want to run:

```bash
# Admin
cat > /workspace/apps/admin/.env.local << ENVEOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:3001
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENVEOF

# Instructor (if needed)
cat > /workspace/apps/instructor/.env.local << ENVEOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:3001
ENVEOF
```

**Critical**: If you only create the root `.env`, the API will work but the Next.js frontends' Supabase browser client (`getSupabaseBrowser()`) will return `null` and login forms won't submit. Always create the per-app `.env.local` files too.

### Non-obvious caveats

- **Admin app ESLint**: The admin app does not ship with an `.eslintrc.json`. You must create one (e.g. `{"extends": "next/core-web-vitals"}`) and install `eslint@8` + `eslint-config-next@14` as devDependencies for `pnpm --filter @frostdesk/admin lint` to work.
- **Instructor and Admin ports**: Both default to port 3000. Run only one at a time, or use the `dev:3002` script for the instructor app on port 3002. If port 3000 is occupied, Next.js will auto-increment to 3001, then 3002, etc.
- **postgres client is lazy**: `packages/db/src/client.ts` validates `DATABASE_URL` exists at import time but the actual TCP connection happens on first query, so placeholder values let the API start.
- **pnpm onlyBuiltDependencies**: Configured in `pnpm-workspace.yaml` to allow `esbuild` postinstall. Other build scripts may need `pnpm approve-builds` (interactive) — avoid in CI.
- **Starting services**: Start the API first (`pnpm --filter @frostdesk/api dev`), then any frontend. The admin frontend proxies API calls through `/api/*` routes to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).
- **Webhook verification**: `GET /webhook?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=test` returns the challenge value — useful for quick connectivity checks without auth.
- **Test admin credentials**: `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` secrets are available but may not correspond to a registered Supabase auth user. Verify credentials work with a direct Supabase auth call before relying on browser login: `curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"'$TEST_ADMIN_EMAIL'","password":"'$TEST_ADMIN_PASSWORD'"}'`
- **Database query via service role**: To verify DB connectivity without auth, use `curl -s "$SUPABASE_URL/rest/v1/<table>?select=*&limit=5" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`.
