# CR1 Commercial Readiness — Deliverables

## GO / NO-GO dopo CR1

**GO** se:
1. `PILOT_INSTRUCTOR_IDS` è settato correttamente e include l’UUID giusto (**instructor profile id**, non user id).
2. I 4 test chiave restano verdi: bookings list ok, create booking ok, take over ok, dashboard upcoming scoped ok.

**NO-GO** se:
- `PILOT_INSTRUCTOR_IDS` è vuoto o sbagliato ⇒ tutti 402 e l’app sembra “rotta”.

> **Se vedi 402 ovunque, controlla `PILOT_INSTRUCTOR_IDS` e che sia `profile.id` (instructor profile UUID), non user id.**

---

## Checklist rapidissima di deploy locale

1. **Set env:** `PILOT_INSTRUCTOR_IDS=<UUID profile instructor>` (da `instructor_profiles_definitive.id` o legacy `instructor_profiles.id`, **non** auth user id).
2. **Restart API** (env letto a avvio).
3. **Prova una mutazione:**
   - Create booking (UI o POST /instructor/bookings con customerId, start_time, end_time).
   - Add customer note (POST /instructor/customers/:id/notes con content).
   - **Se sei pilot:** 201. **Se non sei pilot:** 402 con `error: 'PILOT_ONLY'`.

---

## Pilot success metrics (7 giorni) — da audit_log, senza nuove tabelle

Con CR1 gli audit events permettono di misurare il pilot come prodotto:

| Metrica | Fonte |
|--------|--------|
| **booking_created** per instructor | `audit_log WHERE action = 'booking_created'` → count/group by actor_id |
| **booking_details_updated** | `audit_log WHERE action = 'booking_details_updated'` |
| **customer_note_added** | `audit_log WHERE action = 'customer_note_added'` |
| **Cancellazioni** | `booking_audit` (o audit_log se aggiungi action per cancel) / stato cancelled |
| **Tempo medio tra first_seen e booking_created** | `customer_profiles.first_seen_at` + primo `audit_log.action = 'booking_created'` per quel customer (join entity_id = customer_id) |

Tutte derivabili in una finestra di 7 giorni senza schema aggiuntivo.

---

## Cosa viene dopo: CR2 e CR3

- **CR2 — Pricing + Billing Gate:** Campo su instructor profile `billing_status` (pilot, active, past_due); gate mutazioni su billing_status; gestibile manualmente anche senza Stripe per ~10 pilot.
- **CR3 — Retention loop:** Customer detail con storico booking (anche minimale); “last interaction”, “repeat rate”, “value trend”; template note veloce (es. 3 tag rapidi).

---

## 1) Change list (max 12 bullets)

1. **Pilot gating**: Added `PILOT_INSTRUCTOR_IDS` env var (comma-separated UUIDs) and `isPilotInstructor(instructorId)` in `apps/api/src/lib/pilot_instructor.ts`. Non-pilots receive **402** with `PILOT_ONLY` on gated mutations.
2. **Gated routes**: Pilot check applied to POST /instructor/bookings, PATCH /instructor/bookings/:id, POST /instructor/bookings/:id/cancel, POST /instructor/customers, POST /instructor/customers/:id/notes. **GET list/detail left readable** (no gating) so non-pilots can still view data.
3. **Error codes**: Added `PILOT_ONLY` (→ 402) and `FORBIDDEN` (→ 403) in `error_codes.ts` and `error_http_map.ts`; duplicated in `error_handler.ts` for consistency.
4. **Booking creation**: No change — API already requires `customerId`, derives `customerName` server-side; BookingForm already uses customer selector + “Add new customer” inline and sends only `customerId`.
5. **Audit entity type**: Added `customer` to `AuditEventEntityType` in `packages/db/src/audit_log_repository.ts` for customer_note_added.
6. **Audit — booking_created**: After successful `createBooking`, `insertAuditEvent` with action `booking_created`, entity_type `booking`, entity_id = booking id; payload includes `bookingId`, `customerId`. Fail-open on audit errors.
7. **Audit — booking_details_updated**: After successful `updateBookingDetails` in PATCH /instructor/bookings/:id, `insertAuditEvent` with action `booking_details_updated`, entity_type `booking`, entity_id = booking id; payload `{ bookingId }`. Fail-open on audit errors.
8. **Audit — customer_note_added**: After successful `createCustomerNote`, `insertAuditEvent` with action `customer_note_added`, entity_type `customer`, entity_id = customer id; payload `{ customerId, noteId }` (no note content). Fail-open on audit errors.
9. **Env example**: Documented `PILOT_INSTRUCTOR_IDS` in root `.env.example`.
10. No new libraries; no auth/proxy changes; no changes to `booking_audit` table usage.

---

## 2) Files modified list

| File | Change |
|------|--------|
| `apps/api/src/errors/error_codes.ts` | Add `PILOT_ONLY` |
| `apps/api/src/errors/error_http_map.ts` | Add `PILOT_ONLY` → 402, `FORBIDDEN` → 403 |
| `apps/api/src/lib/pilot_instructor.ts` | **New**: allowlist helper `isPilotInstructor(instructorId)` |
| `apps/api/src/routes/instructor/bookings.ts` | Pilot check on POST create, PATCH :id, POST :id/cancel; audit after create and after updateBookingDetails |
| `apps/api/src/routes/instructor/customers.ts` | Pilot check on POST /customers and POST /customers/:id/notes; audit after createCustomerNote |
| `apps/api/src/middleware/error_handler.ts` | Add PILOT_ONLY (402), FORBIDDEN (403) to ERROR_CODE_TO_STATUS |
| `packages/db/src/audit_log_repository.ts` | Add `customer` to `AuditEventEntityType` |
| `.env.example` | Document `PILOT_INSTRUCTOR_IDS` |

**New file:** `apps/api/src/lib/pilot_instructor.ts`

---

## 3) Full contents of modified files

See repo diff. Summary of edits:

- **pilot_instructor.ts**: Parses `process.env.PILOT_INSTRUCTOR_IDS` (comma-separated UUIDs), caches a Set, exports `isPilotInstructor(id)` (false for empty/missing env or invalid UUID).
- **bookings.ts**: After `getInstructorId` (and after `loadBookingAndEnforceOwnership` for PATCH/cancel), if `!isPilotInstructor(instructorId)` return 402 with `PILOT_ONLY`. After `createBooking` and after `updateBookingDetails` success, call `insertAuditEvent` with actor_type `instructor`, actor_id `instructorId`, actions `booking_created` / `booking_details_updated`, entity_type `booking`, entity_id and minimal payload; `.catch(() => {})` for fail-open.
- **customers.ts**: After `getInstructorId`, if `!isPilotInstructor(instructorId)` return 402 for POST /customers and POST /customers/:id/notes. After `createCustomerNote` success, `insertAuditEvent` for `customer_note_added`, entity_type `customer`, entity_id customer id, payload `{ customerId, noteId }`; fail-open.
- **error_codes.ts**: One new line `PILOT_ONLY: 'PILOT_ONLY'`.
- **error_http_map.ts**: Two new lines for PILOT_ONLY (402) and FORBIDDEN (403).
- **error_handler.ts**: Four new entries in ERROR_CODE_TO_STATUS.
- **audit_log_repository.ts**: Add `'customer'` to the union type.
- **.env.example**: Comment block for PILOT_INSTRUCTOR_IDS.

---

## 4) Manual test checklist (exact steps)

### Pilot gating

1. **Env**: Set `PILOT_INSTRUCTOR_IDS=<instructor_uuid_of_test_user>` (one valid UUID). Restart API.
2. **Pilot instructor**: As that instructor, POST /instructor/bookings (valid body with customerId, start_time, end_time) → **201**. PATCH /instructor/bookings/:id (valid patch) → **200**. POST /instructor/bookings/:id/cancel → **200**. POST /instructor/customers (phone_number) → **201**. POST /instructor/customers/:id/notes (content) → **201**.
3. **Non-pilot instructor**: As another instructor (not in allowlist), same requests → **402** with body `{ ok: false, error: 'PILOT_ONLY', message: 'This feature is only available for pilot instructors.' }`.
4. **GET unchanged**: As non-pilot, GET /instructor/bookings and GET /instructor/bookings/:id and GET /instructor/customers and GET /instructor/customers/:id → **200** (readable).

### Customer-first booking (existing behaviour)

5. **Instructor app**: New booking → customer dropdown/search → select existing customer → set times → Create booking → **success**; or “Add customer” → phone + optional name → Create customer → customer auto-selected → set times → Create booking → **success**.
6. **API**: POST /instructor/bookings with only `customerId` (no customerName) and valid times → **201**; response includes booking id.

### Audit

7. **booking_created**: After step 5 or 6, query `SELECT * FROM audit_log WHERE action = 'booking_created' ORDER BY created_at DESC LIMIT 1` → one row, actor_type = instructor, entity_type = booking, entity_id = booking id, payload contains bookingId (and customerId for create).
8. **booking_details_updated**: PATCH a booking (change time or notes) → query `audit_log WHERE action = 'booking_details_updated'` → new row with same booking entity_id.
9. **customer_note_added**: POST /instructor/customers/:id/notes → query `audit_log WHERE action = 'customer_note_added'` → row with entity_type = customer, entity_id = customer id, payload has noteId (no note content).

### Edge cases (see section 5)

10. **Missing env**: Unset `PILOT_INSTRUCTOR_IDS` → all instructors get 402 on gated mutations.
11. **Invalid UUID in env**: Non-UUID entries in PILOT_INSTRUCTOR_IDS are ignored; only valid UUIDs are in the allowlist.
12. **Ownership**: Non-owner PATCH/GET booking → 403 (unchanged). Customer of another instructor → 403 on POST booking (unchanged).
13. **Invalid time range**: start_time >= end_time on POST or PATCH → 400 (unchanged).

---

## 5) Edge cases checklist

| Case | Expected behaviour |
|------|--------------------|
| **PILOT_INSTRUCTOR_IDS missing or empty** | Allowlist empty; every instructor gets 402 on gated mutation routes. |
| **Invalid UUID in PILOT_INSTRUCTOR_IDS** | That token is ignored (only valid UUIDs parsed); no crash. |
| **Valid UUID but not an existing instructor** | Allowlist only checks ID format; if that UUID is never used as instructor_id, no effect. If used as instructor_id, that user is treated as pilot. |
| **Customer ownership** | POST /instructor/bookings: customer must be loaded by getCustomerById(customerId, instructorId); else 403 “Customer not found or does not belong to you”. Unchanged. |
| **Booking ownership** | PATCH/cancel/GET booking: loadBookingAndEnforceOwnership returns 404 or 403 if not owner. Unchanged. |
| **Invalid time range** | POST/PATCH: start_time >= end_time or invalid date → 400 with existing error code/message. Unchanged. |
| **Audit insert failure** | insertAuditEvent is called with .catch(() => {}); request still returns 201/200. Fail-open. |
| **GET list/detail** | Not gated; non-pilot can still GET /instructor/bookings, /instructor/bookings/:id, /instructor/customers, /instructor/customers/:id. |

---

## Pilot gating — decision (documented)

- **Gated (402 if not pilot):** POST /instructor/bookings, PATCH /instructor/bookings/:id, POST /instructor/bookings/:id/cancel, POST /instructor/customers, POST /instructor/customers/:id/notes.
- **Not gated (read-only):** GET /instructor/bookings, GET /instructor/bookings/:id, GET /instructor/customers, GET /instructor/customers/:id. Non-pilots can log in and view; they cannot create or mutate.

---

## Nota operativa 402

**Se vedi 402 ovunque:** controlla che `PILOT_INSTRUCTOR_IDS` sia impostato e che contenga l’**instructor profile id** (da DB: `instructor_profiles_definitive.id` o `instructor_profiles.id`), non l’auth user id. Env vuoto o UUID sbagliato = nessun pilot = tutte le mutazioni ritornano 402.
