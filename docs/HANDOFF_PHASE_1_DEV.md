# Hand-off al dev — Customer Memory Phase 1

**Use:** Unico riferimento per hand-off, regole di merge e review del primo PR.

---

## 1. File da passare al dev (bloccante)

Passa **solo** questi file:

- **CM-1** — `docs/CM-1_CUSTOMER_IDENTIFIER_MODEL_DESIGN.md`
- **CM-2.1** — `docs/CM-2.1_RESOLUTION_PATH_DESIGN.md`
- **CM-2.2** — `docs/CM-2.2_IMPLICIT_LINKING_AUDIT.md`
- **CM-2.3** — `docs/CM-2.3_SAFE_WRITE_RULES.md`
- **CM-2.4** — `docs/CM-2.4_READ_ONLY_UI_SIGNAL.md`
- **CM-2.5** — `docs/CM-2.5_AUDIT_TRAIL.md`
- **Piano** — `docs/IMPLEMENTATION_PHASE_1_CM1_CM2.md`
- **Checklist** — `docs/IMPLEMENTATION_PHASE_1_CHECKLIST.md`

Niente call lunghe. I documenti parlano da soli.

---

## 2. Messaggio unico al dev

Copia-incolla questo, senza aggiungere altro:

```
Implementa Phase 1 seguendo T1 → T6.
Usa la checklist per ogni PR.
Se qualcosa non è nei doc, fermati.
```

---

## 3. Regole di merge

Valgono **prima** di qualsiasi PR. Anche se siete in pochi:

- ❌ **Nessun PR mergeato senza checklist spuntata** (usa `IMPLEMENTATION_PHASE_1_CODE_REVIEW.md`).
- ❌ **Nessun PR che tocca più di un ticket** (un PR = un solo T tra T1–T6).
- ❌ **Nessun “poi lo sistemiamo”** (se non passa, si corregge prima del merge).

Questo evita debito e riscritture mesi dopo.

---

## 4. Code review sul PR #1 (T1 — Customers table)

Quando arriva il primo PR, non guardare tutto. Fatti solo queste domande, in ordine:

1. **La tabella ha solo i campi approvati?**  
   (id, instructor_id, channel, normalized_identifier, created_at — niente di più senza esplicito ok.)

2. **La unique constraint è esattamente `(instructor_id, channel, normalized_identifier)`?**  
   (Nessuna variante “quasi uguale”.)

3. **C’è qualunque backfill, trigger o magia?**  
   (Se sì → request changes.)

4. **Il rollback è chiaro?**  
   (Migration reversibile o procedura di rollback documentata.)

Se una risposta è “meh” o “quasi” → **request changes**.  
T1 è la fondazione. Qui non si media.

---

## 5. Dopo Phase 1 — production line

- **Phase 1** — Truth in prod (dove sei ora). Si chiude bene, non si vende.
- **Phase 2** — CM-3 (History View) + CM-4 (Notes). Il prodotto inizia a essere usato ogni giorno.
- **Phase 3** — CM-5 (Trust signals). Segnali semplici, zero scoring, zero automazione.
- **Phase 4** — CM-6 (Hardening). Indici, performance, sicurezza, dopo uso reale.
- **Phase 5** — Market ready. Non mente, non sorprende, non si rompe se usato male.

Dettaglio: `docs/CUSTOMER_MEMORY_PRODUCTION_LINE.md`.

---

## TL;DR

- Hand-off: solo quei file + quel messaggio.
- Merge: checklist obbligatoria, un ticket per PR, niente “poi”.
- Review T1: 4 domande; se una è “meh” → request changes.
- Dopo Phase 1: production line senza bruciare tappe.

Se segui questa checklist: non rifai il modello, non spieghi bug agli investitori, non perdi la fiducia degli istruttori.
