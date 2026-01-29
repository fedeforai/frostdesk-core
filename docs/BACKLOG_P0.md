# FrostDesk P0 Backlog

## Epic 1: Database Schema

### Task 1.1: Create bookings table migration
**Goal:** Add bookings table to store booking records
**Files/Areas:** `packages/db/migrations/002_bookings.sql`
**Acceptance Criteria:**
- Table has: id, conversation_id, instructor_id, date, time, duration, status, created_at
- Foreign key to conversations table
- Status enum: 'pending', 'confirmed', 'cancelled'
- Index on conversation_id and date
**Test/Verification:** Migration runs successfully, table exists in DB

### Task 1.2: Add booking helper functions
**Goal:** Create DB functions for booking operations
**Files/Areas:** `packages/db/src/bookings.ts`, `packages/db/src/index.ts`
**Acceptance Criteria:**
- `createBooking()` function inserts booking record
- `getBookingsByConversation()` retrieves bookings for conversation
- Functions exported from index.ts
**Test/Verification:** Functions can be imported and called from API

## Epic 2: API Service

### Task 2.1: WhatsApp webhook endpoint
**Goal:** Create POST endpoint to receive WhatsApp webhooks
**Files/Areas:** `apps/api/src/routes/webhook.ts`, `apps/api/src/server.ts`
**Acceptance Criteria:**
- POST /webhook endpoint accepts WhatsApp payload
- Extracts message text and conversation_id from webhook format
- Returns 200 on success, 400 on invalid payload
**Test/Verification:** Curl test with sample WhatsApp webhook payload

### Task 2.2: Message persistence in webhook handler
**Goal:** Save incoming WhatsApp messages to DB
**Files/Areas:** `apps/api/src/routes/webhook.ts`
**Acceptance Criteria:**
- Creates conversation if conversation_id is new
- Inserts message with role='user' and content from webhook
- Returns conversation_id in response
**Test/Verification:** Message appears in messages table after webhook call

### Task 2.3: Queue job enqueueing
**Goal:** Enqueue AI processing job after message saved
**Files/Areas:** `apps/api/src/routes/webhook.ts`, `apps/api/src/queue.ts`
**Acceptance Criteria:**
- Creates queue job with { conversation_id, message_id, message_text }
- Job added to 'ai-processing' queue
- Returns 200 immediately (async processing)
**Test/Verification:** Job appears in queue after webhook call

### Task 2.4: Webhook signature validation
**Goal:** Verify WhatsApp webhook authenticity
**Files/Areas:** `apps/api/src/routes/webhook.ts`
**Acceptance Criteria:**
- Validates webhook signature using WhatsApp secret
- Rejects requests with invalid signatures
- Returns 401 on validation failure
**Test/Verification:** Invalid signature rejected, valid signature accepted

### Task 2.5: Duplicate message detection
**Goal:** Prevent processing duplicate WhatsApp messages
**Files/Areas:** `apps/api/src/routes/webhook.ts`
**Acceptance Criteria:**
- Checks for existing message with same content and conversation_id
- Skips processing if duplicate found
- Returns 200 with existing message_id
**Test/Verification:** Duplicate webhook calls don't create duplicate messages

## Epic 3: Queue System

### Task 3.1: Queue setup with BullMQ
**Goal:** Install and configure BullMQ for job processing
**Files/Areas:** `apps/api/package.json`, `apps/api/src/queue.ts`
**Acceptance Criteria:**
- BullMQ installed as dependency
- Queue instance created with Redis connection
- Queue named 'ai-processing'
**Test/Verification:** Queue instance can be imported and used

### Task 3.2: Job type definition
**Goal:** Define TypeScript interface for AI processing jobs
**Files/Areas:** `packages/shared/src/types.ts`, `apps/api/src/queue.ts`
**Acceptance Criteria:**
- Job payload type: { conversation_id: string, message_id: string, message_text: string }
- Type exported from shared package
**Test/Verification:** Type can be imported and used in API and worker

### Task 3.3: Queue connection configuration
**Goal:** Configure Redis connection for queue
**Files/Areas:** `apps/api/src/queue.ts`, `.env.example`
**Acceptance Criteria:**
- Reads REDIS_URL from environment
- Falls back to localhost:6379 for development
- Connection error handling
**Test/Verification:** Queue connects to Redis successfully

## Epic 4: Worker Service

### Task 4.1: Worker queue consumer setup
**Goal:** Worker listens to queue and processes jobs
**Files/Areas:** `apps/worker/src/index.ts`, `apps/worker/src/queue.ts`
**Acceptance Criteria:**
- Worker connects to same Redis queue
- Processes jobs from 'ai-processing' queue
- Logs job start and completion
**Test/Verification:** Worker picks up jobs from queue

### Task 4.2: Job retry logic
**Goal:** Retry failed jobs with exponential backoff
**Files/Areas:** `apps/worker/src/queue.ts`
**Acceptance Criteria:**
- Jobs retry up to 3 times on failure
- Exponential backoff: 1s, 2s, 4s
- Failed jobs logged with error details
**Test/Verification:** Failed job retries 3 times before final failure

### Task 4.3: Worker error handling
**Goal:** Handle errors gracefully without crashing worker
**Files/Areas:** `apps/worker/src/index.ts`
**Acceptance Criteria:**
- Uncaught errors logged and job marked as failed
- Worker continues processing other jobs
- Process doesn't crash on individual job failures
**Test/Verification:** Worker survives job failures and continues running

## Epic 5: AI Integration

### Task 5.1: OpenAI client setup
**Goal:** Initialize OpenAI client in worker
**Files/Areas:** `apps/worker/src/ai.ts`, `apps/worker/package.json`
**Acceptance Criteria:**
- OpenAI SDK installed
- Client initialized with API key from env
- Error handling for API failures
**Test/Verification:** OpenAI client can be instantiated

### Task 5.2: Conversation history retrieval
**Goal:** Fetch last 10 messages for conversation context
**Files/Areas:** `apps/worker/src/ai.ts`, `packages/db/src/messages.ts`
**Acceptance Criteria:**
- Function retrieves messages by conversation_id
- Returns last 10 messages ordered by created_at
- Formats messages for OpenAI prompt
**Test/Verification:** Returns correct message history for conversation

### Task 5.3: OpenAI prompt construction
**Goal:** Build prompt with conversation history and booking instructions
**Files/Areas:** `apps/worker/src/ai.ts`
**Acceptance Criteria:**
- Prompt includes system instructions for booking concierge
- Includes conversation history
- Includes availability rules (hardcoded for MVP)
**Test/Verification:** Prompt format is valid for OpenAI API

### Task 5.4: AI response generation
**Goal:** Call OpenAI API and get assistant response
**Files/Areas:** `apps/worker/src/ai.ts`
**Acceptance Criteria:**
- Calls OpenAI chat completion API
- Uses gpt-4 or gpt-3.5-turbo model
- Returns assistant message text
- Handles API errors and rate limits
**Test/Verification:** Returns valid assistant response text

### Task 5.5: Save assistant message to DB
**Goal:** Persist AI-generated response as message
**Files/Areas:** `apps/worker/src/ai.ts`
**Acceptance Criteria:**
- Creates message record with role='assistant'
- Links to conversation_id
- Stores AI response in content field
**Test/Verification:** Assistant message appears in messages table

## Epic 6: Booking Engine

### Task 6.1: Booking intent detection
**Goal:** Parse AI response to detect booking requests
**Files/Areas:** `apps/worker/src/bookings.ts`
**Acceptance Criteria:**
- Regex or simple NLP to detect booking keywords
- Extracts date, time, duration from text
- Returns structured booking data or null
**Test/Verification:** Detects booking intent from sample AI responses

### Task 6.2: Availability checking (simple rules)
**Goal:** Check if requested time slot is available
**Files/Areas:** `apps/worker/src/bookings.ts`
**Acceptance Criteria:**
- Hardcoded availability rules (e.g., 9am-5pm, Mon-Sat)
- Checks if requested date/time falls within rules
- Returns boolean: available or not
**Test/Verification:** Correctly identifies available vs unavailable slots

### Task 6.3: Booking creation from AI response
**Goal:** Create booking record when AI confirms booking
**Files/Areas:** `apps/worker/src/bookings.ts`
**Acceptance Criteria:**
- Creates booking with status='pending'
- Extracts date, time, duration from AI response
- Links booking to conversation_id
**Test/Verification:** Booking record created in DB with correct fields

### Task 6.4: Booking confirmation message format
**Goal:** Format booking details for WhatsApp response
**Files/Areas:** `apps/worker/src/bookings.ts`
**Acceptance Criteria:**
- Formats booking as readable text
- Includes date, time, duration, price
- Returns formatted string
**Test/Verification:** Booking details formatted correctly

## Epic 7: WhatsApp Integration

### Task 7.1: WhatsApp API client setup
**Goal:** Initialize WhatsApp Business API client
**Files/Areas:** `apps/worker/src/whatsapp.ts`, `apps/worker/package.json`
**Acceptance Criteria:**
- WhatsApp Business API SDK or HTTP client configured
- API token and phone number ID from env
- Error handling for API failures
**Test/Verification:** WhatsApp client can be instantiated

### Task 7.2: Send message to WhatsApp
**Goal:** Send assistant response back to customer via WhatsApp
**Files/Areas:** `apps/worker/src/whatsapp.ts`
**Acceptance Criteria:**
- Sends text message to conversation_id (phone number)
- Uses WhatsApp Business API send message endpoint
- Handles API errors and retries
**Test/Verification:** Message appears in WhatsApp conversation

### Task 7.3: WhatsApp message sending in worker flow
**Goal:** Integrate WhatsApp sending into worker job processing
**Files/Areas:** `apps/worker/src/index.ts`
**Acceptance Criteria:**
- After AI response saved, sends message via WhatsApp
- Sends booking confirmation if booking created
- Logs send success/failure
**Test/Verification:** Customer receives WhatsApp message after AI processing

## Epic 8: Realtime UI Wiring

### Task 8.1: Supabase Realtime subscription setup
**Goal:** Configure Realtime for conversations/messages/bookings tables
**Files/Areas:** `docs/REALTIME_SETUP.md` (future UI code)
**Acceptance Criteria:**
- Realtime enabled on conversations, messages, bookings tables
- RLS policies allow read access
- Subscription code structure documented
**Test/Verification:** Realtime connection established (manual test)

### Task 8.2: UI subscription to messages table
**Goal:** UI receives real-time updates when messages are created
**Files/Areas:** Future UI implementation
**Acceptance Criteria:**
- UI subscribes to messages table changes
- New messages appear in UI without refresh
- Conversation list updates automatically
**Test/Verification:** Message appears in UI immediately after DB insert

### Task 8.3: UI subscription to bookings table
**Goal:** UI receives real-time updates when bookings are created
**Files/Areas:** Future UI implementation
**Acceptance Criteria:**
- UI subscribes to bookings table changes
- New bookings appear in UI without refresh
- Booking status updates in real-time
**Test/Verification:** Booking appears in UI immediately after creation

## Epic 9: Observability & Safety

### Task 9.1: Structured logging
**Goal:** Add structured logs to API and worker
**Files/Areas:** `apps/api/src/index.ts`, `apps/worker/src/index.ts`
**Acceptance Criteria:**
- JSON-formatted logs with timestamp, level, message
- Logs include conversation_id, message_id for traceability
- Logs webhook receipt, job processing, errors
**Test/Verification:** Logs appear in structured format

### Task 9.2: Error tracking
**Goal:** Log errors with context for debugging
**Files/Areas:** `apps/api/src/routes/webhook.ts`, `apps/worker/src/ai.ts`
**Acceptance Criteria:**
- Errors include stack trace and context (conversation_id, job_id)
- Errors logged before throwing or returning error response
- Critical errors trigger alerts (future: Sentry integration)
**Test/Verification:** Errors logged with sufficient context

### Task 9.3: Health check endpoints
**Goal:** Add health checks for monitoring
**Files/Areas:** `apps/api/src/routes/health.ts`, `apps/worker/src/health.ts`
**Acceptance Criteria:**
- GET /health returns 200 if service healthy
- Checks DB connection, queue connection
- Returns 503 if dependencies unavailable
**Test/Verification:** Health check returns correct status

### Task 9.4: Job failure monitoring
**Goal:** Track and alert on job failures
**Files/Areas:** `apps/worker/src/queue.ts`
**Acceptance Criteria:**
- Failed jobs logged with error details
- Failure count tracked (in-memory counter for MVP)
- High failure rate triggers log warning
**Test/Verification:** Job failures are logged and visible

## Epic 10: Dev Tooling

### Task 10.1: Local development setup script
**Goal:** Script to set up local environment
**Files/Areas:** `scripts/setup-local.sh`
**Acceptance Criteria:**
- Creates .env file from .env.example
- Installs dependencies
- Runs database migrations
- Starts Redis (Docker or local)
**Test/Verification:** Script runs successfully on fresh clone

### Task 10.2: Database migration runner
**Goal:** Script to run migrations locally
**Files/Areas:** `scripts/migrate.sh`, `packages/db/scripts/migrate.ts`
**Acceptance Criteria:**
- Reads migrations from packages/db/migrations/
- Executes SQL files in order
- Tracks applied migrations (migration table)
**Test/Verification:** Migrations run in correct order

### Task 10.3: Local testing utilities
**Goal:** Helper scripts for testing webhook and queue
**Files/Areas:** `scripts/test-webhook.sh`, `scripts/test-queue.sh`
**Acceptance Criteria:**
- Script to send test webhook payload to local API
- Script to manually enqueue test job
- Sample payloads included
**Test/Verification:** Scripts successfully trigger API/worker

### Task 10.4: README with local setup instructions
**Goal:** Document how to run system locally
**Files/Areas:** `README.md`
**Acceptance Criteria:**
- Prerequisites listed (Node, Redis, Postgres)
- Step-by-step setup instructions
- How to run API and worker
- How to test webhook endpoint
**Test/Verification:** New developer can follow README to run system
