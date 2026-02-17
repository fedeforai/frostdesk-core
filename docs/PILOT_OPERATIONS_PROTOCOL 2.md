# FrostDesk — Protocollo Operativo Pilot

> Documento operativo per le prossime settimane di pilot.
> Ultima revisione: 2026-02-15

---

## 1. Setup iniziale (una volta)

### 1.1 Ambiente locale

```bash
# Clona e installa
git clone <repo> && cd frostdesk-core
pnpm install

# Copia env
cp .env.example .env.local
```

Modifica `.env.local` con i valori reali:

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | Si | Connection string Postgres (Supabase pooler o locale) |
| `SUPABASE_URL` | Si | URL progetto Supabase |
| `SUPABASE_ANON_KEY` | Si | Chiave pubblica Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Si | Chiave service role (solo backend) |
| `OPENAI_API_KEY` | Si | Per AI drafts e analisi |
| `META_WHATSAPP_TOKEN` | Si | Token WhatsApp Cloud API |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Si | ID numero WhatsApp |
| `META_VERIFY_TOKEN` | Si | Token verifica webhook Meta |
| `PILOT_INSTRUCTOR_IDS` | Pilot | UUID istruttori pilot, separati da virgola |
| `DEFAULT_INSTRUCTOR_ID` | Si | UUID istruttore default per messaggi WhatsApp |

### 1.2 Avvio servizi

```bash
# Terminal 1 — API Fastify (porta 3001)
pnpm --filter @frostdesk/api dev

# Terminal 2 — Instructor app (porta 3002)
pnpm --filter @frostdesk/instructor dev

# Terminal 3 — Admin app (porta 3000)
pnpm --filter @frostdesk/admin dev
```

Oppure con turborepo:
```bash
pnpm dev:admin    # API + Admin
pnpm dev          # Tutto
```

### 1.3 Verifica

| Check | URL | Atteso |
|---|---|---|
| API health | `http://localhost:3001/health` | `{ "ok": true }` |
| Admin login | `http://localhost:3000/admin/dashboard` | Dashboard con dati reali |
| Instructor login | `http://localhost:3002/login` | Pagina login |

---

## 2. Aggiungere un nuovo istruttore

### Flusso completo (produzione)

```
Istruttore                    Sistema                     Admin
    |                            |                           |
    |-- Signup (email/pwd) ----->|                           |
    |                            |-- Crea auth.users row     |
    |-- Prima visita app ------->|                           |
    |                            |-- Auto-crea profilo       |
    |                            |   (instructor_profiles)   |
    |                            |   approval_status=pending |
    |                            |                           |
    |                            |<-- Notifica pending ------|
    |                            |                           |
    |                            |-- Admin approva --------->|
    |                            |   approval_status=approved|
    |                            |                           |
    |-- Completa onboarding ---->|                           |
    |   (nome, resort, lingua,   |                           |
    |    whatsapp, bio)          |                           |
    |                            |-- onboarding_status=      |
    |                            |   completed               |
    |                            |                           |
    |-- Accede alla dashboard -->|                           |
```

### Step by step

1. **L'istruttore si registra** su `http://localhost:3002/signup`
   - Inserisce email e password
   - Conferma email (se richiesto da Supabase)

2. **Il sistema crea automaticamente il profilo** quando l'istruttore accede per la prima volta
   - `instructor_profiles` row con `approval_status = 'pending'`

3. **L'admin approva** da `http://localhost:3000/admin/instructor-approvals`
   - Clicca "Approva" sull'istruttore in lista

4. **L'istruttore completa l'onboarding** su `http://localhost:3002/instructor/onboarding`
   - Step 1: Nome completo, resort base, lingua
   - Step 2: Telefono WhatsApp, anni esperienza, bio
   - Step 3: Revisione e conferma

5. **Ora l'istruttore puo usare l'app**:
   - Dashboard, prenotazioni, clienti, inbox

### Shortcut (test/dev)

Se vuoi saltare il signup e creare un istruttore direttamente via SQL:

```sql
-- 1. Trova lo user_id dall'auth (dopo signup Supabase)
SELECT id, email FROM auth.users WHERE email = 'istruttore@example.com';

-- 2. Il profilo viene creato automaticamente al primo accesso.
--    Se vuoi forzarlo:
INSERT INTO instructor_profiles (user_id, full_name, approval_status, profile_status)
VALUES ('<user_id>', 'Mario Rossi', 'approved', 'active');
```

---

## 3. Attivare un istruttore come Pilot

### Requisiti
- L'istruttore deve avere un profilo in `instructor_profiles`
- Il profilo deve essere `approval_status = 'approved'`

### Procedura

1. **Trova l'ID del profilo istruttore**:

```sql
SELECT id, user_id, full_name, approval_status
FROM instructor_profiles
WHERE approval_status = 'approved';
```

L'`id` che ti serve e quello della colonna `id` di `instructor_profiles` (NON `user_id`).

2. **Aggiungi a `.env.local`**:

```bash
# Un solo pilot
PILOT_INSTRUCTOR_IDS=a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Piu pilot (separati da virgola, senza spazi)
PILOT_INSTRUCTOR_IDS=uuid1,uuid2,uuid3
```

3. **Riavvia l'API** (il cambio env richiede restart):

```bash
# Se usi tsx watch, basta toccare un file:
touch apps/api/src/server.ts
# Oppure Ctrl+C e riavvia
```

4. **Verifica**:
   - Il pilot puo creare prenotazioni (POST /instructor/bookings → 201)
   - Un non-pilot riceve 402 PILOT_ONLY
   - La dashboard admin mostra "Pilot: N istruttori"

### Cosa succede senza PILOT_INSTRUCTOR_IDS

| Scenario | Risultato |
|---|---|
| Env vuoto o non settato | TUTTE le mutazioni tornano 402 |
| UUID sbagliato | Quell'istruttore riceve 402 |
| UUID corretto | Solo quel pilot puo creare/modificare |
| GET (lista prenotazioni, clienti) | Sempre accessibili a tutti |

**Se vedi 402 ovunque, controlla `PILOT_INSTRUCTOR_IDS` e che sia `instructor_profiles.id` (non `user_id`).**

---

## 4. Aggiungere un admin

### Procedura

1. L'utente deve avere un account Supabase (registrato via signup qualsiasi app)

2. Trova il suo `user_id`:

```sql
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';
```

3. Inserisci nella tabella `admin_users`:

```sql
INSERT INTO admin_users (user_id)
VALUES ('<user_id_uuid>');
```

4. L'utente puo ora accedere a `http://localhost:3000/admin/dashboard`

### Ruoli admin

| Ruolo | Visibilita sidebar | Come assegnare |
|---|---|---|
| `system_admin` | Tutto (incluso System) | Tabella `user_roles` o `admin_users` + logica interna |
| `human_approver` | Dashboard, Approvals, Pilot, Inbox, Bookings, Calendar | Tabella `user_roles` |
| `human_operator` | Dashboard, Approvals, Pilot, Inbox, Bookings, Calendar | Tabella `user_roles` |

---

## 5. Monitoraggio quotidiano (pilot attivo)

### Dashboard Admin — Cosa controllare ogni giorno

| Sezione | KPI | Allarme se |
|---|---|---|
| **Stato sistema** | AI Globale ON, Emergency OFF | Rosso |
| **Oggi** | Conversazioni nuove, Messaggi in/out | Tutto a 0 dopo orario lavorativo |
| **AI** | Tasso approvazione draft | < 30% |
| **AI** | Errori AI oggi | > 3 |
| **AI** | Escalation oggi | > 5 |
| **AI Costi 7gg** | Costo totale | > $10 (pilot) |
| **AI Costi 7gg** | Latenza media | > 3000ms |
| **AI Costi 7gg** | Tasso errore | > 5% |
| **Istruttori** | Attivi 7gg | 0 = nessuno usa il sistema |
| **Prenotazioni** | Create 7gg | 0 = nessuna attivita |
| **Salute 24h** | Webhook errori | > 0 = investigare |
| **Salute 24h** | Quota superata | > 0 = aumentare limiti |

### Metriche di successo pilot (7 giorni)

Misurabili dagli audit events gia implementati:

| Metrica | Query audit_log | Target |
|---|---|---|
| Prenotazioni create per istruttore | `action = 'booking_created'` GROUP BY actor_id | >= 5/settimana |
| Prenotazioni modificate | `action = 'booking_details_updated'` | Qualsiasi uso = buon segno |
| Note cliente aggiunte | `action = 'customer_note_added'` | >= 3/settimana |
| Cancellazioni | Tabella `bookings` WHERE status='cancelled' | < 20% del totale |
| Tempo primo booking | MIN(booking.created_at) - MIN(audit_log.created_at) per instructor | < 48h |

### Query rapida metriche pilot

```sql
-- Attivita pilot ultimi 7 giorni
SELECT
  actor_id AS instructor_id,
  action,
  COUNT(*) AS count
FROM audit_log
WHERE actor_type = 'instructor'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY actor_id, action
ORDER BY actor_id, count DESC;
```

---

## 6. Troubleshooting rapido

| Sintomo | Causa probabile | Fix |
|---|---|---|
| 402 su tutte le mutazioni | `PILOT_INSTRUCTOR_IDS` vuoto o sbagliato | Controlla .env.local, usa `instructor_profiles.id` |
| Dashboard admin vuota | API non raggiungibile | Verifica `http://localhost:3001/health` |
| "Connessione non riuscita" | API Fastify non avviata | Avvia con `pnpm --filter @frostdesk/api dev` |
| "UPSTREAM_DOWN" | Next.js proxy non raggiunge Fastify | Verifica `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| Instructor vede "pending approval" | Admin non ha ancora approvato | Vai su admin/instructor-approvals |
| Admin login fallisce | Utente non in `admin_users` | INSERT in admin_users |
| AI drafts non generati | `OPENAI_API_KEY` mancante o AI disabilitata | Controlla env e feature_flags |
| WhatsApp messaggi non arrivano | Token/webhook non configurati | Controlla META_WHATSAPP_TOKEN |

---

## 7. Checklist settimanale

```
[ ] Dashboard admin: tutti i KPI verdi?
[ ] Prenotazioni create questa settimana > 0?
[ ] Errori AI < 5?
[ ] Costo AI ragionevole (< budget)?
[ ] Nessun webhook error nelle ultime 24h?
[ ] Feedback istruttori raccolto?
[ ] Nuovi istruttori da aggiungere al pilot?
[ ] Backup env vars aggiornato?
```

---

## 8. Prossimi step dopo pilot (CR2 / CR3)

### CR2 — Pricing + Billing Gate
- Sostituire `PILOT_INSTRUCTOR_IDS` con `billing_status` su `instructor_profiles`
- Valori: `pilot`, `active`, `past_due`, `cancelled`
- Gate mutazioni su `billing_status` invece di env var
- Integrazione Stripe Connect (gia scaffoldata)

### CR3 — Retention Loop
- Storico prenotazioni per cliente
- Metriche: last interaction, repeat rate, value trend
- Template note rapide (3 tag)
- Notifiche proattive per istruttori inattivi

---

## Appendice: Porte e URL

| Servizio | Porta | URL |
|---|---|---|
| API Fastify | 3001 | `http://localhost:3001` |
| Admin Next.js | 3000 | `http://localhost:3000` |
| Instructor Next.js | 3002 | `http://localhost:3002` |
| Supabase (cloud) | — | `https://fggheegqtghedvibisma.supabase.co` |
| Supabase Studio | — | `https://supabase.com/dashboard/project/fggheegqtghedvibisma` |
