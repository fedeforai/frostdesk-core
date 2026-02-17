# CR2 Billing Gate -- Ops Runbook

## Overview

The billing gate controls which instructors can perform mutations (create/edit bookings, manage customers). It is additive to the existing CR1 pilot gate (`PILOT_INSTRUCTOR_IDS` env var).

**Gate order for mutations:**

1. **CR1 Pilot gate** -- instructor must be in `PILOT_INSTRUCTOR_IDS` env allowlist. If not, returns `402 PILOT_ONLY`.
2. **CR2 Billing gate** -- instructor's `billing_status` must be `pilot` or `active`. If `past_due` or `cancelled`, returns `402 BILLING_BLOCKED`.

Read-only routes (GET) are never gated.

---

## billing_status Values

| Status      | Mutations allowed? | Meaning                               |
|-------------|--------------------|---------------------------------------|
| `pilot`     | Yes                | Default for all existing instructors  |
| `active`    | Yes                | Paying subscriber                     |
| `past_due`  | No                 | Payment failed, grace period          |
| `cancelled` | No                 | Subscription cancelled                |

---

## Gated Routes

These 5 mutation routes enforce the billing gate:

| Route                                   | Method | File                                          |
|-----------------------------------------|--------|-----------------------------------------------|
| `/instructor/bookings`                  | POST   | `apps/api/src/routes/instructor/bookings.ts`  |
| `/instructor/bookings/:id`              | PATCH  | `apps/api/src/routes/instructor/bookings.ts`  |
| `/instructor/bookings/:id/cancel`       | POST   | `apps/api/src/routes/instructor/bookings.ts`  |
| `/instructor/customers`                 | POST   | `apps/api/src/routes/instructor/customers.ts` |
| `/instructor/customers/:id/notes`       | POST   | `apps/api/src/routes/instructor/customers.ts` |

All other routes (reads, profile updates, availability, etc.) are not gated.

---

## What the Instructor Sees

| billing_status   | Mutation attempt result                                           |
|------------------|-------------------------------------------------------------------|
| `pilot`          | Normal operation (allowed)                                        |
| `active`         | Normal operation (allowed)                                        |
| `past_due`       | Error: "Subscription required. Contact support to activate billing." |
| `cancelled`      | Error: "Subscription required. Contact support to activate billing." |

The error appears inline in the UI where the mutation was attempted (booking form, booking detail, customer creation, note creation).

---

## Manual Billing Activation (SQL)

### Activate an instructor (pilot to active)

```sql
UPDATE instructor_profiles
SET billing_status = 'active', updated_at = now()
WHERE id = '<instructor-uuid>';
```

### Mark as past_due (payment failed)

```sql
UPDATE instructor_profiles
SET billing_status = 'past_due', updated_at = now()
WHERE id = '<instructor-uuid>';
```

### Cancel an instructor

```sql
UPDATE instructor_profiles
SET billing_status = 'cancelled', updated_at = now()
WHERE id = '<instructor-uuid>';
```

### Verify current status

```sql
SELECT id, full_name, billing_status, updated_at
FROM instructor_profiles
WHERE id = '<instructor-uuid>';
```

### List all instructors by billing status

```sql
SELECT id, full_name, billing_status, updated_at
FROM instructor_profiles
ORDER BY billing_status, full_name;
```

---

## Move Instructors from Pilot to Active

To activate 3 pilot instructors for real billing:

```sql
UPDATE instructor_profiles
SET billing_status = 'active', updated_at = now()
WHERE id IN (
  '<instructor-uuid-1>',
  '<instructor-uuid-2>',
  '<instructor-uuid-3>'
);
```

Verify:

```sql
SELECT id, full_name, billing_status
FROM instructor_profiles
WHERE billing_status = 'active';
```

---

## Rollback Instructions

### Restore a blocked instructor to pilot

```sql
UPDATE instructor_profiles
SET billing_status = 'pilot', updated_at = now()
WHERE id = '<instructor-uuid>';
```

### Restore ALL instructors to pilot (emergency rollback)

```sql
UPDATE instructor_profiles
SET billing_status = 'pilot', updated_at = now()
WHERE billing_status != 'pilot';
```

This immediately removes all billing enforcement. All pilot-allowlisted instructors can mutate again.

### Remove billing gate entirely (code rollback)

If the billing gate code needs to be reverted:

1. Remove `checkBillingGate` calls from `bookings.ts` and `customers.ts`
2. Remove `BILLING_BLOCKED` from `error_codes.ts` and `error_http_map.ts`
3. The `billing_status` column can remain in DB (harmless, NOT NULL DEFAULT 'pilot')

---

## Common Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Instructor gets 402 but is in pilot list | `billing_status` is `past_due` or `cancelled` | Set to `active` or `pilot` via SQL |
| New instructor gets 402 PILOT_ONLY | Not in `PILOT_INSTRUCTOR_IDS` env | Add their UUID to the env var and restart API |
| All instructors blocked | `PILOT_INSTRUCTOR_IDS` env is empty/missing | Set the env var with valid UUIDs |
| billing_status column missing | Migration not applied | Run migration `20260214190000_instructor_profiles_billing_status.sql` |
| Frontend shows generic error instead of billing CTA | Error code not attached | Check that `(err as any).code` is set in `instructorApi.ts` |

---

## Architecture Reference

- **billing_status column**: `instructor_profiles.billing_status` (TEXT NOT NULL DEFAULT 'pilot')
- **CHECK constraint**: `chk_billing_status` allows: `pilot`, `active`, `past_due`, `cancelled`
- **Gate helper**: `apps/api/src/lib/billing_gate.ts` -- `isBillingAllowed()`, `checkBillingGate()`
- **Error code**: `BILLING_BLOCKED` mapped to HTTP 402
- **Frontend detection**: Error objects carry `.code = 'BILLING_BLOCKED'` from API response `error` field
