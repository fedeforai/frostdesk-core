# CM-2.1 — Prompt Cursor (RALPH-safe)

Copia-incolla il blocco sotto in Cursor come prossimo messaggio. Nessuna modifica al codice; solo output = documento di design.

---

## Prompt (copia da qui)

```
Follow RULES.md strictly.
This task is DESIGN + AUDIT ONLY. Do NOT modify any existing code. Do NOT create migrations, tables, or files. Do NOT refactor or rename existing structures.

CONTEXT:
- FrostDesk: AI-assisted inbox and booking for individual instructors. Human-in-control is mandatory.
- CM-1 is LOCKED: docs/CM-1_CUSTOMER_IDENTIFIER_MODEL_DESIGN.md defines the customer entity (instructor_id, channel, normalized_identifier), no silent duplicates, instructor-scoped.
- We are now on CM-2 — Conversation ↔ Customer Linking.
- STEP 9 (Billing & Pricing) applies: no Stripe, no billing, no ownership ambiguity. Customer belongs to instructor.

TASK: CM-2.1 — Resolution path definition (design only).

Define, in a design document, HOW a conversation gets linked to a customer. No code. No implementation.

REQUIREMENTS:
1. Order of sources for "conversation → customer":
   - First: conversation.customer_id (if it exists and is set)
   - Then: resolve from (instructor_id, channel, normalized_identifier) using existing or newly created customer row
   - Fallback: no link (conversation has no customer; show "Unlinked" or equivalent in UI later)
2. No implicit writes: every write of customer_id (or equivalent link) must be explicit and traceable. No silent overwrite.
3. Cross-instructor: under no circumstance may a conversation be linked to a customer that belongs to another instructor.
4. Document where the link is read from (which tables, which columns) and in what order. Document when a link may be written and by whom (human vs system, and only if already defined in codebase — otherwise say "to be defined in CM-2.3").

OUTPUT:
Create a single markdown document: docs/CM-2.1_RESOLUTION_PATH_DESIGN.md

Structure (mandatory sections):
1. Purpose of CM-2.1 — Why the resolution path is defined once and locked.
2. Read path (conversation → customer): Order of sources; which table/column is read first, then fallback; what "no customer" means.
3. Write path: When is conversation.customer_id (or the link) set? Who triggers it (ingestion vs human)? No implicit overwrite rule.
4. Cross-instructor guarantee: How the design ensures a conversation never links to another instructor's customer.
5. Edge cases: New conversation; existing conversation with no customer; existing conversation with customer_id set; identifier change (same conversation, new number).
6. What this document does NOT do: No UI implementation, no API contracts, no audit schema (those are other CM-2.x tickets).

Constraints:
- No code. No migrations. No changes to existing files.
- No speculative language. No "could" or "might" without labeling as open question.
- Bullet points and section headers. Investor-readable.
- If something is unclear from the codebase, state "Open: [question]" and stop. Do not assume.

FINAL CHECK before answering:
- No code written.
- No existing file modified (except creating the new doc).
- All statements consistent with STEP 9 and CM-1.
- Human-in-control preserved.
```

---

## Dopo l’esecuzione

- Verifica che l’output sia solo `docs/CM-2.1_RESOLUTION_PATH_DESIGN.md`.
- Nessun diff in `packages/db`, `apps/api`, `apps/instructor` o migrazioni.
- Se Cursor propone codice o modifiche, rispondi: "Solo design. Nessun codice. Ripeti solo il documento."
