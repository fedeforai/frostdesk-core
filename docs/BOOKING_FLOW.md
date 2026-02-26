# Booking Flow: Message → AI Draft → Confirm → Calendar

## Overview

Complete flow from a WhatsApp message to a confirmed booking with a Google Calendar event.

## Flow

```
Customer (WhatsApp)
       │
       ▼
POST /webhook/whatsapp
       │
       ▼
persistInboundMessage()
       │
       ▼
orchestrateInboundDraft()
       │
       ├─ classifyRelevanceAndIntent()  →  intent = NEW_BOOKING
       │
       ├─ extractBookingFields()         →  date, startTime, endTime, partySize, ...
       │    │
       │    └─ if complete → insertAIBookingDraft(status: 'pending_review')
       │
       └─ generateDraft()               →  text draft for instructor inbox
       │
       ▼
Instructor Inbox (apps/instructor)
       │
       ├─ Sees text draft + "Confirm booking proposal" action
       │
       ▼
POST /instructor/booking-drafts/:id/confirm
       │
       ▼
confirmAIBookingDraftWithAudit()
       │   (atomic: lock draft → create booking 'draft' → update draft → audit)
       │
       ▼
Instructor reviews booking → POST /instructor/bookings/:id/accept
       │
       ├─ transitionBookingState('pending' → 'confirmed')
       │
       └─ syncBookingToCalendar()
            │
            ├─ getInstructorCalendarConnection()
            ├─ refreshAccessToken() (if expired)
            ├─ POST Google Calendar API → create event
            ├─ attachCalendarEventToBooking(calendar_event_id)
            └─ insertAuditEvent('calendar_event_created')
```

## Calendar Error Handling

Calendar sync is **non-blocking**: booking state is always the source of truth.

| Scenario | Booking state | Calendar | Response |
|----------|--------------|----------|----------|
| Calendar connected, API succeeds | confirmed | event created | `calendar_synced: true` |
| No calendar connection | confirmed | no event | `calendar_synced: false, calendar_error: 'no_calendar_connection'` |
| Google API returns error | confirmed | no event | `calendar_synced: false, calendar_error: '<error details>'` |
| Token refresh fails | confirmed | no event | `calendar_synced: false, calendar_error: 'Token refresh failed: ...'` |

**Policy**: Booking creation / confirmation is **never rolled back** due to a calendar failure.
An audit event with severity `warn` and action `calendar_sync_failed` is recorded.
The instructor sees a non-blocking warning in the UI (e.g., "Calendario non aggiornato, riprova").

## Modify / Cancel Calendar Sync

### Modify (PATCH /instructor/bookings/:id)

When booking details (start_time, end_time) change:
1. Booking status transitions to `modified` (if was `confirmed`)
2. `syncBookingUpdateToCalendar()` → PATCH Google Calendar event
3. If no `calendar_event_id` linked → no-op

### Cancel (POST /instructor/bookings/:id/cancel)

1. `syncBookingCancelToCalendar()` → DELETE Google Calendar event
2. `detachCalendarEventFromBooking()` → clear `calendar_event_id`
3. Booking status transitions to `cancelled`

## Multi-tenant Token Management

Each instructor has their own Google Calendar OAuth connection stored in
`instructor_calendar_connections`:

| Column | Description |
|--------|-------------|
| `access_token` | Google OAuth2 access token |
| `refresh_token` | Refresh token for silent renewal |
| `calendar_id` | Google Calendar ID (e.g., `primary`) |
| `expires_at` | Token expiration timestamp |

Before each Calendar API call, the sync service:
1. Checks if `expires_at` is within 60 seconds of now
2. If expired, calls Google's token endpoint with `refresh_token`
3. Persists the new `access_token` and `expires_at`

## Audit Events

| Action | Severity | When |
|--------|----------|------|
| `ai_booking_draft_created` | info | Booking fields extracted from inbound message |
| `ai_booking_draft_skipped` | info | Extraction incomplete (missing required fields) |
| `calendar_event_created` | info | Event created on Google Calendar |
| `calendar_event_updated` | info | Event updated on Google Calendar |
| `calendar_event_deleted` | info | Event deleted from Google Calendar |
| `calendar_sync_failed` | warn | Any Calendar API error |

## Idempotency

- **Booking draft**: `insertAIBookingDraft` creates a new draft per `message_id`. The orchestrator's
  idempotency check (`findAISnapshotByMessageId`) prevents duplicate processing of the same message.
- **Calendar create**: `syncBookingToCalendar` checks `calendar_event_id` before creating.
  If already set, returns the existing event ID without creating a duplicate.
- **Draft confirm**: `confirmAIBookingDraftWithAudit` uses `SELECT ... FOR UPDATE` and checks
  `confirmed_booking_id` for idempotency.
