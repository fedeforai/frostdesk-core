# Auth end-to-end trace (single source of truth)

Verifica fatta sul codice. Nessuna assunzione.

---

## Services: cosa chiama cosa (oggi)

1. **UI** — `apps/instructor/app/instructor/(app)/services/page.tsx` (client): `useEffect` → `fetchInstructorServices()` da `@/lib/instructorApi`. Su 401 chiama `router.push('/login')`; su altro errore mostra messaggio e Retry. Nessun header Authorization dal browser.

2. **Client API** — `instructorApi.ts`: `fetchInstructorServices()` → `apiFetch('/instructor/services', { method: 'GET' })`. `apiFetch` costruisce `url = BROWSER_API_PREFIX + pathNorm` = **`/api` + `/instructor/services`** = **`/api/instructor/services`**. Headers: solo `Content-Type: application/json` e `credentials: 'same-origin'`. **Nessun Bearer in uscita dal browser.**

3. **Next proxy** — `apps/instructor/app/api/instructor/[...path]/route.ts`: riceve GET per path `['services']`, costruisce `backendPath = /instructor/services`, `backendUrl = API_BASE + backendPath` (es. `http://localhost:3001/instructor/services`). Chiama `getServerSession()` (da `@/lib/supabaseServer`). Se `!session?.access_token` → risponde **401** con body `{ ok: false, error: 'UNAUTHENTICATED', message: 'Missing or invalid Authorization header' }`. Se c’è sessione → `fetch(backendUrl, { headers: { Authorization: 'Bearer ' + session.access_token } })` e restituisce status e body di Fastify.

4. **Session server** — `apps/instructor/lib/supabaseServer.ts`: `getServerSession()` → `getSupabaseServer()` → `cookies()` da `next/headers`, poi `createServerClient(..., { cookies: { get/set/remove } })`. `getSession()` è quindi basato sui **cookie della request** (in Route Handler Next passa i cookie della richiesta a `cookies()`). Se i cookie Supabase non ci sono o la sessione è scaduta/invalida, `session` è null.

5. **Backend** — `apps/api/src/routes/instructor/services.ts`: GET `/instructor/services` → `getUserIdFromJwt(request)` (legge `Authorization: Bearer <token>`), poi `getInstructorProfileByUserId(userId)`, poi `getInstructorServices(profile.id)`. Senza Bearer valido → 401 “Missing or invalid Authorization header”.

---

## Frase secca (Services)

**Services page calls `/api/instructor/services` (same-origin), adds no Authorization; Next proxy must add Bearer from getServerSession() (cookies). Backend expects Bearer and returns 401 if missing. If you see 401 from the proxy, getServerSession() is returning null → cookie/session issue (domain, path, or Supabase getSession() not seeing the session).**

---

## Checklist rapida (dove guardare in Cursor)

| Fase | File | Cosa verificare |
|------|------|------------------|
| Login | `(pre)/login/page.tsx` | Quale client Supabase; redirect dopo success |
| Session server | `lib/supabaseServer.ts` | getServerSession usa `cookies()` da next/headers |
| Gate | `(pre)/gate/page.tsx` | Ordine check; DB vs API; redirect approval/onboarding/dashboard |
| Services UI | `(app)/services/page.tsx` | Chiama fetchInstructorServices(); gestione 401 → login |
| Client fetch | `lib/instructorApi.ts` | apiFetch path → URL = /api + path; no Bearer |
| Proxy | `app/api/instructor/[...path]/route.ts` | getServerSession(); se null → 401; altrimenti Bearer a Fastify |
| Fastify auth | `apps/api/src/lib/auth_instructor.ts` | getUserIdFromJwt(request) da header Authorization |
| Fastify services | `apps/api/src/routes/instructor/services.ts` | getUserIdFromJwt → profile → getInstructorServices(profile.id) |

---

## Regola unica (target)

- Tutte le chiamate UI: **instructorApi** → **same-origin /api/instructor/*** → proxy aggiunge Bearer da getServerSession() → Fastify.
- Identità: **auth_user_id** solo da JWT verificato (Fastify).
- Ownership: ogni query DB **scoped a instructor_profile.id** da userId JWT.
- 401 da proxy → redirect login; 401 da Fastify (se proxy mandasse senza token) stesso comportamento.

---

## Debug 401 sul proxy

Se Request URL è `/api/instructor/services` e status 401:

- **Authorization in request dal browser:** no (by design).
- **Chi deve mettere Bearer:** Next proxy (getServerSession → access_token).
- **Perché 401:** proxy risponde 401 quando `!session?.access_token`, cioè getServerSession() restituisce null o session senza access_token.

**Cosa controllare:** cookie sul dominio della Next app (es. localhost:3002); che Supabase Auth scriva cookie con lo stesso dominio/path che il Route Handler legge; eventuale log nel proxy: `console.log('PROXY SESSION', !!session?.access_token)` per conferma.
