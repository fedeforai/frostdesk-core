# Phase 2 — Subscription e Bookings (solo presentazione)

**Riferimento:** [UX_ALIGNMENT_MASTER.md](UX_ALIGNMENT_MASTER.md) | [CURSOR_IMPLEMENTATION_P2.md](../architecture/CURSOR_IMPLEMENTATION_P2.md)

---

## PRD

| Campo | Contenuto |
|-------|-----------|
| **Obiettivo** | Plan cards in Settings (read-only o “Pilot”/“Coming soon”), dropdown azioni per riga in Bookings. Stesse API e stessi flussi; solo riorganizzazione UI. |
| **Scope** | Instructor: `SubscriptionStatusPanel` o nuovo componente `SubscriptionPlanCards`, [settings/page.tsx](../../apps/instructor/app/instructor/(app)/settings/page.tsx), componente tabella bookings (es. BookingsSection). |
| **Out of scope** | Nuovi piani a pagamento, Stripe Checkout, mutazione stato abbonamento. |
| **RALPH** | Additive; nessuna nuova write; Cursor può implementare in PR piccole. |

---

## Task list (task-by-task)

| Id | Task | File/i | Acceptance | RALPH |
|----|------|--------|------------|--------|
| 2.1 | Creare componente `SubscriptionPlanCards`: card orizzontali (es. “Pilot”, “Pro”, “School”). Per ora “Pilot” come unica card attiva o “Selected”; altre “Coming soon” senza CTA che mutano stato. Leggere solo stato già esposto (es. pilot) o props; nessuna chiamata billing nuova. | Nuovo: [apps/instructor/components/SubscriptionPlanCards.tsx](../../apps/instructor/components/SubscriptionPlanCards.tsx); usato in settings/page.tsx | Card visibili; nessun upgrade reale. | Read-only UI. |
| 2.2 | In Settings: sostituire o affiancare `SubscriptionStatusPanel` con `SubscriptionPlanCards` (o mostrare entrambi: testo sopra + card sotto). | [apps/instructor/app/instructor/(app)/settings/page.tsx](../../apps/instructor/app/instructor/(app)/settings/page.tsx) | Layout coerente con reference. | Additive. |
| 2.3 | In tabella Bookings: individuare azioni per riga (Confirm, Decline, Complete, Cancel, Mark Paid, ecc.). Raggruppare in un unico dropdown “Azioni” (o sullo stato, es. “Complete” che apre menu). Stesse chiamate API e stessi handler. | [apps/instructor/components/bookings/BookingsSection.tsx](../../apps/instructor/components/bookings/BookingsSection.tsx) (o file che contiene la tabella) | Un dropdown per riga; comportamento invariato. | Riorganizzazione UI. |

---

## Checklist

- [ ] Nessun nuovo endpoint billing o subscription.
- [ ] Plan cards: nessun pulsante che invoca checkout o cambia stato abbonamento (salvo “Contact” o “Coming soon” senza effetto).
- [ ] Bookings: stesse API chiamate con gli stessi parametri; solo raggruppamento in dropdown.
- [ ] Build ok; regressione manuale su Bookings (conferma, decline, complete, cancel).

---

## RALPH loop safe

- **Loop:** 2.1 → 2.2 → 2.3. Una o due PR.
- **Verifica:** Nessuna transizione di stato nuova; nessuna write nuova. Allineato a RALPH-safe.
