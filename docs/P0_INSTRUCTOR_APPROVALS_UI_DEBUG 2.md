# P0: Instructor approvals UI — "Failed to fetch" / "No session found" diagnostic

## Obiettivo

La pagina **Instructor approvals** deve caricare la lista: `GET /admin/instructors/pending` deve rispondere 200, non essere bloccata da CORS, e essere chiamata dal FE con header `Authorization`.

Se la UI mostra **"No session found"**: il FE non invia nessuna richiesta (blocco prima del fetch). La sessione admin va inizializzata.

**Fix (Opzione A — consigliata in dev):**

1. Genera un token: da root repo  
   `export TOKEN="$(TEST_EMAIL='bookwithfrostdesk@gmail.com' TEST_PASSWORD='frostdesk2025!' node scripts/supa_login.mjs | tr -d '\r\n')"`  
   poi copia il valore di `$TOKEN` (o dall’output dello script).
2. Vai in **System** → sezione **[DEV] Admin auth debug**.
3. Incolla il token nel campo **"Paste JWT token"** e clicca **"Set token"**.
4. La pagina si ricarica; ora **Instructor approvals** (e le altre chiamate admin) usano quel token da `localStorage` (`fd_admin_token`).

Se la UI mostra **"Failed to fetch"** (rete/CORS):

1. **Base URL FE → API** non coerente (es. FE punta a URL sbagliato o API non in ascolto).
2. **CORS / preflight** che blocca la chiamata dal browser.

---

## Step chirurgico (DevTools → Network)

1. Apri la pagina **Instructor approvals** (`/admin/instructor-approvals`).
2. Apri **DevTools → Network** (F12 → tab Network).
3. Ricarica la pagina (o clicca Retry se c’è il banner di errore).
4. Cerca la richiesta a **`pending`** (URL contiene `/admin/instructors/pending`).

### Cosa guardare

| Cosa vedi | Significato | Azione |
|-----------|-------------|--------|
| **La richiesta non compare** | FE non chiama l’endpoint (hook/URL sbagliato o errore prima del fetch) | Bug FE: verificare che `fetchPendingInstructors()` venga chiamato e che `API_BASE_URL` sia corretto (`NEXT_PUBLIC_API_URL` o default `http://localhost:3001`). |
| **Richiesta (failed) / (blocked:cors)** | CORS o preflight blocca la chiamata | Fix CORS in API: `@fastify/cors` con `origin` che include `http://localhost:3000` e `allowedHeaders: ['Authorization', 'Content-Type']`. Poi `pnpm add @fastify/cors -F @frostdesk/api` se la dipendenza manca. |
| **401 / 403** | Token mancante o utente non admin | Verificare che il FE invii `Authorization: Bearer <token>`. Se usi Supabase session, verificare che ci sia sessione (admin loggato). Se 403: utente non in `admin_users`. |
| **200** ma UI vuota | API ok, mapping FE sbagliato | Verificare che la risposta sia `{ ok: true, items: [...] }` e che il componente usi `res.items`. |

---

## Controlli rapidi

- **Base URL FE:** in admin, variabile `API_BASE_URL` in `lib/adminApi.ts` = `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`. In dev deve essere `http://localhost:3001` se l’API è su 3001.
- **API in ascolto:** `lsof -nP -iTCP:3001 -sTCP:LISTEN` deve mostrare un processo.
- **CORS:** l’API deve registrare `@fastify/cors` con `origin` che include `http://localhost:3000` (e opzionalmente `http://127.0.0.1:3000`). Se il modulo non è installato: `pnpm add @fastify/cors -F @frostdesk/api` dalla root repo.

---

## Riferimenti codice

- FE chiamata: `apps/admin/lib/adminApi.ts` → `fetchPendingInstructors()` (usa `API_BASE_URL` + `getAdminFetchOptions(session)` → header `Authorization: Bearer <access_token>`).
- Pagina: `apps/admin/app/admin/instructor-approvals/page.tsx` → `load()` chiama `fetchPendingInstructors()`.
- API CORS: `apps/api/src/server.ts` → `fastify.register(cors, { origin: [...], allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id'], methods: [...] })`.
