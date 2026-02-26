# Secrets and Environment Variables

## Golden rules

1. **Never commit secrets to the repository.** `.env` and `.env.local` are in `.gitignore`.
2. **Production secrets live in platform UI only** (Railway for API, Vercel for frontends).
3. **Debug flags must never be enabled in production** (see below).

## Where secrets are set

| Service | Platform | UI location |
|---------|----------|-------------|
| API (Fastify) | Railway | Project → Service → Variables |
| Admin (Next.js) | Vercel | Project → Settings → Environment Variables |
| Instructor (Next.js) | Vercel | Project → Settings → Environment Variables |
| Database | Supabase | Project → Settings → API / Database |

## Required variables (production)

### API (Railway)

| Variable | Source | Required |
|----------|--------|----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string | **Critical** |
| `SUPABASE_URL` | Supabase → Settings → API → URL | **Critical** |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | **Critical** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | **Critical** |
| `META_WHATSAPP_TOKEN` | Meta Developer Console → WhatsApp → API Setup | **Critical** |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → Phone Numbers | **Critical** |
| `META_APP_SECRET` | Meta Developer Console → App → Settings → Basic | **Critical** |
| `META_VERIFY_TOKEN` | Your chosen string (must match Meta webhook config) | **Critical** |
| `SENTRY_DSN` | Sentry → Project → Settings → Client Keys | Recommended |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing secret | For billing |
| `OPENAI_API_KEY` | OpenAI Dashboard → API keys | For AI features |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | For calendar |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials | For calendar |

### Next.js apps (Vercel)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_API_URL` | Railway API URL (e.g., `https://api.frostdesk.it`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side error tracking |

## Debug flags (NEVER in production)

| Flag | Purpose | Production |
|------|---------|------------|
| `ALLOW_DEBUG_USER` | Bypasses admin auth for testing | **Must be unset or `0`** |
| `SKIP_WHATSAPP_SIGNATURE_VERIFY` | Bypasses webhook signature check | **Must be unset or `0`** |
| `AI_EMERGENCY_DISABLE` | Disables AI globally | Set to `true` only during incidents |

## Startup checks

The API server runs startup checks in production (`NODE_ENV=production`):
- Verifies all critical env vars are set
- Ensures debug flags are not enabled
- Exits with error if checks fail (fail-closed)

See `apps/api/src/lib/startup_checks.ts`.

## Rotation

When rotating secrets:
1. Set the new secret in the platform UI
2. Redeploy the service
3. Verify with smoke test (health check, webhook test)
4. Remove the old secret from the provider (e.g., regenerate in Meta/Stripe)
