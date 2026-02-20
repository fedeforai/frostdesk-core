# Go Live — Admin, Instructor e API

Checklist operativa per mettere online **API**, **Instructor App** e **Admin App**. Per dettagli completi vedi [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## Prima di partire

- [ ] Codice pushato su GitHub (branch che vuoi deployare, es. `feature/ai-foundation` o `main`)
- [ ] Credenziali pronte: Supabase (URL + anon + service_role), OpenAI, Meta/WhatsApp, Stripe (opzionale ma consigliato)
- [ ] Build locale verificata (vedi sotto)

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
   - `INSTRUCTOR_APP_URL` → **lo imposti dopo** il deploy Instructor (Fase 3)
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
