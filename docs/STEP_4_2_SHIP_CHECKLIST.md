# STEP 4.2 — Ship checklist

## Rischi chiusi

1. **HumanInboxPage tracciato**  
   Path canonico: `apps/instructor/components/inbox/HumanInboxPage.tsx`. File tracciato in git (commit STEP 4.1+4.2). Non ricreare il file con path diverso per non perdere lo storico.

2. **Stato expired nel pannello**  
   - **actionable** solo se `effectiveState === 'proposed'`.  
   - Se **expired**: solo badge "Expired" + testo "Draft expired, request a new one"; nessun pulsante Use/Dismiss (no /use su draft scaduto).

3. **KPI expired**  
   - Backend: `expired = 0` per MVP.  
   - Dashboard: **nessuna** tile "Expired". Solo: Drafts generated, Drafts used, Drafts ignored, Draft usage rate. "Expired" è solo badge stato nel pannello draft in inbox.

---

## Checklist finale (ship)

- **Use draft**
  - Chiama `POST /instructor/drafts/:draftId/use`.
  - Non invia messaggio.
  - Precompila composer con `finalText` + focus.
  - Badge draft → USED.
- **Send**
  - Chiama solo `POST /instructor/inbox/:conversation_id/reply`.
  - Se fallisce: bubble failed + retry che richiama solo `/reply`.
- **Reload pagina**
  - Draft USED resta USED (dato da API).
  - KPI dashboard riflette eventi (da `GET /instructor/kpis/summary`).
