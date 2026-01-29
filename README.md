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

## Documentation

See `docs/` for architecture, PRD, and definition of done.
