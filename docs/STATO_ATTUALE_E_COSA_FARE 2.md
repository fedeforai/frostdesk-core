# Stato attuale e cosa fare

Un solo posto per capire **cosa c’è**, **come funziona** e **cosa fare** se qualcosa non va.

---

## 1. Cosa c’è (le 3 app)

| App        | Porta  | URL principale        | A cosa serve |
|-----------|--------|------------------------|--------------|
| **API**   | 3001   | http://localhost:3001  | Backend: profili, bookings, conversazioni, admin check, ecc. |
| **Instructor** | 3012 | http://localhost:3012  | App per i maestri: login, dashboard, servizi, inbox, prenotazioni. |
| **Admin** | 3000   | http://localhost:3000   | Dashboard per approvare i maestri e gestire il pilot. |

- Le sessioni sono **per origine**: login su Instructor (3012) **non** crea sessione su Admin (3000). Per l’admin devi fare login **sulla pagina di login admin** (stesso Supabase, utente in `admin_users`).
- L’Admin e l’Instructor parlano con l’API (3001). L’API deve essere avviata per primo.

---

## 2. Avvio rapido (ordine giusto)

```bash
# Terminale 1: API + Instructor
pnpm dev:instructor
# → API: 3001, Instructor: 3012

# Terminale 2: Admin (quando ti serve approvare maestri)
pnpm dev:admin
# → Admin: 3000
```

Poi:
- **Maestro:** http://localhost:3012 → login/signup instructor.
- **Admin:** http://localhost:3000 → **http://localhost:3000/login** → login con utente in `admin_users`.

---

## 3. Flusso “approvazione instructor” (passo passo)

1. Un maestro si registra (signup) su **Instructor** (3012). Il suo profilo resta in attesa di approvazione.
2. Tu (admin) apri **Admin** su **3000**, vai su **http://localhost:3000/login** e fai login con un utente che:
   - esiste in **Supabase Auth** (stesso progetto dell’instructor),
   - è presente nella tabella **`admin_users`** con un ruolo consentito (es. `system_admin`, `human_approver`).
3. Dopo il login vai su **Instructor approvals** (o http://localhost:3000/admin/instructor-approvals).
4. Vedi la lista “Instructor in attesa di approvazione”. Approvi o rifiuti.
5. Dopo l’approvazione il maestro può completare l’onboarding su Instructor (3012).

Se vedi **“Missing session”** o **“Nessun instructor in attesa”** (con errore): non hai sessione sull’origine Admin. Vai su **http://localhost:3000/login** e fai login. Se vedi **“Nessun instructor in attesa”** senza errore: la lista è vuota (nessun maestro in attesa).

---

## 4. Cosa può andare storto e cosa fare

| Problema | Cosa fare |
|----------|-----------|
| **404 su /admin/login** o **non riesco ad aprire il login** | Usa **http://localhost:3000/login** (login alla root dell’app, fuori dal layout admin). Se l’admin era già avviato, riavvia con `pnpm dev:admin`. |
| **Login admin fallisce** (errore nel form) | Controlla: (1) `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nell’app admin (stesso progetto dell’instructor). (2) L’utente esiste in Supabase Auth e in `admin_users`. (3) Password corretta. |
| **“Missing session” su Instructor approvals** | Stai usando Admin (3000) senza aver fatto login lì. Vai su http://localhost:3000/login e fai login. I cookie sono per origine: login su 3012 non vale per 3000. |
| **Lista approvazioni vuota** (nessun errore) | Non c’è nessun instructor in stato “in attesa”. Qualcuno deve fare signup su Instructor (3012) per comparire in lista. |
| **API non risponde** (502, “Cannot reach API”) | L’API non è in esecuzione su 3001. Avvia con `pnpm dev:instructor` (o `pnpm -C apps/api dev`) e verifica: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health` → 200. |
| **Porta occupata (EADDRINUSE)** | Libera la porta (es. `lsof -ti tcp:3000 | xargs kill -9`) e riavvia. Vedi anche `scripts/kill-port.sh` e `docs/START_APP.md`. |

---

## 5. Checklist veloce “tutto ok?”

- [ ] API: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health` → **200**
- [ ] Instructor: http://localhost:3012 si apre (login/dashboard)
- [ ] Admin: http://localhost:3000 si apre
- [ ] Admin login: http://localhost:3000/login mostra il form; dopo login vai a Instructor approvals e **non** vedi “Missing session”
- [ ] Se non hai un utente admin: crealo in Supabase Auth e inseriscilo in `admin_users` (es. migration/seed se presente nel repo)

---

## 6. Riferimenti

- **Avvio e porte:** `docs/START_APP.md`
- **Problemi auth / route / dashboard:** `docs/LOCAL_DEV_RUNBOOK.md`
- **Admin access / seed:** `docs/ADMIN_ACCESS_SETUP.md` (se presente)
