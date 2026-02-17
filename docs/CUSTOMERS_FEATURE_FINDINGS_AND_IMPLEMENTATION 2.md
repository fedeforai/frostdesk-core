# Customers feature: findings and implementation

## 1. Repo findings (before implementation)

- **customer_profiles / customer_notes**: Nessuna tabella esistente nel DB (né in `packages/db/migrations` né in `supabase/migrations`). Le tabelle sono state create con una nuova migration.
- **conversations**: `conversation_repository.ts` e schema usano `customer_identifier` (TEXT); nessun `customer_id` UUID. Link futuro: matching su phone/whatsapp_id.
- **bookings**: `bookings` ha `customer_name` e `phone` (migration `20260208120000_booking_schema_reconciliation.sql`); nessun `customer_id` FK. Per valore monetario in futuro: collegare booking a customer.
- **channel_identity_mapping**: `packages/db/migrations/004_channel_identity_mapping.sql` ha `first_seen_at`, `last_seen_at`, `external_identity`, `channel`; tabella diversa da customer_profiles (scope channel, non instructor+customer).
- **instructor_id resolution**: come per bookings, si usa `getInstructorProfileDefinitiveByUserId` poi `getInstructorProfileByUserId` (stesso pattern in `bookings.ts` e `profile.ts`).

## 2. Minimal API contract

| Method | Path | Response / Body |
|--------|------|------------------|
| GET | `/instructor/customers?search=&limit=&offset=` | `{ items: [{ id, phone_number, display_name, last_seen_at, source, notes_count, value_score }, ...] }` |
| GET | `/instructor/customers/:id` | `{ customer: {...}, notes: [...], stats: { notes_count, value_score } }` |
| POST | `/instructor/customers/:id/notes` | Body: `{ content: string }` → `{ ok: true, note: {...} }` |
| POST | `/instructor/customers` | Body: `{ phone_number, display_name?, source? }` → `{ ok: true, customer: {...} }` |

Ownership: ogni endpoint risolve `instructorId` dal JWT e filtra/inserisce con `WHERE instructor_id = instructorId` (o equivalente).

## 3. Value score (MVP)

- **Recency (0–60)**: last_seen &lt; 7d → 60, 7–30d → 40, 30–90d → 20, &gt;90d → 5.
- **Notes (0–40)**: 0 → 0, 1 → 10, 2–3 → 20, 4–6 → 30, 7+ → 40.
- **Totale** = Recency + Notes (max 100). Badge: Bronze 0–39, Silver 40–69, Gold 70–89, Platinum 90+.

## 4. Files changed

- **Migration**: `supabase/migrations/20260226120000_customer_profiles_and_notes.sql` (creata; applicata via MCP).
- **packages/db**: `src/customer_profile_repository.ts`, `src/customer_notes_repository.ts`; export in `src/index.ts`.
- **apps/api**: `src/routes/instructor/customers.ts` (GET list, GET :id, POST :id/notes, POST create); registrazione in `src/routes/instructor.ts`.
- **apps/instructor**: `lib/instructorApi.ts` (fetchInstructorCustomers, fetchInstructorCustomer, createInstructorCustomerNote, createInstructorCustomer); `components/shell/Sidebar.tsx` (voce Customers); `app/instructor/(app)/customers/page.tsx` (lista + search + add customer); `app/instructor/(app)/customers/[id]/page.tsx` (dettaglio + stats + note + add note).

## 5. Manual test plan

1. **List loads**
   - Login instructor, vai a **Customers** (sidebar).
   - La pagina mostra la tabella (vuota o con dati). Nessun crash.
   - Search: inserisci testo e verifica che la lista si aggiorni (o resti vuota se nessun match).

2. **Add customer**
   - Inserisci un numero (es. +393331234567) e opzionalmente un nome. Clicca **Aggiungi**.
   - La lista si aggiorna e compare il nuovo cliente con Last seen, Notes 0, Value badge Bronze.

3. **Open detail**
   - Clicca **Dettaglio** su un cliente.
   - Si apre `/instructor/customers/[id]`: header (label, source, first/last seen), Stats (notes count, value score), sezione Note (vuota o lista), form **Aggiungi nota**.

4. **Add note persists**
   - Nella pagina dettaglio, scrivi una nota (es. "Cliente VIP") e clicca **Salva nota**.
   - La nota compare nella lista sotto e il contatore Stats si aggiorna. Ricaricando la pagina la nota è ancora presente.

5. **Stats render without crashing**
   - Con 0 note: value score Bronze (0). Con 1+ note: score aumenta. Nessun errore in console.

## 6. Note per il futuro

- **Conversations ↔ Customer**: quando una conversation ha `customer_identifier` (es. numero WhatsApp), si può fare upsert su `customer_profiles` (instructor_id + phone) e aggiornare `last_seen_at` per dare valore “engagement”.
- **Bookings ↔ Customer**: aggiungere `customer_id` (FK a customer_profiles) su `bookings` e popolarlo quando si crea un booking dal thread (o manualmente) per avere valore monetario e last_booking_at nel profilo cliente.
