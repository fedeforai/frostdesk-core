# Phase 3 — Danger Zone (cancellazione account)

**Riferimento:** [UX_ALIGNMENT_MASTER.md](UX_ALIGNMENT_MASTER.md) | [CURSOR_IMPLEMENTATION_P2.md](../architecture/CURSOR_IMPLEMENTATION_P2.md)

---

## PRD

| Campo | Contenuto |
|-------|-----------|
| **Obiettivo** | Sezione “Danger Zone” in Settings con testo GDPR e pulsante “Elimina account”. **3a:** solo UI (modale “Contatta supporto” o simile). **3b:** (opzionale) endpoint cancellazione + modale di conferma. |
| **Scope** | Instructor Settings; eventuale nuovo endpoint `DELETE /instructor/account` (solo in 3b). |
| **Out of scope** | Cancellazione da admin, cron, automazioni. |
| **RALPH** | 3a: solo UI, nessuna write. 3b: azione esplicita, umana, tracciata (audit); da allineare a diagrammi/audit se esistono. |

---

## Task list (task-by-task)

| Id | Task | File/i | Acceptance | RALPH |
|----|------|--------|------------|--------|
| 3.1 | Aggiungere in settings/page una card “Danger Zone”: bordo/sfondo rosso, titolo “Danger Zone”, sottotitolo “Azioni permanenti e irreversibili”, testo cancellazione account e diritto all’oblio (GDPR). Pulsante “Elimina account” (rosso). | [apps/instructor/app/instructor/(app)/settings/page.tsx](../../apps/instructor/app/instructor/(app)/settings/page.tsx) | Card visibile; pulsante non fa ancora azione distruttiva (o apre modale). | Additive. |
| 3.2 | Al click su “Elimina account”: aprire modale di conferma con testo di warning e “Annulla” / “Conferma”. **3a:** “Conferma” chiude modale e mostra messaggio “Contatta supporto per cancellazione” (o link email). Nessuna chiamata API. | Stesso file + eventuale componente modale (es. DangerZoneModal.tsx) | Modale coerente; nessuna write in 3a. | Explicit user action; no backend. |
| 3.3 | **(Solo 3b)** Aggiungere endpoint `DELETE /instructor/account` (o simile): verifica JWT, soft-delete o flag “cancellation requested”, audit event. Documentare in API route map. | apps/api, packages/db se serve | Endpoint tracciato; nessuna cancellazione senza chiamata esplicita. | Explicit, human, traced. |
| 3.4 | **(Solo 3b)** Nel modale “Conferma”: chiamare `DELETE /instructor/account`; su success redirect a login o pagina “Account cancellato”; su errore messaggio inline. | Instructor app | Flusso end-to-end testabile. | Come 3.3. |

---

## Checklist

- [ ] 3a: nessuna chiamata di cancellazione; solo UI e copy.
- [ ] 3b: un solo endpoint di cancellazione; audit event per ogni cancellazione; nessuna cancellazione automatica o da cron.
- [ ] Test manuale: modale si apre/chiude; in 3b flusso completo con account di test.
- [ ] Copy GDPR verificato (diritto all’oblio, permanenza).

---

## RALPH loop safe

- **3a:** RALPH-safe (solo UI).
- **3b:** Allineare a “explicit, human, traced”: azione utente → una chiamata → un evento audit. Se esiste diagramma “account lifecycle”, aggiornare e implementare in modo coerente.
