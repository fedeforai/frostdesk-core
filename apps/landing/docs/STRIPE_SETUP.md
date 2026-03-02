# Stripe setup for FrostDesk Landing

## 1. Create product (optional in Dashboard)

You can create the product in Dashboard or let the API create it via `price_data` (current implementation uses inline price_data, no product ID needed).

- **Name:** FrostDesk Early Access Deposit
- **Price:** €99.00 one-time (9900 cents)
- **Currency:** EUR

## 2. Environment variables

- `STRIPE_SECRET_KEY` — Secret key (sk_live_... or sk_test_...)
- `STRIPE_WEBHOOK_SECRET` — Signing secret for the webhook (whsec_...)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Publishable key (optional; used if you add client-side Stripe later)
- `NEXT_PUBLIC_BASE_URL` — Base URL of the landing app (e.g. https://frostdesk.com) for redirects

## 3. Webhook

1. In Stripe Dashboard → Developers → Webhooks, add endpoint:
   - **URL:** `https://<your-landing-domain>/api/stripe/webhook`
   - **Events:** `checkout.session.completed`
2. Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

## 4. Flow

- User clicks "Reserve My Spot" → `POST /api/stripe/create-checkout` → redirect to Stripe Checkout.
- On success Stripe redirects to `/[lang]/deposit-success`.
- On cancel to `/[lang]/deposit-cancel`.
- Stripe sends `checkout.session.completed` to your webhook; the handler updates `waitlist.deposit_paid` and `waitlist.stripe_session_id` by matching `customer_email`.

## 5. Vercel

Ensure the webhook URL uses your production domain. For local testing use Stripe CLI:

```bash
stripe listen --forward-to localhost:3003/api/stripe/webhook
```

Use the printed webhook secret as `STRIPE_WEBHOOK_SECRET` locally.
