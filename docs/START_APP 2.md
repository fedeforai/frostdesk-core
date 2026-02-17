# Avviare l’app (protocollo rapido)

Un solo comando per API + Instructor. Usa questo quando devi “accendere” l’app per lavorarci.

**Se non sai più cosa sta succedendo:** leggi **[docs/STATO_ATTUALE_E_COSA_FARE.md](STATO_ATTUALE_E_COSA_FARE.md)** — riassume le 3 app, l'ordine di avvio, il flusso approvazione instructor e cosa fare quando qualcosa non va.

## 1. Avvio in un colpo solo

Dalla **root del repo**:

```bash
pnpm dev:instructor
```

- **API:** http://localhost:3001  
- **Instructor:** http://localhost:3012  

Lo script libera le porte 3001 e 3012, poi avvia API e Instructor. Per fermare tutto: **Ctrl+C**.

---

## 2. Se le porte sono occupate (EADDRINUSE)

Se vedi `address already in use` su 3001 o 3012:

```bash
# Libera le porte (macOS/Linux)
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null
lsof -ti tcp:3012 | xargs kill -9 2>/dev/null

# Poi rilancia
pnpm dev:instructor
```

Oppure usa lo script se presente: `bash scripts/kill-port.sh 3001` e `bash scripts/kill-port.sh 3012`.

---

## 3. Se hai modificato il package `db`

Dopo aver cambiato export o sorgenti in `packages/db`, ricostruisci prima di avviare l’API:

```bash
pnpm -C packages/db run build
pnpm dev:instructor
```

---

## 4. Verifica veloce

- **API:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health` → `200`
- **Instructor:** apri http://localhost:3012 → redirect a `/instructor/dashboard` (o login se non sei loggato)

---

## 5. Dashboard Admin (approvazione profili maestro)

Un solo comando avvia **API + Admin** (come per Instructor):

```bash
pnpm dev:admin
```

- **API:** http://localhost:3001  
- **Admin:** http://localhost:3000  

Usa **solo la porta 3000** per aprire l'admin nel browser (login, dashboard). La porta 3001 è l'API: se apri 3001 vedi l'API, non l'interfaccia, e puoi avere pagina bianca su "not-authorized".

Lo script libera le porte 3001 e 3000, poi avvia API e Admin. Per fermare tutto: **Ctrl+C**.

- **Login obbligatorio:** le pagine `/admin/*` richiedono accesso con utente in `admin_users`. Vai a http://localhost:3000/login, accedi e arrivi alla Dashboard. In `apps/admin/.env.local` servono `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_API_URL=http://localhost:3001`. L’admin chiama l’API su 3001 (avviata insieme da `pnpm dev:admin`).

---

## 6. Due terminali (alternativa Instructor)

Se preferisci API e Instructor separati:

| Terminale 1 (API)        | Terminale 2 (Instructor)        |
|--------------------------|---------------------------------|
| `pnpm -C apps/api dev`   | `PORT=3012 pnpm -C apps/instructor dev` |

---

## 7. "Couldn't load bookings" / lista booking vuota

Se nella app Instructor vedi **"Couldn't load bookings"** e **"No bookings yet"**, l’API sta fallendo sulla lista booking perché nel DB manca la colonna `bookings.customer_id`.

**Soluzione:** applica la migration che aggiunge `customer_id`:

- **Con Supabase CLI** (da root repo):
  ```bash
  supabase db push
  ```
- **A mano (SQL su Supabase Dashboard → SQL Editor, o psql):** esegui il contenuto di  
  `supabase/migrations/20260228120000_bookings_customer_id.sql`  
  (aggiunge la colonna nullable `customer_id` e gli indici; **non** tocca i dati esistenti).

Dopo aver applicato la migration, ricarica la pagina (o clicca Retry): i booking che avevi dovrebbero tornare visibili.

---

Per problemi di auth, porte, route API, dashboard che non carica: vedi **docs/LOCAL_DEV_RUNBOOK.md**.
