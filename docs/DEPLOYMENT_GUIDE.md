# FrostDesk — Guida al Deploy Completa (Step-by-Step)

> Questa guida parte da zero e ti porta ad avere l'app online, accessibile dagli instructor, con aggiornamenti automatici ad ogni push.

---

## Passo passo sintetico (ordine di lavoro)

1. **GitHub** — Codice su repo, branch pushato (es. `feature/ai-foundation` o `main`).
2. **Railway (API)** — New Project da GitHub → stesso repo. Root Directory **vuota**. Build e Start come sotto. Variabili d'ambiente. Generate Domain → salva l'URL.
3. **Vercel Instructor** — New Project da stesso repo. Root Directory **`apps/instructor`**. Niente override su Install (usa `apps/instructor/vercel.json`). Build/Output come sotto. Variabili. Deploy → salva URL.
4. **Vercel Admin** — Altro progetto Vercel, stesso repo. Root **`apps/admin`** (o `./` con output esplicito). Variabili. Deploy.
5. **Railway** — Aggiungi/aggiorna `INSTRUCTOR_APP_URL` con l'URL Vercel instructor.
6. **Webhook** — Meta (WhatsApp) e Stripe puntano all'URL Railway. Copia i signing secret in Railway.
7. **Supabase** — Redirect URLs con gli URL Vercel (instructor + admin).
8. **Test** — Health, login, signup, onboarding.

Dettaglio di ogni passo nelle sezioni sotto.

**Riferimento rapido (copia-incolla)**

| Dove | Root Directory | Build Command | Start / Output |
|------|----------------|----------------|----------------|
| **Railway (API)** | *(vuoto)* | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/api build` | Start: `node apps/api/dist/index.js` |
| **Vercel Instructor** | `apps/instructor` | `cd ../.. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/instructor build` | Output: `.next` |
| **Vercel Admin** | `apps/admin` | `cd ../.. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/admin build` | Output: `.next` |

Su Vercel **non** impostare override per Install Command. Instructor e Admin hanno un `vercel.json` nella rispettiva cartella con `"installCommand": "true"` (install avviene nel Build dalla root del repo).

---

## Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] Un account **GitHub** (gratuito) — https://github.com
- [ ] Un account **Vercel** (gratuito, Hobby plan) — https://vercel.com
- [ ] Un account **Railway** ($5/mese, Starter) — https://railway.app
- [ ] Il progetto **Supabase** gia attivo (`fggheegqtghedvibisma.supabase.co`)
- [ ] Le credenziali **Meta/WhatsApp** (token, phone number ID, verify token)
- [ ] Le credenziali **Stripe** (secret key, webhook secret)
- [ ] La chiave **OpenAI** (API key)
- [ ] **Node.js >= 18** installato sul tuo Mac
- [ ] **pnpm** installato (`npm install -g pnpm`)
- [ ] **Git** installato (ce l'hai gia)

---

## FASE 1 — Preparare il Repository su GitHub

### 1.1 Crea il repository su GitHub

1. Vai su https://github.com/new
2. Nome: `frostdesk-core` (o come preferisci)
3. Visibilita: **Private** (raccomandato)
4. NON inizializzare con README (hai gia il codice)
5. Clicca "Create repository"

### 1.2 Collega il tuo progetto locale a GitHub

Apri il terminale nella cartella del progetto:

```bash
cd ~/Desktop/frostdesk-core
```

Aggiungi il remote GitHub (sostituisci `TUO_USERNAME` con il tuo username GitHub):

```bash
git remote add origin https://github.com/TUO_USERNAME/frostdesk-core.git
```

Se il remote `origin` esiste gia, verificalo:

```bash
git remote -v
```

Se punta a un altro URL e vuoi cambiarlo:

```bash
git remote set-url origin https://github.com/TUO_USERNAME/frostdesk-core.git
```

### 1.3 Pusha il codice

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push -u origin feature/ai-foundation
```

> Il branch attuale e `feature/ai-foundation`. Dopo il primo deploy funzionante, farai merge su `main`.

### 1.4 Verifica

Vai su GitHub nel browser. Dovresti vedere tutto il codice del progetto.

---

## FASE 2 — Deploy dell'API (Fastify) su Railway

L'API e il cuore: gestisce i webhook WhatsApp e Stripe, e serve i dati alle app frontend.

### 2.1 Crea il progetto su Railway

1. Vai su https://railway.app e fai login (puoi usare GitHub)
2. Clicca **"New Project"**
3. Seleziona **"Deploy from GitHub Repo"**
4. Autorizza Railway ad accedere al tuo repo GitHub
5. Seleziona `frostdesk-core`

### 2.2 Configura il servizio API

Railway importera il repo. Ora devi configurarlo:

1. Clicca sul servizio creato
2. Vai nella tab **"Settings"**
3. Imposta:
   - **Root Directory**: lascia **vuoto** (così build e start partono dalla root del repo, dove c’è `pnpm-lock.yaml`)
   - **Build Command**:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/api build
     ```
     (Se l’API dipende da db/ai, puoi usare: `pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/ai build && pnpm --filter @frostdesk/api build` dopo `pnpm install`.)
   - **Start Command**:
     ```
     node apps/api/dist/index.js
     ```
   - **Watch Paths**: lascia vuoto (rebuilda su ogni push)

4. Nella sezione **"Networking"**:
   - Clicca **"Generate Domain"** per ottenere un URL pubblico
   - Otterrai qualcosa come: `frostdesk-api-production.up.railway.app`
   - **Salva questo URL**, ti servira dopo

### 2.3 Configura le variabili d'ambiente

Vai nella tab **"Variables"** e aggiungi TUTTE queste variabili:

```env
# ── Supabase ──
SUPABASE_URL=https://fggheegqtghedvibisma.supabase.co
SUPABASE_ANON_KEY=<la tua anon key da Supabase Dashboard → Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<la tua service role key da Supabase Dashboard → Settings → API>

# ── OpenAI ──
OPENAI_API_KEY=<la tua OpenAI API key da https://platform.openai.com/api-keys>

# ── WhatsApp / Meta ──
META_WHATSAPP_TOKEN=<il token dalla Meta Developer Console>
META_WHATSAPP_PHONE_NUMBER_ID=<il phone number ID da Meta>
META_VERIFY_TOKEN=frostdesk_verify_2026

# ── Stripe ──
STRIPE_SECRET_KEY=<la tua Stripe secret key da https://dashboard.stripe.com/apikeys>
STRIPE_WEBHOOK_SECRET=<lo aggiungerai dopo, al passo 5.2>

# ── App Config ──
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
INSTRUCTOR_APP_URL=<lo aggiungerai dopo il deploy Vercel, passo 3.5>

# ── AI Features ──
ENABLE_AI_SUMMARY=1
ENABLE_AI_USAGE_TELEMETRY=1
```

> **Dove trovare le chiavi Supabase:**
> 1. Vai su https://supabase.com/dashboard
> 2. Seleziona il tuo progetto
> 3. Vai in **Settings → API**
> 4. Copia `Project URL`, `anon public key` e `service_role secret key`

### 2.4 Fai il deploy

1. Railway fara il primo deploy automaticamente quando salvi le variabili
2. Vai nella tab **"Deployments"** per seguire il progresso
3. Aspetta che lo status diventi **"Success"** (2-5 minuti)

### 2.5 Verifica che l'API funzioni

Apri nel browser:

```
https://TUO-URL-RAILWAY.up.railway.app/health
```

Dovresti vedere una risposta JSON tipo `{ "status": "ok" }`.

Se non funziona, clicca sulla deployment e leggi i **logs** per capire l'errore.

---

## FASE 3 — Deploy dell'Instructor App (Next.js) su Vercel

### 3.1 Crea il progetto su Vercel

1. Vai su https://vercel.com e fai login (usa GitHub)
2. Clicca **"Add New..." → "Project"**
3. Seleziona il repo `frostdesk-core` da GitHub
4. **IMPORTANTE** — Prima di cliccare deploy, configura tutto come descritto sotto

### 3.2 Configura il progetto

Nella schermata di setup:

- **Framework Preset**: Next.js (auto-detectato da `apps/instructor/package.json`)
- **Root Directory**: **`apps/instructor`** (così Vercel trova Next.js e usa `apps/instructor/vercel.json`)
- **Install Command**: **non** sovrascrivere (in `apps/instructor/vercel.json` c’è `"installCommand": "true"`: install avviene nel Build)
- **Build Command** (Override):
  ```
  cd ../.. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/instructor build
  ```
- **Output Directory** (Override): **`.next`** (relativo a `apps/instructor`)

### 3.3 Configura le variabili d'ambiente

Nella stessa schermata di setup, nella sezione "Environment Variables", aggiungi:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fggheegqtghedvibisma.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<la tua anon key>` |
| `NEXT_PUBLIC_API_URL` | `https://TUO-URL-RAILWAY.up.railway.app` |

> Usa l'URL Railway che hai ottenuto al passo 2.2.

### 3.4 Deploy

1. Clicca **"Deploy"**
2. Aspetta il build (3-5 minuti la prima volta)
3. Quando finisce, Vercel ti da un URL tipo: `frostdesk-instructor.vercel.app`
4. **Salva questo URL**

### 3.5 Aggiorna la variabile Railway

Ora che hai l'URL dell'instructor app, torna su Railway e aggiorna la variabile:

```
INSTRUCTOR_APP_URL=https://frostdesk-instructor.vercel.app
```

Railway fara automaticamente un re-deploy.

### 3.6 Verifica

Apri nel browser: `https://frostdesk-instructor.vercel.app`

Dovresti vedere la pagina di login/redirect. Se vedi errori, controlla:
- I logs su Vercel: tab "Deployments" → clicca sulla deployment → "Runtime Logs"
- La console del browser (F12 → Console)

---

## FASE 4 — Deploy dell'Admin App su Vercel (opzionale ma consigliato)

### 4.1 Crea un secondo progetto Vercel

1. Su Vercel, clicca **"Add New..." → "Project"**
2. Seleziona lo **stesso repo** `frostdesk-core`
3. Crea **`apps/admin/vercel.json`** in repo con `{"installCommand": "true"}` (come per instructor), poi configura:
   - **Root Directory**: **`apps/admin`**
   - **Install Command**: **non** sovrascrivere
   - **Build Command** (Override):
     ```
     cd ../.. && corepack enable && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/admin build
     ```
   - **Output Directory** (Override): **`.next`**

### 4.2 Variabili d'ambiente

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fggheegqtghedvibisma.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<la tua anon key>` |
| `NEXT_PUBLIC_API_URL` | `https://TUO-URL-RAILWAY.up.railway.app` |

### 4.3 Deploy e verifica

Clicca **Deploy**. Otterrai un URL tipo `frostdesk-admin.vercel.app`.

---

## FASE 5 — Configurare i Webhook Esterni

### 5.1 Webhook WhatsApp (Meta)

1. Vai su https://developers.facebook.com
2. Seleziona la tua app
3. Nel menu a sinistra: **WhatsApp → Configuration**
4. Nella sezione **Webhook**:
   - Clicca **"Edit"** (o **"Configure"**)
   - **Callback URL**: `https://TUO-URL-RAILWAY.up.railway.app/webhook`
   - **Verify Token**: `frostdesk_verify_2026` (deve corrispondere a `META_VERIFY_TOKEN` nelle variabili Railway)
   - Clicca **"Verify and Save"**
5. Sotto **Webhook fields**, sottoscrivi:
   - `messages` ✅

> **Se la verifica fallisce:**
> - Controlla che l'API Railway sia online (visita `/health`)
> - Controlla che `META_VERIFY_TOKEN` su Railway corrisponda esattamente
> - Controlla i logs Railway per vedere la richiesta di verifica

### 5.2 Webhook Stripe (Pagamenti)

1. Vai su https://dashboard.stripe.com/webhooks
2. Clicca **"Add endpoint"**
3. **Endpoint URL**: `https://TUO-URL-RAILWAY.up.railway.app/webhook/stripe`
4. **Events to send** — clicca "Select events" e seleziona:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Clicca **"Add endpoint"**
6. Nella pagina dell'endpoint appena creato, clicca **"Reveal"** sotto "Signing secret"
7. Copia il signing secret (inizia con `whsec_...`)
8. **Vai su Railway → Variables** e imposta:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...il_tuo_signing_secret
   ```

### 5.3 Webhook Stripe Subscription (se usi le subscription SaaS)

1. Crea un **secondo endpoint** su Stripe Webhooks:
   - **URL**: `https://TUO-URL-RAILWAY.up.railway.app/webhook/stripe/subscription`
   - **Events**:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`

---

## FASE 6 — Configurare Supabase per la Produzione

### 6.1 Verifica le migration

Le migration del database dovrebbero gia essere applicate sul tuo progetto Supabase. Verifica:

1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto
3. Vai in **Table Editor**
4. Verifica che le tabelle principali esistano:
   - `instructor_profiles`
   - `conversations`
   - `messages`
   - `bookings`
   - `customers`
   - `customer_profiles`
   - `inbound_messages`

Se mancano tabelle, devi applicare le migration. Dal terminale locale:

```bash
cd ~/Desktop/frostdesk-core
npx supabase db push
```

### 6.2 Configura l'autenticazione (CRITICO)

1. Su Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `https://frostdesk-instructor.vercel.app`
3. **Redirect URLs** — aggiungi tutti questi:
   ```
   https://frostdesk-instructor.vercel.app/**
   https://frostdesk-admin.vercel.app/**
   ```
4. Clicca **Save**

> **IMPORTANTE:** senza questo passaggio, login e signup NON funzioneranno in produzione! Supabase blocchera i redirect verso URL non autorizzati.

### 6.3 Verifica Email Provider

1. Su Supabase Dashboard → **Authentication → Providers**
2. Verifica che **Email** sia abilitato
3. **Per il pilot/test**: puoi disabilitare "Confirm email" temporaneamente
   - Vai in **Authentication → Settings → Email Auth**
   - Disabilita "Enable email confirmations" (cosi gli instructor si registrano subito)
   - **Riabilitalo** prima del lancio pubblico

---

## FASE 7 — Test End-to-End

Segui questi test nell'ordine. Se uno fallisce, risolvi prima di andare avanti.

### 7.1 Test Health Check API

```
Apri: https://TUO-URL-RAILWAY.up.railway.app/health
Atteso: risposta JSON con status "ok"
```

### 7.2 Test Pagina Instructor

```
Apri: https://frostdesk-instructor.vercel.app
Atteso: redirect alla pagina di login
```

### 7.3 Test Signup Instructor

1. Vai su `https://frostdesk-instructor.vercel.app/instructor/signup`
2. Inserisci una email di test e password (minimo 8 caratteri)
3. Se la conferma email e attiva: controlla la tua email e clicca il link di conferma
4. Se hai disabilitato la conferma email: vai direttamente al login

### 7.4 Test Login

1. Vai su `https://frostdesk-instructor.vercel.app/instructor/login`
2. Inserisci le credenziali appena create
3. Dovresti essere rediretto a `/instructor/approval-pending`

### 7.5 Approva l'Instructor

**Opzione A — Da Supabase (piu veloce per il test):**
1. Dashboard Supabase → Table Editor → `instructor_profiles`
2. Trova il record dell'instructor appena registrato
3. Cambia il campo `status` in `approved`
4. Salva

**Opzione B — Dall'Admin App:**
1. Vai su `https://frostdesk-admin.vercel.app`
2. Trova l'instructor e approvalo

### 7.6 Test Onboarding

1. L'instructor fa login di nuovo
2. Viene rediretto a `/instructor/onboarding/form`
3. Compila tutti i dati richiesti: nome, servizi, meeting points, etc.
4. Dopo il completamento → redirect alla dashboard

### 7.7 Test Dashboard

Verifica che la dashboard carichi correttamente:
- Header con nome instructor
- Sezioni: bookings, inbox, calendario
- Nessun errore nella console browser (F12)

### 7.8 Test WhatsApp (se hai gia il numero configurato)

1. Da un telefono, manda un messaggio WhatsApp al numero configurato
2. Aspetta 5-10 secondi
3. Nell'inbox dell'instructor app, dovrebbe apparire il messaggio
4. Verifica che la bozza AI venga generata

### 7.9 Test Stripe (se hai gia Stripe Connect attivo)

1. Dall'app instructor, verifica il collegamento Stripe Connect
2. Crea una booking di test
3. Verifica il flusso di pagamento

---

## FASE 8 — Come Fare Aggiornamenti (Workflow Quotidiano)

### Flusso standard

Ogni volta che vuoi fare un aggiornamento e renderlo live:

```bash
# 1. Fai le tue modifiche nel codice (con Cursor, VS Code, etc.)

# 2. Verifica cosa hai cambiato
git status
git diff

# 3. Aggiungi i file modificati
git add .

# 4. Crea un commit con un messaggio descrittivo
git commit -m "fix: corretto il form di onboarding"

# 5. Pusha su GitHub
git push
```

**Fatto!** Vercel e Railway rileveranno il push e faranno il rebuild automaticamente.

### Tempi di deploy

| Servizio | Tempo di rebuild | Downtime |
|----------|-----------------|----------|
| Vercel (instructor + admin) | ~1-3 minuti | **Zero** (atomic deploy) |
| Railway (API) | ~2-4 minuti | ~5 secondi (swap) |

### Monitorare i deploy

- **Vercel**: https://vercel.com → Progetto → tab "Deployments"
- **Railway**: https://railway.app → Progetto → tab "Deployments"
- Entrambi mostrano **logs in tempo reale** cliccando sulla deployment

### Rollback (se qualcosa si rompe)

**Su Vercel:**
1. Vai nella lista Deployments
2. Trova l'ultimo deploy funzionante
3. Clicca i tre puntini **"..."** → **"Promote to Production"**

**Su Railway:**
1. Vai nella lista Deployments
2. Clicca **"Rollback"** sulla deployment funzionante precedente

---

## FASE 9 — Dominio Custom (Opzionale)

Se vuoi usare un dominio tipo `app.frostdesk.it` al posto degli URL generati automaticamente.

### 9.1 Configura dominio su Vercel

1. Vai su Vercel → il tuo progetto instructor → **Settings → Domains**
2. Aggiungi `app.frostdesk.it` (o il dominio che preferisci)
3. Vercel ti mostra i **record DNS** da configurare
4. Vai nel pannello del tuo domain provider (es. Namecheap, GoDaddy, Cloudflare)
5. Aggiungi il record DNS indicato da Vercel (di solito un **CNAME**)
6. Aspetta la propagazione DNS (da 5 minuti a 48 ore)

### 9.2 Configura dominio su Railway

1. Vai su Railway → il tuo progetto API → **Settings → Networking → Custom Domain**
2. Aggiungi `api.frostdesk.it`
3. Configura i record DNS come indicato da Railway

### 9.3 Aggiorna tutti i riferimenti

Dopo aver configurato i domini custom, aggiorna questi valori:

| Dove | Variabile | Nuovo valore |
|------|-----------|-------------|
| Vercel (instructor) | `NEXT_PUBLIC_API_URL` | `https://api.frostdesk.it` |
| Vercel (admin) | `NEXT_PUBLIC_API_URL` | `https://api.frostdesk.it` |
| Railway | `INSTRUCTOR_APP_URL` | `https://app.frostdesk.it` |
| Supabase Auth | Site URL | `https://app.frostdesk.it` |
| Supabase Auth | Redirect URLs | `https://app.frostdesk.it/**` |
| Meta Developer Console | Webhook Callback URL | `https://api.frostdesk.it/webhook` |
| Stripe Dashboard | Webhook endpoint | `https://api.frostdesk.it/webhook/stripe` |

---

## Troubleshooting

### L'API non parte su Railway

- Controlla i **logs** nella tab Deployments
- Verifica che **TUTTE** le variabili d'ambiente siano impostate
- Errore comune: `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` mancante
- Errore `Cannot find module`: verifica che il Build Command includa tutti i `--filter` necessari

### Login/Signup non funziona

- Verifica su Supabase: **Authentication → URL Configuration** che il Site URL sia corretto
- Verifica che i **Redirect URLs** includano il dominio Vercel
- Controlla la console del browser (F12 → Console) per errori specifici
- Se vedi `redirect_uri_mismatch`: aggiungi l'URL esatto nei Redirect URLs di Supabase

### Webhook WhatsApp non verifica

- Verifica che l'API sia raggiungibile: visita `https://TUO-URL-RAILWAY/health`
- Verifica che `META_VERIFY_TOKEN` su Railway corrisponda **esattamente** a quello inserito su Meta
- Controlla i logs Railway per vedere se la richiesta di verifica arriva
- Se il log mostra 404: il route potrebbe non essere registrato, controlla il build

### Build fallisce su Vercel

- Errore `Module not found`: assicurati che il Build Command includa il build di `@frostdesk/db` e `@frostdesk/ai`
- Errore `lockfile`: assicurati che `pnpm-lock.yaml` sia committato nel repo
- Errore di memoria: su Hobby plan hai 1GB di RAM per il build; se non basta, vai su Pro

### Pagina bianca o errore 500

- Controlla i **Function Logs** su Vercel (Deployments → la tua deployment → Logs)
- Verifica che `NEXT_PUBLIC_API_URL` punti all'URL Railway corretto (con `https://`)
- Verifica che l'API Railway sia online
- Controlla che le env vars su Vercel siano impostate per l'environment "Production"

### I messaggi WhatsApp non arrivano nell'inbox

- Verifica che il webhook sia configurato e verificato su Meta
- Controlla i logs Railway per il route `/webhook/whatsapp`
- Verifica che il customer sia stato creato in `customer_profiles`
- Verifica che la conversation sia stata creata in `conversations`

---

## Riepilogo URL

Dopo il deploy completo avrai:

| Servizio | URL |
|----------|-----|
| Instructor App | `https://frostdesk-instructor.vercel.app` |
| Admin App | `https://frostdesk-admin.vercel.app` |
| API | `https://frostdesk-api-production.up.railway.app` |
| Health Check | `https://frostdesk-api-production.up.railway.app/health` |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| Railway Dashboard | https://railway.app/dashboard |

---

## Costi Mensili Stimati

| Servizio | Piano | Costo |
|----------|-------|-------|
| Vercel | Hobby (gratuito) | $0 |
| Railway | Starter | ~$5/mese |
| Supabase | Free tier | $0 |
| OpenAI API | Pay-as-you-go | ~$5-20/mese (dipende dall'uso) |
| Stripe | Pay-as-you-go | 1.4% + €0.25 per transazione |
| Dominio (opzionale) | Annuale | ~$10-15/anno |

**Totale minimo per partire: ~$5/mese** (solo Railway)
