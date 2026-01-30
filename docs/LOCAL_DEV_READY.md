# Local dev ready — checklist

Caricare le variabili `.env` all'avvio dell'API: `loadEnv.js` (o `import 'dotenv/config'`) nel bootstrap dell'API (`apps/api/src/index.ts`).

Bypass admin **solo in locale/pilot**: `ALLOW_DEBUG_USER=1` + `userId === 'debug-user'` → skip admin check.

Gestione errori admin robusta: `isAdmin()` protetto — query DB fallita = `false` → 403, mai più 500.

Human Inbox stabile (STRADA A): usa solo `relevant` + `relevance_confidence`, nessuna colonna fantasma.

Nessun log forensics in produzione.

---

## Checklist "LOCAL DEV READY"

- [ ] `.env` presente in locale (root del repo)
- [ ] dotenv caricato prima di leggere `process.env` (`import './loadEnv.js'` prima riga in `index.ts`)
- [ ] `ALLOW_DEBUG_USER=1` in `.env` per test admin routes
- [ ] `curl /health` → 200 OK
- [ ] `curl /admin/human-inbox?userId=debug-user` → 200 OK
- [ ] `curl /admin/human-inbox?userId=random` → 403 ADMIN_ONLY
- [ ] Nessun 500 su endpoint admin senza migrazioni complete (profiles/users)

---

**Verità finale:** non era un bug di prodotto. Era solo l'API che non caricava il `.env` dalla root.
