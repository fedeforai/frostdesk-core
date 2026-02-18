# Phase 1 — Solo UI, zero rischi (RALPH-safe)

**Riferimento:** [UX_ALIGNMENT_MASTER.md](UX_ALIGNMENT_MASTER.md) | [CURSOR_IMPLEMENTATION_P2.md](../architecture/CURSOR_IMPLEMENTATION_P2.md)

---

## PRD

| Campo | Contenuto |
|-------|-----------|
| **Obiettivo** | Empty state Policies, badge su card Settings (WhatsApp, opzionale Stripe), card Controls/Client value in Customers, blocco utente in Sidebar. Solo presentazione; nessun nuovo endpoint, nessun cambio di stato. |
| **Scope** | App instructor: `policies/page.tsx`, `WhatsAppCard`, `settings/page.tsx`, `customers/page.tsx`, `Sidebar.tsx`. Opzionale: `StripeConnectCard`. |
| **Out of scope** | Admin app, API, DB, auth flow. |
| **RALPH** | Additive only. Nessuna transizione di stato, nessuna write non già esistente. Cursor può implementare in PR piccole e testabili. |

---

## Task list (task-by-task)

| Id | Task | File/i | Acceptance | RALPH |
|----|------|--------|------------|--------|
| 1.1 | Definire “documento vuoto”: `!doc.freeform?.trim() && Object.keys(doc.structured \|\| {}).length === 0`. Se vuoto, mostrare card empty state (icona documento, testo “Nessuna regola configurata”, CTA “Aggiungi la prima regola” che porta al form o scroll); altrimenti form esistente. | [apps/instructor/app/instructor/(app)/policies/page.tsx](../../apps/instructor/app/instructor/(app)/policies/page.tsx) | Con documento vuoto si vede empty state + CTA; con dati si vede form. Nessun cambio API. | Additive; read-only branch. |
| 1.2 | In WhatsAppCard: in base a `account` (connected vs pending/null) mostrare pill/badge “Connected” (verde/blu) o “Pending” (grigio) sopra o accanto al titolo. Stile coerente con StatusPill esistente. | [apps/instructor/components/WhatsAppCard.tsx](../../apps/instructor/components/WhatsAppCard.tsx) | Badge visibile; stati derivati solo da dati già usati. | Presentazione only. |
| 1.3 | (Opzionale) Stesso pattern badge su StripeConnectCard se esiste stato “connected”/“pending” esposto. | [apps/instructor/components/stripe/StripeConnectCard.tsx](../../apps/instructor/components/stripe/StripeConnectCard.tsx) | Come 1.2. | Presentazione only. |
| 1.4 | In customers/page: wrappare search + filtri in una card “Controls” (stesso stile card di settings: bordo, radius, padding). Wrappare la tabella in una card “Client value”. Stessi dati e stessi handler. | [apps/instructor/app/instructor/(app)/customers/page.tsx](../../apps/instructor/app/instructor/(app)/customers/page.tsx) | Due card visibili; comportamento invariato. | Layout only. |
| 1.5 | In Sidebar: aggiungere in fondo (sopra o sotto le voci Account) un blocco “utente”: avatar (iniziale da email o nome), email troncata, link “Sign out” (riuso LogoutButton). Dati utente: da `getSupabaseBrowser().auth.getUser()` in client o da prop/context se già esposti. Se non disponibili, nascondere il blocco. | [apps/instructor/components/shell/Sidebar.tsx](../../apps/instructor/components/shell/Sidebar.tsx) | Blocco visibile quando sessione c’è; logout funziona come oggi. | Additive; no new auth. |

---

## Checklist

- [ ] Nessun nuovo endpoint chiamato.
- [ ] Nessuna write aggiunta (solo UI e lettura dati esistenti).
- [ ] Policies: empty state e form non mostrati insieme; condizione “vuoto” ben definita.
- [ ] Badge WhatsApp/Stripe derivati solo da stato già usato dalla card.
- [ ] Sidebar: fallback graceful se user/email non disponibili (nascondere blocco).
- [ ] Build instructor app ok; nessun errore TypeScript/lint nei file toccati.

---

## RALPH loop safe

- **Loop:** Implementare 1.1 → 1.2 → 1.4 → 1.5 (e 1.3 se applicabile). Una PR per task o una PR “Fase 1” con tutti i task.
- **Verifica:** Ogni task è additive; nessuna transizione di stato; nessun diagramma toccato. Allineato a “SAFE for Cursor” (aggiunte UI, nessun refactor non richiesto).
