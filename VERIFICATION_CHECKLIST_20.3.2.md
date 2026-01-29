# BLOCK 20.3.2 — Booking Audit Table Materialization
## Verification Checklist

**Date:** 2026-01-24  
**Migration:** `20260124000002_create_booking_audit.sql`  
**Status:** PENDING VERIFICATION

---

## 1. Database Sanity Check

### SQL Query to Execute:
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'booking_audit'
ORDER BY ordinal_position;
```

### Expected Columns:
- `id` (uuid, NOT NULL, default: gen_random_uuid())
- `booking_id` (uuid, NOT NULL)
- `previous_state` (text, nullable)
- `new_state` (text, nullable)
- `event_type` (text, nullable)
- `from_status` (text, nullable)
- `to_status` (text, nullable)
- `actor` (text, NOT NULL)
- `created_at` (timestamptz, NOT NULL, default: NOW())

### Verification:
- [ ] Table `booking_audit` exists
- [ ] All 9 columns exist
- [ ] Data types match expected types
- [ ] NULL constraints match expected (actor and created_at NOT NULL, others nullable)

**Result:** PASS / FAIL  
**Notes:** (if FAIL, list missing columns or type mismatches)

---

## 2. Booking Detail View

### URL to Test:
```
/admin/bookings/[bookingId]
```
(Replace `[bookingId]` with an actual booking UUID from your database)

### Verification Steps:
1. Navigate to Admin UI
2. Go to Bookings list
3. Click on any booking
4. Observe the booking detail page

### Expected Behavior:
- [ ] Page loads without HTTP errors (status 200)
- [ ] Booking metadata displays (id, status, dates, etc.)
- [ ] `BookingAuditTrail` component renders
- [ ] No JavaScript console errors
- [ ] No server-side errors in logs
- [ ] Audit trail section shows (may be empty if no events exist)

**Result:** PASS / FAIL  
**Error Details:** (if FAIL, include exact error message, HTTP status, console errors)

---

## 3. Booking Lifecycle View

### URL to Test:
```
/admin/bookings/[bookingId]/lifecycle
```
(Replace `[bookingId]` with an actual booking UUID)

### Verification Steps:
1. Navigate to booking detail page
2. Click "Lifecycle" link or navigate directly to lifecycle URL
3. Observe the lifecycle timeline

### Expected Behavior:
- [ ] Page loads without crash
- [ ] `BookingLifecycleTimeline` component renders
- [ ] Timeline displays (may show "No lifecycle events available" if empty)
- [ ] Events are ordered chronologically (oldest first, `created_at ASC`)
- [ ] Each event displays:
  - [ ] `event_type` field (or shows null/empty if not set)
  - [ ] `from_status` and `to_status` OR `previous_state` and `new_state`
  - [ ] `actor` label (human / system / ai)
  - [ ] `created_at` timestamp (formatted)

**Result:** PASS / FAIL  
**Error Details:** (if FAIL, include exact error, which fields are missing, ordering issues)

---

## 4. Actor Attribution

### Verification Steps:
1. Review existing audit entries (if any) in the lifecycle view
2. Check actor labels displayed in UI

### Expected Behavior:
- [ ] All events show an actor label (no blank/undefined)
- [ ] Actor values are one of: "human", "system", "ai"
- [ ] Admin override actions show `actor = "human"`
- [ ] System transitions show `actor = "system"`
- [ ] AI-assisted actions (if present) show `actor = "ai"`

### SQL Query to Check Data:
```sql
SELECT DISTINCT actor FROM booking_audit;
```

**Result:** PASS / FAIL  
**Error Details:** (if FAIL, list which events have missing/incorrect actor values)

---

## 5. Admin Override Verification

### Prerequisites:
- An existing booking with status that can be overridden
- Admin access to the override endpoint

### Steps:
1. Note current booking status
2. Perform admin override via UI: `/admin/bookings/[bookingId]` → Status Override
3. Change status to a valid transition (e.g., `proposed` → `confirmed`)
4. Confirm the override
5. Reload the lifecycle page: `/admin/bookings/[bookingId]/lifecycle`

### Expected Behavior:
- [ ] Override succeeds (no errors)
- [ ] New event appears in lifecycle timeline
- [ ] New event shows:
  - [ ] `previous_state` = old status
  - [ ] `new_state` = new status
  - [ ] `actor` = "human"
  - [ ] `created_at` = current timestamp
- [ ] Event is ordered correctly in timeline (newest at bottom if ASC)

### SQL Query to Verify:
```sql
SELECT 
  id,
  booking_id,
  previous_state,
  new_state,
  actor,
  created_at
FROM booking_audit
WHERE booking_id = '[bookingId]'
ORDER BY created_at ASC;
```

**Result:** PASS / FAIL  
**Error Details:** (if FAIL, describe what's missing or incorrect)

---

## 6. Regression Check

### Pages to Verify:
- [ ] `/admin/bookings` (list page)
- [ ] `/admin/bookings/[bookingId]` (detail page)
- [ ] `/admin/bookings/[bookingId]/lifecycle` (lifecycle page)
- [ ] `/admin/conversations` (conversations list)
- [ ] `/admin/human-inbox` (human inbox)
- [ ] `/admin/system-health` (system health)

### Verification Steps:
1. Navigate to each page listed above
2. Check for errors

### Expected Behavior:
- [ ] All pages load without errors
- [ ] No new console warnings
- [ ] No new server errors
- [ ] No broken functionality in unrelated features

**Result:** PASS / FAIL  
**Error Details:** (if FAIL, list which pages are broken and what errors appear)

---

## Final Verification Status

**BLOCK 20.3.2:** VERIFIED / NOT VERIFIED

**Summary:**
- Total Steps: 6
- Passed: ___
- Failed: ___

**Critical Failures:** (list any blocking issues)

**Non-Critical Issues:** (list any warnings or minor issues)

---

## Notes

- If any step fails, stop verification and report the failure before proceeding.
- All SQL queries should be executed in read-only mode (SELECT only).
- Do not modify any data during verification.
- If the table is empty, that is acceptable - the schema must still be correct.
