# Landing (integrated in Instructor app) — Env

When the Instructor app is used as the main site (e.g. frostdesk.ai) and serves the landing at `/` and `/[lang]`, set these in addition to the usual Instructor env:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_URL` | Base URL for the site (e.g. `https://frostdesk.ai`). Used for metadata, Stripe redirect URLs, and auth callbacks. |
| `STRIPE_SECRET_KEY` | Stripe API key (create-checkout and webhook). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. Configure the webhook in Stripe with URL `https://<your-domain>/api/stripe/webhook` and event `checkout.session.completed`. |

Ensure the Supabase `waitlist` table exists and matches the schema in `apps/landing/docs/SUPABASE_SCHEMA.sql` (e.g. columns: name, email, phone, resort, instructor_type, languages, experience, high_season_weeks, lang, deposit_paid, stripe_session_id, status, updated_at).
