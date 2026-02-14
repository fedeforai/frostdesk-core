# Booking timeline audit policy

## Declared policy: Option A (no modified→modified noise)

- **Only** the first edit on a **confirmed** booking records an audit event: `confirmed → modified`.
- If the booking is already **modified**, a non-empty PATCH **only updates details** (no `applyTransition`). So **no** new timeline entry for subsequent edits — no noisy `modified → modified` events.
- Cancel flow unchanged: still uses current DB status (so Edit→Save→Cancel yields `modified → cancelled`).

## State consistency: Cancel after edit

- **Required behaviour**: If the user does **Edit → Save** (booking becomes `modified`), then **Cancel booking**, the timeline must show **modified → cancelled**, not confirmed → cancelled.
- **Implementation**: POST `/instructor/bookings/:id/cancel` uses the **current** booking from DB (via `loadBookingAndEnforceOwnership`). So after a save, the next cancel reads `status = modified` and records `modified → cancelled`.

---

## Manual test checklist (lifecycle integrity)

1. **Confirmed → edit → save → modified**
   - Open a **confirmed** booking → Edit → change notes or times → Save changes.
   - Expect: status badge **modified**, timeline shows **one** event: "Booking modified" (confirmed → modified).

2. **Modified → edit again → no new timeline event**
   - Same booking (now modified) → Edit → change something → Save changes.
   - Expect: status stays **modified**, timeline **unchanged** (no second "Booking modified" / no modified→modified).

3. **Lifecycle integrity: modified → cancelled**
   - **Confirmed** → Edit → Save (now modified) → click **Cancel booking** → confirm.
   - Expect: timeline shows **"Booking cancelled"** with **modified → cancelled** (not confirmed → cancelled).

4. **Dirty form**
   - Edit → do **not** change any field → Save changes button must be **disabled**. Change one field → button enabled. Discard → button disabled again.

5. **Cancel UX**
   - Cancel booking button: strong red, below a separator, label "⚠ Cancel booking (irreversible)". Confirm dialog includes: "This will permanently cancel the booking."
