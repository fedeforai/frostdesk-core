# Environment Variables — Platform Audit

Complete mapping of which env vars must be set on each platform.

## Railway (API — `apps/api`)

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `DATABASE_URL` | **Critical** | Supabase → Settings → Database → Connection string |
| `SUPABASE_URL` | **Critical** | Supabase → Settings → API → URL |
| `SUPABASE_ANON_KEY` | **Critical** | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical** | Supabase → Settings → API → service_role key |
| `OPENAI_API_KEY` | **Required** | OpenAI → API keys |
| `META_WHATSAPP_TOKEN` | **Required** | Meta Developer Console → WhatsApp → API Setup |
| `META_WHATSAPP_PHONE_NUMBER_ID` | **Required** | Meta Developer Console → WhatsApp → Phone Numbers |
| `META_VERIFY_TOKEN` | **Required** | Your chosen string (must match Meta webhook config) |
| `META_APP_SECRET` | **Required** | Meta Developer Console → App → Settings → Basic → App Secret |
| `STRIPE_SECRET_KEY` | For billing | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe Dashboard → Webhooks → Signing secret |
| `STRIPE_PRICE_ID` | For subscriptions | Stripe Dashboard → Products → Price ID |
| `INSTRUCTOR_APP_URL` | For Stripe | `https://www.frostdesk.ai` |
| `INSTRUCTOR_APP_ORIGIN` | For CORS | `https://www.frostdesk.ai` |
| `ADMIN_APP_ORIGIN` | For CORS | `https://admin.frostdesk.ai` |
| `GOOGLE_CLIENT_ID` | For calendar | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | For calendar | Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | For calendar | `https://www.frostdesk.ai/api/instructor/calendar/oauth/callback` |
| `SENTRY_DSN` | Recommended | Sentry → Project → Settings → Client Keys |
| `PILOT_INSTRUCTOR_IDS` | For pilot | Comma-separated UUIDs |
| `DEFAULT_INSTRUCTOR_ID` | Optional | UUID of default instructor |
| `NODE_ENV` | Auto | `production` (Railway sets this) |

## Vercel — Instructor App (`apps/instructor`)

| Variable | Required | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Critical** | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Critical** | Same as `SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_API_URL` | **Critical** | Railway API URL (e.g., `https://frostdesk-api-production.up.railway.app`) |
| `SUPABASE_SERVICE_ROLE_KEY` | For server routes | Same as Railway |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Sentry DSN |

## Vercel — Admin App (`apps/admin`)

| Variable | Required | Value |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Critical** | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Critical** | Same as `SUPABASE_ANON_KEY` |
| `NEXT_PUBLIC_API_URL` | **Critical** | Railway API URL |
| `ADMIN_REPORTS_CRON_SECRET` | For reports | `openssl rand -hex 32` (same on Railway) |
| `CRON_SECRET` | For Vercel cron | Set in Vercel project settings |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Sentry DSN |

## Meta Developer Console (webhook config)

| Setting | Value |
|---------|-------|
| **Webhook URL** | `https://<RAILWAY-URL>/webhook/whatsapp` (NOT frostdesk.ai!) |
| **Verify token** | Same string as `META_VERIFY_TOKEN` on Railway |
| **Subscribed fields** | `messages` |

**CRITICAL**: The webhook URL must point to the **Railway API**, not to the Vercel instructor app.
The instructor app at `frostdesk.ai` is a Next.js frontend — it does NOT handle webhook POST requests.

## Google Cloud Console (Calendar OAuth)

| Setting | Value |
|---------|-------|
| **OAuth Client type** | Web application |
| **Authorized redirect URIs** | `https://www.frostdesk.ai/api/instructor/calendar/oauth/callback` |
| **Scopes** | `https://www.googleapis.com/auth/calendar.events` |

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` on Railway.

## Stripe Dashboard

| Setting | Value |
|---------|-------|
| **Webhook endpoint URL** | `https://<RAILWAY-URL>/webhook/stripe` |
| **Events to listen** | `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, `account.updated` |

## Quick diagnostic commands

```bash
# Check API health
curl https://<RAILWAY-URL>/health

# Check webhook verification (should echo challenge)
curl "https://<RAILWAY-URL>/webhook?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=test"

# Check if instructor app can reach API
curl https://www.frostdesk.ai/api/health
```
