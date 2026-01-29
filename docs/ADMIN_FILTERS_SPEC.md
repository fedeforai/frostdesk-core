# Admin Filters Specification

Minimal specification of available filters for admin endpoints.

## GET /admin/conversations

**Available filters:**
- `instructorId` (string, optional): Filter by instructor ID
- `status` (string, optional): Filter by conversation status

**Not available:**
- `handoff_to_human`: Not implemented in repository
- `dateFrom`/`dateTo`: Not implemented in repository

## GET /admin/bookings

**Available filters:**
- `instructorId` (string, optional): Filter by instructor ID
- `status` (string, optional): Filter by booking status
- `dateFrom` (string, optional): ISO 8601 date string - filter bookings from this date
- `dateTo` (string, optional): ISO 8601 date string - filter bookings until this date

## GET /admin/messages

**Available filters:**
- `conversationId` (string, optional): Filter by conversation ID
- `instructorId` (string, optional): Filter by instructor ID
- `direction` (string, optional): Filter by message direction ('inbound' | 'outbound')
- `dateFrom` (string, optional): ISO 8601 date string - filter messages from this date
- `dateTo` (string, optional): ISO 8601 date string - filter messages until this date

## Common Parameters

All list endpoints support:
- `limit` (number, optional, default: 50): Number of items per page
- `offset` (number, optional, default: 0): Pagination offset

## Date Format

All date filters (`dateFrom`, `dateTo`) accept ISO 8601 date strings:
- Date only: `YYYY-MM-DD`
- Full ISO datetime: `YYYY-MM-DDTHH:mm:ssZ`
