# Go Live — Admin, Instructor e API

Checklist operativa per mettere online **API**, **Instructor App** e **Admin App**. Per dettagli completi vedi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Prima di partire

- [ ] Codice pushato su GitHub (branch che vuoi deployare, es. `feature/ai-foundation` o `main`)
- [ ] Credenziali pronte: Supabase (URL + anon + service_role), OpenAI, Meta/WhatsApp, Stripe (opzionale ma consigliato)
- [ ] Build locale verificata (vedi sotto)

---

## Prerequisiti deploy (multi-tenant WhatsApp)

**Modello:** Ogni maestro ha il **proprio numero WhatsApp** registrato nel suo profilo (onboarding o Impostazioni). Quel numero funziona **solo per lui**: le conversazioni in arrivo su quel numero vengono associate a quell’istruttore e compaiono nella sua Inbox. Non c’è un numero condiviso: un numero = un istruttore.

- [ ] **Migration 20260326120000** applicata su **staging** poi **prod** (`supabase db push` o equivalente). La migration aggiunge indice e commento su `instructor_whatsapp_accounts.phone_number` per l’auto-associazione webhook.
- [ ] **Per ogni instructor:** verificare che in `instructor_whatsapp_accounts` esista una riga con il **phone_number in formato E.164** (quello inserito in onboarding o in Impostazioni). Al primo messaggio ricevuto su quel numero, il webhook assocerà automaticamente il `phone_number_id` di Meta a quella riga; l’inbox di quell’instructor riceverà le conversazioni.

---

## 1. API (Railway)

1. **Railway** → New Project → Deploy from GitHub Repo → `frostdesk-core`
2. **Settings** del servizio:
   - **Root Directory**: `apps/api`
   - **Build Command**:
     ```bash
     cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/ai build && pnpm --filter @frostdesk/api build
     ```
   - **Start Command**: `node dist/index.js`
3. **Networking** → Generate Domain → salva l’URL (es. `frostdesk-api-production.up.railway.app`)
4. **Variables** — imposta tutte (vedi [DEPLOYMENT_GUIDE.md § 2.3](./DEPLOYMENT_GUIDE.md#23-configura-le-variabili-dambiente)):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (se usi Stripe)
   - `PORT=3001`, `HOST=0.0.0.0`, `NODE_ENV=production`
   - `INSTRUCTOR_APP_URL` → **lo imposti dopo** il deploy Instructor (Fase 3). **Obbligatorio per Calendar OAuth:** deve essere l’URL pubblico dell’app Instructor (es. `https://www.frostdesk.ai`), altrimenti dopo il login Google il redirect va su localhost e la connessione fallisce.
5. Verifica: apri `https://TUO-URL-RAILWAY/health` → risposta `{ "status": "ok" }`

---

## 2. Instructor App (Vercel)

1. **Vercel** → Add New → Project → repo `frostdesk-core`
2. Configurazione:
   - **Root Directory**: `apps/instructor`
   - **Build Command** (Override):
     ```bash
     cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/ai build && pnpm --filter @frostdesk/instructor build
     ```
   - **Install Command** (Override): `pnpm install --frozen-lockfile`
3. **Environment Variables** (Production):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fggheegqtghedvibisma.supabase.co` (o il tuo progetto) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tua anon key Supabase |
   | `NEXT_PUBLIC_API_URL` | `https://TUO-URL-RAILWAY.up.railway.app` (URL API da Fase 1) |

4. Deploy → salva l’URL (es. `frostdesk-instructor.vercel.app`)
5. **Torna su Railway** → Variables → imposta `INSTRUCTOR_APP_URL=https://frostdesk-instructor.vercel.app` (triggera re-deploy API)

---

## 3. Admin App (Vercel)

1. **Vercel** → Add New → Project → stesso repo `frostdesk-core`
2. Configurazione:
   - **Root Directory**: `apps/admin`
   - **Build Command** (Override):
     ```bash
     cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/admin build
     ```
   - **Install Command** (Override): `pnpm install --frozen-lockfile`
3. **Environment Variables** (Production):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | come per Instructor |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | come per Instructor |
   | `NEXT_PUBLIC_API_URL` | `https://TUO-URL-RAILWAY.up.railway.app` |

   Se usi il cron dei report (Fase 5 della guida), aggiungi anche `CRON_SECRET` (e lato API `ADMIN_REPORTS_CRON_SECRET`).
4. Deploy → salva l’URL (es. `frostdesk-admin.vercel.app`)

---

## 4. Supabase Auth (obbligatorio per login)

1. **Supabase Dashboard** → Authentication → URL Configuration
2. **Site URL**: `https://frostdesk-instructor.vercel.app` (o il tuo URL Instructor)
3. **Redirect URLs** — aggiungi:
   - `https://frostdesk-instructor.vercel.app/**`
   - `https://frostdesk-admin.vercel.app/**`
4. Save

Senza questo il login Instructor/Admin in produzione non funziona.

---

## 5. Webhook (dopo che l’API è online)

- **WhatsApp (Meta)**  
  Callback URL: `https://TUO-URL-RAILWAY/webhook`  
  Verify Token: stesso valore di `META_VERIFY_TOKEN` su Railway.

- **Stripe**  
  Endpoint: `https://TUO-URL-RAILWAY/webhook/stripe`  
  Signing secret → variabile `STRIPE_WEBHOOK_SECRET` su Railway.

Dettagli in [DEPLOYMENT_GUIDE.md § FASE 5](./DEPLOYMENT_GUIDE.md#fase-5--configurare-i-webhook-esterni).

---

## 6. Google Calendar (opzionale)

Per permettere a ogni maestro di collegare il proprio Google Calendar (gli slot occupati vengono esclusi dalla disponibilità):

1. **Google Cloud Console** → APIs & Services → abilita **Google Calendar API** → Credentials → Crea **OAuth 2.0 Client ID** (tipo Applicazione web).
2. **Authorized redirect URIs**: aggiungi `https://TUO-URL-RAILWAY/instructor/calendar/oauth/callback` (es. `https://frostdeskapi-production.up.railway.app/instructor/calendar/oauth/callback`).
3. **Railway (API)** → Variables:
   - `GOOGLE_CLIENT_ID` = Client ID
   - `GOOGLE_CLIENT_SECRET` = Client secret
   - `GOOGLE_CALENDAR_REDIRECT_URI` = stesso URL del callback (come sopra)
   - `GOOGLE_OAUTH_STATE_SECRET` = genera con `openssl rand -hex 32`
4. L’istruttore in **Calendario** → **Calendar Connection** clicca **Collega Google Calendar** → autorizza con il suo account Google → il sync popola gli slot occupati e il check disponibilità li esclude.

### Risolvere "Error 400: redirect_uri_mismatch"

L’URI di redirect deve essere **esattamente** quello su cui l’API riceve il callback (dominio dell’**API**, non dell’app Instructor/Admin).

1. **Verifica l’URL dell’API in produzione**  
   Esempio: `https://api.frostdesk.ai` o `https://frostdesk-api-production.up.railway.app`. Niente trailing slash.

2. **Redirect URI che l’API invia a Google**  
   È: `{API_BASE}/instructor/calendar/oauth/callback`  
   Esempio: `https://api.frostdesk.ai/instructor/calendar/oauth/callback`.

3. **Railway (API) → Variables**  
   Imposta:
   - `GOOGLE_CALENDAR_REDIRECT_URI` = `https://TUO-DOMINIO-API/instructor/calendar/oauth/callback`  
   (stesso dominio che usi per chiamare l’API, es. `api.frostdesk.ai` o l’URL Railway).  
   Se non imposti `GOOGLE_CALENDAR_REDIRECT_URI`, l’API usa `API_PUBLIC_URL` + `/instructor/calendar/oauth/callback`. In quel caso imposta `API_PUBLIC_URL` con l’URL pubblico dell’API (es. `https://api.frostdesk.ai`).

4. **Google Cloud Console**  
   APIs & Services → Credentials → il tuo OAuth 2.0 Client ID → **Authorized redirect URIs**  
   Aggiungi **esattamente** lo stesso URI (stesso schema, dominio, path, niente slash finale):  
   `https://TUO-DOMINIO-API/instructor/calendar/oauth/callback`  
   Salva. Possono volerci alcuni minuti prima che Google aggiorni.

5. **Controlli rapidi**  
   - Solo **https** (in prod).  
   - Dominio = quello dell’**API** (non instructor.frostdesk.ai né admin.frostdesk.ai).  
   - Path = `/instructor/calendar/oauth/callback` (nessuno spazio, nessuno slash in più).  
   - Nessuna differenza tra Railway e Google (copia-incolla lo stesso valore).

### Google Calendar: Publishing per tutti (In production)

Per permettere a **qualsiasi** account Google di collegare il calendario (non solo i Test users):

1. **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**.
2. Verifica che **User type** sia **External** (per utenti fuori dalla tua organizzazione). Se è Internal, crea un nuovo consent screen External.
3. Compila bene **App information** e **App domain** (Privacy policy URL e, se richiesto, Homepage / Terms of service). Google può bloccarti se mancano.
4. In **Scopes** aggiungi almeno:  
   `https://www.googleapis.com/auth/calendar.readonly`  
   (solo lettura calendario, di solito non richiede verification pesante).
5. Clicca **SAVE AND CONTINUE** fino alla fine della configurazione.
6. In cima alla pagina **OAuth consent screen** vedi **Publishing status: Testing**.  
   Clicca **PUBLISH APP** (o **Move to production** / "Imposta come in produzione").
7. Conferma: l’app passa a **In production**.  
   - Per lo scope **calendar.readonly** Google spesso **non** chiede la verification formale (riservata a scope sensibili).  
   - Se invece compare un avviso che dice che serve la **verification**: vai in **Verification** (menu o banner) e segui il flusso (form, video, ecc.). I tempi possono essere giorni/settimane.
8. Dopo il passaggio a **In production**, **tutti** gli utenti Google possono autorizzare il calendario senza essere in Test users.

**Nota:** Con app in Testing puoi comunque aggiungere fino a 100 Test users da **OAuth consent screen** → **Test users** → **+ ADD USERS**; utile finché non pubblichi.

### Calendar: dopo il login Google vado su localhost e “Can’t connect”

Se dopo aver autorizzato Google vieni reindirizzato a `localhost:3000/instructor/calendar?connected=1` e il browser non si connette, l’**API** sta usando `INSTRUCTOR_APP_URL` sbagliato (o non impostato).

- **Railway** → servizio **API** → **Variables** → imposta:
  - `INSTRUCTOR_APP_URL` = URL pubblico dell’app Instructor, **senza** trailing slash  
  - Esempio: `https://www.frostdesk.ai` (se l’Instructor è su www.frostdesk.ai).
- Salva e attendi il redeploy. Al prossimo “Collega Google Calendar” il redirect andrà alla tua app reale invece che a localhost.

---

## 6b. WhatsApp: connessione che “non si aggiorna” / “Whatsapp waiting”

Se dopo aver collegato WhatsApp l’interfaccia non si aggiorna (es. continua a mostrare “Collega” o lo stato non cambia), o in Inbox tutte le conversazioni restano “Whatsapp waiting” e “Last updated: … ago” non si aggiorna:

- **Per dati vecchi in Inbox (“Last message 10d ago” che non si aggiorna):** vedi audit dedicato [WHATSAPP_INBOX_AUDIT.md](./WHATSAPP_INBOX_AUDIT.md) (webhook Meta, variabili Railway, polling/endpoint).
- **Setup Inbox WhatsApp per un nuovo istruttore:** checklist step-by-step in [WHATSAPP_INBOX_AUDIT.md § 7](./WHATSAPP_INBOX_AUDIT.md#7-setup-inbox-whatsapp-per-un-nuovo-istruttore-checklist-step-by-step) (Frostdesk + Meta).
- **INSTRUCTOR_APP_URL (API):** su Railway, per l’API deve essere l’URL reale dell’app Instructor (es. `https://www.frostdesk.ai`). Se è `localhost` o mancante, anche i redirect/redirect dopo azioni possono andare a male.
- Ricaricare la pagina o cliccare **Refresh** in Inbox; verificare che le chiamate API (es. `conversations`) tornino 200 e con dati aggiornati (DevTools → Network).
- **Webhook Meta:** in Meta for Developers → App WhatsApp → Configuration → Webhook, l’URL deve essere `https://TUO-DOMINIO-API/webhook/whatsapp` (dominio dell’API Railway). Verifica che il webhook riceva gli eventi (in Meta c’è il log delle chiamate).
- **Variabili API:** `META_WHATSAPP_TOKEN`, `META_APP_SECRET` (o `META_WHATSAPP_APP_SECRET`), `META_VERIFY_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID` devono essere impostate e corrette; senza, i messaggi in arrivo non vengono gestiti e l’Inbox resta “vecchia”.
- **Auto-associazione numero:** ogni maestro ha il proprio numero WhatsApp nel profilo; il webhook associa il `phone_number_id` di Meta alla riga dell’istruttore il cui numero (E.164) corrisponde. Se l’istruttore ha collegato il numero in Impostazioni, in DB deve esistere una riga in `instructor_whatsapp_accounts` con quel numero in E.164; al primo messaggio il webhook completa l’associazione e le conversazioni compaiono per quell’istruttore.

## Verifica build locale (opzionale)

Dalla root del repo:

```bash
# API
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @frostdesk/db build && pnpm --filter @frostdesk/ai build && pnpm --filter @frostdesk/api build

# Instructor
pnpm --filter @frostdesk/instructor build

# Admin
pnpm --filter @frostdesk/admin build
```

Se tutti e tre i build passano, il deploy su Railway/Vercel dovrebbe andare a buon fine.

---

## Post-deploy: verifica ensure-profile (onboarding istruttore)

Dopo il deploy dell’API (Railway), verifica che il flusso **primo login istruttore** crei il profilo in pending:

1. **Gate-debug** — Login come istruttore sull’app Instructor (Vercel), apri `/instructor/gate-debug`. Atteso: **Response status 200**, body con `ok: true` e `profile` (id, approval_status: `pending`).
2. **Admin Pending** — In Admin → Instructors → tab **Pending**. Atteso: l’istruttore appare in lista.
3. **(Opzionale) curl** — `POST https://TUO-URL-RAILWAY/instructor/ensure-profile` con `Authorization: Bearer <token>` e `Content-Type: application/json` + body `{}`. Atteso: `200` e `{"ok":true,"profile":{...}}`.

Se vedi 500 con "null value in column id", l’API non ha ancora la fix: assicurati che il branch deployato includa `ensureInstructorProfile` con INSERT `(id, user_id, ...)` e `VALUES (userId, userId, ...)` in `packages/db`.

---

## Riepilogo URL

| Servizio    | URL esempio |
|------------|-------------|
| API        | `https://frostdesk-api-production.up.railway.app` |
| Health     | `https://frostdesk-api-production.up.railway.app/health` |
| Instructor | `https://frostdesk-instructor.vercel.app` |
| Admin      | `https://frostdesk-admin.vercel.app` |

Dopo ogni push su GitHub, Vercel e Railway rifaranno il deploy in automatico.
