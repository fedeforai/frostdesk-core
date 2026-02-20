# Audit e pulizia codice

**Data:** 2026-02-20

## 1. File duplicati (" 2", " 3", …)

- **Problema:** oltre 300 file con nome tipo `page 2.tsx`, `migration 3.sql` (copie accidentali).
- **Azione:** aggiunto in `.gitignore` i pattern `* 2.*` … `* 9.*`; rimossi da disco i file corrispondenti (untracked) per evitare confusione e commit accidentali.
- **Nota:** i file canonici (senza numero) restano; nessuna modifica al codice attivo.

## 2. TODO in codice

- **`apps/api/src/routes/webhook_whatsapp.ts`** (circa riga 346): `// TODO: detect from message or payload` per la lingua. Non bloccante; da affrontare se si vuole lingua dinamica.

## 3. Console (log/warn/error)

- **Gate / requireInstructorAccess:** `console.error` e `console.warn` usati di proposito per diagnostica (ensure-profile, dev).
- **API:** log in `index.ts`, `startupSchemaCheck.ts`, proxy instructor; utili per produzione.
- **Script dev:** `console.log` in `sim_harness`, `seed_*`, ecc. — solo in dev.
- **Conclusione:** nessuna rimozione; uso coerente con ambiente.

## 4. Codice legacy / fuori scope

- **`apps/api/src/routes/webhook.ts`:** marcato esplicitamente come LEGACY per WhatsApp; il flusso WhatsApp usa `webhook_whatsapp.ts`. Nessuna modifica; documentazione chiara.

## 5. Bug fix recenti (già applicati)

- Ensure-profile: body `'{}'` inviato in POST per evitare `FST_ERR_CTP_EMPTY_JSON_BODY` (commit 636b090).
- Creazione profilo instructor via API (ensure-profile) invece che INSERT Supabase (RLS).

## 6. Dipendenze e export

- `getSupabaseServerAdmin` ancora usato in `requireInstructorAccess.ts` come fallback per creazione profilo; la gate usa l’API. Coerenza verificata; nessun dead code rilevato.
