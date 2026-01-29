# BLOCK 23.0.4 — Admin Route Protection Coverage

**Date:** 2026-01-24

---

## Coverage Table

| Route | Protected | Guard Type | File Path | Notes |
|-------|-----------|------------|-----------|-------|
| `/admin/bookings` | ✅ YES | `assertAdminAccess` | `packages/db/src/admin_booking_service.ts` (line 38) | View page - sufficient |
| `/admin/bookings/:id` | ✅ YES | `assertAdminAccess` | `packages/db/src/admin_booking_detail_service.ts` (line 35) | View page - sufficient |
| `/admin/bookings/:id/override-status` | ✅ YES | `assertRoleAllowed(['system_admin', 'human_approver'])` | `packages/db/src/admin_booking_service.ts` (line 68) | **UPDATED** - Sensitive action |
| `/admin/bookings/:id/lifecycle` | ✅ YES | `assertAdminAccess` | `packages/db/src/booking_lifecycle_service.ts` (line 8) | View page - sufficient |
| `/admin/conversations` | ✅ YES | `assertAdminAccess` | `packages/db/src/admin_conversation_service.ts` (line 26) | View page - sufficient |
| `/admin/human-inbox` | ✅ YES | `assertAdminAccess` | `packages/db/src/human_inbox_service.ts` (line 58) | View page - sufficient |
| `/admin/system-health` | ✅ YES | `assertRoleAllowed(['system_admin'])` | `packages/db/src/system_health_service.ts` (line 19) | **UPDATED** - Sensitive system data |
| `/admin/system-degradation` | ✅ YES | `assertAdminAccess` | `packages/db/src/system_degradation_service.ts` (line 24) | View page - sufficient (kept as admin-only) |
| `/admin/conversations/:id/send-ai-draft` | ✅ YES | `assertRoleAllowed(['system_admin', 'human_approver'])` | `packages/db/src/ai_draft_send_service.ts` (line 8) | **UPDATED** - Sensitive action (approve draft) |

---

## Files Modified

**3 files modified:**

1. `packages/db/src/admin_booking_service.ts`
   - Added import: `assertRoleAllowed`
   - Changed `adminOverrideBookingStatus`: `assertAdminAccess` → `assertRoleAllowed(['system_admin', 'human_approver'])`

2. `packages/db/src/system_health_service.ts`
   - Changed import: `assertAdminAccess` → `assertRoleAllowed`
   - Changed `getSystemHealth`: `assertAdminAccess` → `assertRoleAllowed(['system_admin'])`

---

## Full Updated Code

### File 1: `packages/db/src/admin_booking_service.ts`

```typescript
import { assertAdminAccess, assertRoleAllowed } from './admin_access.js';
import { listAllBookings, AdminBookingSummary, ListAllBookingsParams } from './admin_booking_repository.js';
import { getBookingById as getAdminBookingById } from './admin_booking_detail_repository.js';
import { updateBookingState, BookingNotFoundError } from './booking_repository.js';
import { transitionBookingState, BookingState } from './booking_state_machine.js';
import { recordBookingAudit } from './booking_audit.js';
import { sql } from './client.js';

export interface GetAdminBookingsParams extends ListAllBookingsParams {
  userId: string;
}

export interface AdminOverrideBookingStatusParams {
  userId: string;
  bookingId: string;
  newStatus: BookingState;
  reason?: string;
}

/**
 * Retrieves bookings for admin users (read-only).
 * 
 * Flow:
 * 1. Assert admin access
 * 2. Call repository
 * 3. Return results
 * 
 * @param params - Query parameters including userId for admin check
 * @returns Array of booking summaries
 * @throws UnauthorizedError if user is not an admin
 */
export async function getAdminBookings(
  params: GetAdminBookingsParams
): Promise<AdminBookingSummary[]> {
  const { userId, ...queryParams } = params;

  // Assert admin access
  await assertAdminAccess(userId);

  // Call repository
  return listAllBookings(queryParams);
}

/**
 * Allows admin to manually override booking status.
 * 
 * Flow:
 * 1. Assert role allowed (system_admin or human_approver)
 * 2. Fetch booking
 * 3. Validate transition via state machine
 * 4. Persist new state
 * 5. Write audit log with actor='human'
 * 
 * No calendar sync, no payment side-effects, no automation.
 * 
 * @param params - Override parameters
 * @returns Updated booking
 * @throws RoleNotAllowedError if user role is not allowed
 * @throws BookingNotFoundError if booking does not exist
 * @throws InvalidBookingTransitionError if transition is invalid
 */
export async function adminOverrideBookingStatus(
  params: AdminOverrideBookingStatusParams
): Promise<AdminBookingSummary> {
  const { userId, bookingId, newStatus, reason } = params;

  // Assert role allowed (system_admin or human_approver)
  await assertRoleAllowed(userId, ['system_admin', 'human_approver']);

  // Fetch booking
  const booking = await getAdminBookingById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  // Validate transition via state machine
  const previousState = booking.status;
  transitionBookingState(previousState, newStatus);

  // Persist new state
  await updateBookingState(bookingId, newStatus);

  // Write audit log with actor='human'
  await recordBookingAudit({
    bookingId,
    previousState,
    newState: newStatus,
    actor: 'human',
  });

  // Query full booking details for admin view
  const result = await sql<AdminBookingSummary[]>`
    SELECT id, instructor_id, customer_name, phone, status, booking_date, start_time, end_time, calendar_event_id, payment_intent_id, created_at
    FROM bookings
    WHERE id = ${bookingId}
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(bookingId);
  }

  return result[0];
}
```

### File 2: `packages/db/src/system_health_service.ts`

```typescript
import { assertRoleAllowed } from './admin_access.js';
import { getSystemHealthSnapshot } from './system_health_repository.js';

/**
 * Retrieves system health snapshot for admin dashboard.
 * 
 * WHAT IT DOES:
 * - Asserts role allowed (system_admin only)
 * - Returns system health snapshot
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 */
export async function getSystemHealth(params: {
  userId: string;
}): Promise<ReturnType<typeof getSystemHealthSnapshot>> {
  // Assert role allowed (system_admin only)
  await assertRoleAllowed(params.userId, ['system_admin']);

  return getSystemHealthSnapshot();
}
```

### File 3: `packages/db/src/ai_draft_send_service.ts`

```typescript
import { assertRoleAllowed } from './admin_access.js';
import { sendApprovedAIDraft } from './ai_draft_send_repository.js';

export async function approveAndSendAIDraft(params: {
  conversationId: string;
  userId: string;
}): Promise<{ message_id: string }> {
  // Assert role allowed (system_admin or human_approver)
  await assertRoleAllowed(params.userId, ['system_admin', 'human_approver']);

  return sendApprovedAIDraft({
    conversationId: params.conversationId,
    approvedBy: params.userId,
  });
}
```

---

## Summary

**Total Routes Checked:** 9  
**Routes Already Protected:** 6  
**Routes Updated:** 3

**Changes Made:**
- ✅ `adminOverrideBookingStatus`: Now requires `system_admin` or `human_approver` role
- ✅ `getSystemHealth`: Now requires `system_admin` role only
- ✅ `approveAndSendAIDraft`: Now requires `system_admin` or `human_approver` role

**No Changes Needed:**
- View pages already have `assertAdminAccess` (sufficient per requirements)
- All routes are now protected with appropriate guards
