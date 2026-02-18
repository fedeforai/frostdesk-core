# Phase 4 — Login e Calendar (opzionali)

**Riferimento:** [UX_ALIGNMENT_MASTER.md](UX_ALIGNMENT_MASTER.md) | [CURSOR_IMPLEMENTATION_P2.md](../architecture/CURSOR_IMPLEMENTATION_P2.md)

---

## PRD

| Campo | Contenuto |
|-------|-----------|
| **Obiettivo** | Login: stessa pagina con toggle Sign In / Sign Up e pulsante “Continue with Google” (se OAuth è già previsto). Calendar: link “Apri in Google Calendar”, timezone, blocchi “Prossimi eventi” / “Prossime lezioni”. |
| **Scope** | Instructor: login (e signup se unificato), [calendar/page.tsx](../../apps/instructor/app/instructor/(app)/calendar/page.tsx). |
| **Out of scope** | Nuovo provider OAuth non già in uso. |
| **RALPH** | Additive; stessi flussi auth; Calendar read-only. |

---

## Task list (task-by-task)

| Id | Task | File/i | Acceptance | RALPH |
|----|------|--------|------------|--------|
| 4.1 | Login: sulla stessa route aggiungere segmented control “Sign In” / “Sign Up”; in base al valore mostrare form login o form signup (stesso comportamento delle route attuali). | [apps/instructor/app/instructor/(pre)/login/](../../apps/instructor/app/instructor/(pre)/login/) (o pagina unificata) | Toggle funziona; redirect e auth invariati. | UI only; stessi endpoint. |
| 4.2 | Se Supabase OAuth Google è configurato: aggiungere pulsante “Continue with Google” che chiama `signInWithOAuth({ provider: 'google' })` e gestisce redirect. Altrimenti nascondere pulsante o mostrare “Coming soon”. | Stesso file | Nessun nuovo flusso auth non previsto. | Additive. |
| 4.3 | Calendar: aggiungere link “Apri in Google Calendar” (URL da dati calendario già esposti). Aggiungere riga “Eventi mostrati nel fuso orario: [timezone]”. Se i dati ci sono, due blocchi “Prossimi eventi calendario (7d)” e “Prossime lezioni (7d)”. | [apps/instructor/app/instructor/(app)/calendar/page.tsx](../../apps/instructor/app/instructor/(app)/calendar/page.tsx) | Link e timezone visibili; blocchi usano dati esistenti. | Read-only. |

---

## Checklist

- [ ] Login/signup: stessi endpoint e stessi redirect; nessuna rimozione di route senza migrazione.
- [ ] Google: solo se OAuth è già in uso; altrimenti UI “Coming soon” o assente.
- [ ] Calendar: nessuna write; solo link e visualizzazione dati.

---

## RALPH loop safe

- **Loop:** 4.1 → 4.2 (opzionale) → 4.3. PR separate per login e calendar se preferite.
- **Verifica:** Nessuna nuova transizione auth; Calendar solo lettura. RALPH-safe.
