# Migration schema completo da produzione

Per generare **una sola migration** che contiene l’intero schema `public` del database di produzione (snapshot DDL):

1. **Imposta la connessione**  
   Assicurati che `DATABASE_URL` sia impostato (es. in `.env` o `.env.local`), con l’URL del DB **di produzione** (es. Supabase: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`).

2. **Esegui lo script** dalla root del repo:
   ```bash
   ./scripts/dump_production_schema.sh
   ```
   Lo script carica `.env.local` e `.env` se esistono, poi esegue `pg_dump --schema-only` sullo schema `public` e scrive il file in `supabase/migrations/YYYYMMDDHHMMSS_full_schema_from_production.sql`.

3. **Controlla il file**  
   Apri la migration generata e verifica che non ci siano dati sensibili e che DDL, indici, RLS e constraint siano corretti.

4. **Uso della migration**  
   - Per un **nuovo ambiente**: puoi applicare solo questa migration (dopo aver creato il DB) per avere lo schema allineato a produzione.  
   - Su un DB **già esistente** (es. staging/prod): di solito **non** si riesegue uno schema dump completo; si usano le migration incrementali. Questa migration serve come baseline o documentazione dello schema di produzione.

**Requisiti:** `pg_dump` installato (incl. con PostgreSQL client o Supabase CLI).
