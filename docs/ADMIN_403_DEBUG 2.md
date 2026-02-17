# Admin 403 ADMIN_ONLY — Debug

## Hard truth (quando vedi “process.env.TOKEN” o “couldn’t connect”)

Non è un bug dell’admin. Stai lanciando i comandi in un contesto dove **(1) il TOKEN non viene passato a Node** e **(2) l’API su 3001 non è in ascolto**.  
`node -e "..." TOKEN="$TOKEN"` **non** imposta una variabile d’ambiente per Node: passa solo un argomento, quindi Node non vede `process.env.TOKEN`.  
E se l’API non è avviata, è normale vedere “couldn’t connect”.  
Usa i comandi sotto in **sequenza**, **uno per riga**; se incolli più comandi senza newline o la shell si resetta, perdi `$TOKEN`.

---

## 1) Verifica che l’API sia viva su 3001

```bash
curl -i http://127.0.0.1:3001/health
```

Se non risponde, avviala (dalla root del repo):

```bash
set +H
DATABASE_URL='postgresql://postgres.fggheegqtghedvibisma:frostdesk2025!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require' \
pnpm --filter @frostdesk/api dev
```

Poi in un **secondo terminale**:

```bash
curl -i http://127.0.0.1:3001/health
```

Deve tornare 200. Solo dopo procedi con token e admin check.

---

## 2) Crea TOKEN e decodifica SUB nel modo corretto

**Metodo A (consigliato):** `export` e poi `node` (stessa shell).

```bash
export TOKEN="$(TEST_EMAIL='bookwithfrostdesk@gmail.com' TEST_PASSWORD='frostdesk2025!' node scripts/supa_login.mjs | tr -d '\r\n')"
```

```bash
node -e "const p=JSON.parse(Buffer.from(process.env.TOKEN.split('.')[1],'base64url').toString()); console.log({sub:p.sub,email:p.email});"
```

**Metodo B (one-liner):** passa la variabile con `env`.

```bash
TOKEN="$(TEST_EMAIL='bookwithfrostdesk@gmail.com' TEST_PASSWORD='frostdesk2025!' node scripts/supa_login.mjs | tr -d '\r\n')"
```

```bash
env TOKEN="$TOKEN" node -e "const p=JSON.parse(Buffer.from(process.env.TOKEN.split('.')[1],'base64url').toString()); console.log({sub:p.sub,email:p.email});"
```

Prendi il **sub** stampato (user_id nel JWT).

---

## 3) Test admin endpoints (solo dopo health 200)

Nella stessa shell dove hai `TOKEN` (o dopo aver rifatto l’export):

```bash
curl -i "http://127.0.0.1:3001/admin/check" -H "Authorization: Bearer $TOKEN"
```

```bash
curl -i "http://127.0.0.1:3001/admin/instructors/pending" -H "Authorization: Bearer $TOKEN"
```

---

## 4) Se /admin/check è 403 ADMIN_ONLY

Il token è valido ma il **sub** non è presente nel DB che sta usando l’API.

**Verifica quale DATABASE_URL usa il processo su 3001:**

```bash
PID="$(lsof -ti tcp:3001 | head -n 1)"
ps eww -p "$PID" | tr ' ' '\n' | rg "DATABASE_URL"
```

Nel **Supabase SQL Editor** dello stesso progetto:

```sql
INSERT INTO public.admin_users (user_id)
VALUES ('<SUB_STAMPATO>')
ON CONFLICT (user_id) DO NOTHING;
```

Poi riprova:

```bash
curl -i "http://127.0.0.1:3001/admin/check" -H "Authorization: Bearer $TOKEN"
```

---

## Hard truth (403 vs 500)

- **403 ADMIN_ONLY** = token valido, ma questa istanza API (su questo DATABASE_URL) **non vede** quel `user_id` in `admin_users` (query ok, riga non trovata).
- **500 ADMIN_CHECK_DB_ERROR** = la query su `admin_users` è **fallita** (DB, DNS, pooler). In dev il body può includere `message` con il dettaglio.

Se il messaggio è **`getaddrinfo ENOTFOUND db....supabase.co`**, è un problema **DNS**: l’host diretto non risolve. Usa il **pooler** come `DATABASE_URL` → vedi **docs/DB_POOLER_DEV.md**.

`isAdmin` nel package db non fa catch → false: in caso di errore DB lancia `AdminCheckDbError` e `/admin/check` risponde 500.

---

## Log API (per capire 403 vs 500)

Nel terminale dove gira l’API, dopo un `curl .../admin/check` cerca una riga tipo:

- `[admin_check] ... isAdmin: 'query_failed'` → errore DB (risposta 500 ADMIN_CHECK_DB_ERROR).
- `[admin_check] ... isAdmin: false` → query ok, ma `user_id` non in `admin_users` (403).
- `[admin_check] ... isAdmin: true` → tutto ok (200).

---

## I tre casi (riepilogo)

| Caso | Cosa controllare |
|------|-------------------|
| **1. DB sbagliato** | `DATABASE_URL` del processo API ≠ DB dove hai inserito l’admin. Allinea env o inserisci l’admin nel DB che l’API usa. |
| **2. Errore DB intermittente** | Log con `isAdmin: 'query_failed'` e risposta 500. Controlla DNS, pooler, sslmode, rete. |
| **3. Token con sub diverso** | Hai inserito in `admin_users` un altro `user_id`. Verifica il `sub` del JWT (comando sopra) e che sia quello in `admin_users`. |

---

## Risposta “dimmi queste 2 cose”

Esegui in sequenza (dopo aver fatto `export TOKEN=...` come in sezione 2):

1. **Output di:**
   ```bash
   node -e "const p=JSON.parse(Buffer.from(process.env.TOKEN.split('.')[1],'base64url').toString()); console.log(p.sub);"
   ```
2. **Output di:**
   ```bash
   PID="$(lsof -ti tcp:3001 | head -n 1)"
   ps eww -p "$PID" | tr ' ' '\n' | rg "DATABASE_URL"
   ```

Con sub + DATABASE_URL (o host) si capisce se è caso 1 (DB diverso), 2 (vedi log 500), o 3 (sub sbagliato in tabella).

---

## Riferimenti codice

- Route: `apps/api/src/routes/admin.ts` — GET `/admin/check` (log userId, dbHost masked, isAdmin; 500 su DB error, 403 se non admin).
- DB: `packages/db/src/admin_access.ts` — `isAdmin()` lancia `AdminCheckDbError` su errore query; nessun catch che ritorna false.
- Test: `apps/api/src/routes/__tests__/admin_check.test.ts` — 401, 403, 500 ADMIN_CHECK_DB_ERROR, 200.
