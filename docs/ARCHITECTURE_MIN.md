# FrostDesk MVP Architecture

## System Overview

Three-tier architecture: API (Fastify) handles HTTP/webhooks, Worker (Node.js) processes AI jobs via queue, Postgres (Supabase) as single source of truth. WhatsApp webhooks → API → Queue → Worker → DB. UI subscribes to DB changes for real-time updates.

## Components

**API (apps/api)**
- Fastify server on port 3000
- POST /inbound: receives WhatsApp webhooks, validates, enqueues AI job
- GET /health: liveness check
- No business logic, minimal validation only

**Worker (apps/worker)**
- Processes queue jobs: generate AI response, create bookings
- Calls OpenAI API for message generation
- Writes results directly to Postgres
- Retries on failure (3 attempts, exponential backoff)

**Queue**
- In-memory queue (BullMQ or pg-boss) for MVP
- Job payload: { conversation_id, message_id, message_text }
- Single queue: "ai-processing"

**Database (Supabase Postgres)**
- conversations: id, created_at
- messages: id, conversation_id, role, content, created_at
- bookings: id, conversation_id, instructor_id, date, time, duration, status, created_at
- Single instructor_id = 1 (hardcoded for MVP)

**WhatsApp Integration**
- Webhook endpoint receives POST from WhatsApp Business API
- Extracts message text, conversation_id from webhook payload
- No WhatsApp SDK in critical path (webhook only)

**UI (future)**
- Subscribes to Supabase Realtime for conversations/messages/bookings tables
- Displays conversation history and booking status
- No server-side rendering (static or SPA)

## Data Model

```
conversations
  id (uuid, pk)
  created_at (timestamptz)

messages
  id (uuid, pk)
  conversation_id (uuid, fk → conversations.id)
  role (text: 'user' | 'assistant')
  content (text)
  created_at (timestamptz)

bookings
  id (uuid, pk)
  conversation_id (uuid, fk → conversations.id)
  instructor_id (int, default 1)
  date (date)
  time (time)
  duration (int, minutes)
  status (text: 'pending' | 'confirmed' | 'cancelled')
  created_at (timestamptz)
```

## Message Flow

1. Customer sends WhatsApp message
2. WhatsApp Business API → POST /inbound webhook
3. API validates payload, extracts text and conversation_id
4. API creates message record in DB (role='user')
5. API enqueues job: { conversation_id, message_id, message_text }
6. Worker picks up job from queue
7. Worker calls OpenAI API with conversation history (last 10 messages)
8. OpenAI returns assistant response
9. Worker creates message record (role='assistant')
10. Worker parses response for booking intent (regex or simple NLP)
11. If booking detected: Worker creates booking record (status='pending')
12. Worker sends response to WhatsApp via API (webhook callback)
13. UI updates automatically via Supabase Realtime subscription

## Booking State Machine

```
pending → confirmed (instructor approves)
pending → cancelled (instructor rejects)
confirmed → cancelled (instructor cancels)
```

Transitions:
- AI creates booking as 'pending'
- Instructor manually confirms/cancels via UI (future) or API
- No automatic state changes in MVP

## Failure Modes & Recovery

**WhatsApp webhook failure:**
- API returns 500, WhatsApp retries (3x)
- Duplicate message detection: check message_id or content hash
- Idempotent message insertion

**Queue job failure:**
- Worker retries 3x with exponential backoff
- After max retries: log error, mark job as failed
- Manual reprocessing via admin endpoint (future)

**OpenAI API failure:**
- Worker catches error, retries job
- If persistent: log conversation_id for manual review
- No partial state: either full success or rollback

**DB connection loss:**
- Connection pool retries automatically
- Worker pauses on DB errors, resumes when connection restored
- No message loss: queue persists jobs

## What is Intentionally Deferred

- Calendar integration (manual availability rules)
- Payment processing (manual confirmation only)
- Multi-instructor support
- Email/SMS channels
- Advanced AI features (context memory, multi-turn reasoning)
- Admin dashboard (CLI tools for MVP)
- Booking modification/cancellation via WhatsApp
- Customer authentication
- Analytics/reporting
- Edge Functions (all logic in Node.js services)
