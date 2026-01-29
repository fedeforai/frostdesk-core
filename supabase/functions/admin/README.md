# Admin Edge Functions

**Status: Frozen (RALPH-SAFE v1.1)**

This folder exposes read-only and explicit admin operations via Supabase Edge Functions.

No business logic lives here. All logic is delegated to `packages/db`.

## Constraints

- No logging
- No retries
- No schema changes
- No new business logic
- No AI
- No calendar or payment calls

## Structure

```
admin/
├── _shared/
│   ├── admin_guard.ts      # Auth + admin access check
│   ├── error_mapper.ts     # Error → HTTP response mapping
│   └── parse_query.ts      # Query parameter parsing
├── list_conversations/
│   └── index.ts            # GET /admin/conversations
└── README.md
```

## Shared Utilities

### admin_guard.ts
- Extracts userId from Supabase auth
- Calls `assertAdminAccess(userId)`
- Fails immediately if not admin

### error_mapper.ts
- Maps errors to HTTP status codes
- Returns standardized `{ error: { code: string } }` format
- No stack traces, no verbose messages

### parse_query.ts
- Parses `limit`, `offset`, `dateFrom`, `dateTo`
- Safe defaults (limit: 50, offset: 0)
- Type coercion

## Endpoints

### GET /admin/conversations
- Auth check
- Admin guard
- Calls `getAdminConversations`
- Returns `{ items, limit, offset }`

## Response Format

All list endpoints return:
```json
{
  "items": T[],
  "limit": number,
  "offset": number
}
```

All errors return:
```json
{
  "error": {
    "code": "ERROR_CODE"
  }
}
```

## Error Mapping

- `ADMIN_ONLY` → 403
- `BOOKING_NOT_FOUND` → 404
- `INVALID_BOOKING_TRANSITION` → 409
- default → 500
