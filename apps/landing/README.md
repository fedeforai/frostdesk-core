# FrostDesk Landing

Production-ready multilingual conversion landing for FrostDesk (Next.js 14 App Router, Tailwind, Framer Motion, Supabase, Stripe). RALPH-safe: deterministic flows, explicit state, no hidden side effects in UI.

## Features

- **Multilingual:** EN, IT, FR, DE via `/[lang]` (e.g. `/en`, `/it`).
- **Hero A/B test:** Variants A/B with `localStorage` persistence and `ab_variant_assigned` / `hero_variant_*_view` events.
- **Sections:** Problem, Solution cards, How it works, Value stack, FAQ, CTA, Deposit block, Waitlist form.
- **Waitlist:** React Hook Form + Zod → `POST /api/waitlist` → redirect to thank-you; event `waitlist_submit`.
- **Stripe deposit:** Optional €99 pre-launch deposit; `POST /api/stripe/create-checkout` → Stripe Checkout → success/cancel pages; webhook updates `waitlist.deposit_paid` and `status = 'deposit_paid'`; events `deposit_checkout_started`, `deposit_checkout_completed`.
- **Login:** Supabase magic link; auth callback sets session and redirects.
- **Onboarding gate:** Only `status in ('invited','active')` can access `/[lang]/onboarding`; else redirect to `/[lang]/waitlist?reason=gate`.
- **Analytics:** `lib/analytics.ts` — `trackEvent(name, payload)`; integrate with gtag/Plausible in the app.

## Quick start

```bash
# From repo root
pnpm dev:landing
```

App runs at **http://localhost:3003**. Root `/` redirects to `/en`.

## Env

Copy `.env.example` to `.env.local` (in `apps/landing` or repo root, depending on your Next env loading). Required:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for API routes and webhook)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL` (e.g. `http://localhost:3003` or production URL)

See `docs/STRIPE_SETUP.md` and `docs/SUPABASE_SCHEMA.sql`.

## Deploy (Vercel)

- Set env in Vercel project.
- Webhook URL: `https://<your-domain>/api/stripe/webhook` (event `checkout.session.completed`).
- Run Supabase schema from `docs/SUPABASE_SCHEMA.sql` so `waitlist` table exists with `deposit_paid`, `stripe_session_id`, `status`.
