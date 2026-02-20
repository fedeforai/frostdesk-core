# FrostDesk Core

Customer support platform with AI-powered ticket management.

## Structure

- `apps/web` - Frontend application
- `apps/api` - Backend API server
- `packages/shared` - Shared utilities and types
- `docs` - Documentation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
# Start web app
npm run dev:web

# Start API server
npm run dev:api

# Start all services
npm run dev
```

### Local Runbook

From repo root (pnpm, no global installs):

```bash
# Install (frozen lockfile)
corepack enable && pnpm install --frozen-lockfile

# Build db + ai + api (required before start:api)
pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/ai build && pnpm build:api

# Start API
pnpm start:api
```

Next.js apps (admin, instructor) — build then start:

```bash
pnpm build:instructor && pnpm start:instructor   # instructor
pnpm build:admin && pnpm start:admin               # admin
pnpm build:web && pnpm start:web                   # web (Vite)
```

Dev (no build needed): `pnpm dev:instructor`, `pnpm dev:admin`, `pnpm dev:web`, or `pnpm dev` for db+api.

### Environment Setup

Copy `.env.example` to `.env` and fill in your credentials.

Required for WhatsApp outbound (approve draft / manual send):

- `META_WHATSAPP_TOKEN` — Meta Cloud API access token
- `META_WHATSAPP_PHONE_NUMBER_ID` — Phone number ID for sending
- `META_VERIFY_TOKEN` — Token for Meta webhook GET verification (optional if not using legacy `/webhook`)

### Runbook: WhatsApp flow (smoke test)

Flow: **inbound → inbox → approve or manual send → delivered**.

1. **Inbound:** Send a WhatsApp message to the business number. It appears in Human Inbox (POST `/webhook/whatsapp` persists it; draft may be generated).
2. **Inbox:** Open Admin → Human Inbox → select the conversation.
3. **Approve or send:** If there is an AI draft, click *Approve draft*. Otherwise, type a message and use *Manual send*.
4. **Delivered:** Confirm on the customer phone that the message was received.

**How to verify (local):** Use a test number and valid `META_WHATSAPP_TOKEN` / `META_WHATSAPP_PHONE_NUMBER_ID`. Trigger approve or manual send; check API returns 200 and client receives the message. Invalid token → API returns 502, no silent success.

**How to verify (real phone):** Send a message from the customer phone to the business number → open Human Inbox → approve draft or send manually → confirm delivery on the same phone.

### Deployment (runbook snippets)

**Railway — API**

- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/api build`
- Start: `node apps/api/dist/index.js`
- Root directory: repo root (or leave empty so lockfile is at root).

**Vercel — web / admin / instructor (one project per app)**

- Root directory: `./` (repo root) so `pnpm-lock.yaml` and `vercel.json` are used.
- Install: do not override (use repo `vercel.json` with `installCommand: "true"` so install runs in Build).
- Build (example instructor): `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/instructor build`
- Output directory: `apps/instructor/.next` (or `apps/admin/.next`, or `apps/web/dist` for web). Start is handled by Vercel (Next/Vite).

## Documentation

See `docs/` for architecture, PRD, and definition of done.
