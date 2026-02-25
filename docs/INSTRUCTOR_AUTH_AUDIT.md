# Instructor auth: audit routing e DB

## 1) Struttura routing attuale

### Area pre-accesso: `(pre)`

Pagine sotto `apps/instructor/app/instructor/(pre)/` — **nessun layout guard**, unica via d’ingresso senza “approved + onboarding completed”.

| URL | File | Note |
|-----|------|------|
| `/login` | `(pre)/login/page.tsx` → re-export da `app/login/page.tsx` | Default after login: `/instructor/gate` |
| `/auth/callback` | `app/auth/callback/page.tsx` (root) | Default next: `/instructor/gate` |
| `/instructor/gate` | `instructor/gate/page.tsx` | Single gate: session → ensure row (insert only) → redirect per stato |
| `/instructor/approval-pending` | `(pre)/approval-pending/page.tsx` | UI + “Aggiorna stato” → gate |
| `/instructor/onboarding` | `(pre)/onboarding/page.tsx` | Assume row da gate; redirect se manca row / non approved / completed |
| `/instructor/signup` | `(pre)/signup/page.tsx` | Re-export signup |

**Root:** `app/page.tsx` → `redirect('/instructor/gate')`.

### Area interna: `(app)`

Tutto sotto `apps/instructor/app/instructor/(app)/` — **protetto dal layout guard** in `(app)/layout.tsx`. Le pagine sono “dumb” (nessun auth check proprio).

**Layout guard** (`(app)/layout.tsx`):

1. `getServerSession()` → no session → `redirect('/login?next=/instructor/gate')`
2. `getSupabaseServer()` → null (env) → redirect login
3. Query `instructors` con `maybeSingle()` su `session.user.id` → no row o error → `redirect('/instructor/gate')`
4. `approval_status !== 'approved'` → `redirect('/instructor/approval-pending')`
5. `onboarding_status !== 'completed'` → `redirect('/instructor/onboarding')`
6. Altrimenti `{children}` (no shell; le pagine usano AppShell dove serve)

**Pagine (app):**

| URL | File |
|-----|------|
| `/instructor/dashboard` | `(app)/dashboard/page.tsx` |
| `/instructor/inbox` | `(app)/inbox/page.tsx` |
| `/instructor/inbox/[conversationId]` | `(app)/inbox/[conversationId]/page.tsx` |
| `/instructor/profile` | `(app)/profile/page.tsx` (client, fetch in useEffect) |
| `/instructor/services` | `(app)/services/page.tsx` |
| `/instructor/availability` | `(app)/availability/page.tsx` |
| `/instructor/availability-conflicts` | `(app)/availability-conflicts/page.tsx` |
| `/instructor/booking-audit-logs` | `(app)/booking-audit-logs/page.tsx` |
| `/instructor/booking-lifecycle` | `(app)/booking-lifecycle/page.tsx` |
| `/instructor/bookings` | `(app)/bookings/page.tsx` |
| `/instructor/bookings/[bookingId]` | `(app)/bookings/[bookingId]/page.tsx` |
| `/instructor/bookings/new` | `(app)/bookings/new/page.tsx` |
| `/instructor/calendar` | `(app)/calendar/page.tsx` |
| `/instructor/meeting-points` | `(app)/meeting-points/page.tsx` |
| `/instructor/policies` | `(app)/policies/page.tsx` |
| `/instructor/settings` | `(app)/settings/page.tsx` |
| `/instructor/ai-booking-draft-preview` | `(app)/ai-booking-draft-preview/page.tsx` |
| `/instructor/ai-booking-preview` | `(app)/ai-booking-preview/page.tsx` |

Nessuna route duplicata fuori da `(pre)` e `(app)`.

---

## 2) Coerenza con gate e guard

- **Entry:** `/` → gate; login e callback → default `/instructor/gate`. OK.
- **Gate:** unico punto che crea/assicura la row (insert only, niente upsert). Redirect: no session → login; no row → insert e ri-valuta; non approved → approval-pending; onboarding non completed → onboarding; ok → dashboard (o `?next` sicuro). OK.
- **Guard (app):** stessi criteri (session, row, approved, onboarding). No row/error → gate (niente loop: gate è in `(pre)`). OK.
- **Loop:** gate non è sotto `(app)`, quindi il layout non gira su gate. OK.

---

## 3) Connessione col DB e rischi

### Dove è a posto

- **Gate e layout guard** usano `getSupabaseServer()` e `getServerSession()` (cookies sul server). Lettura `instructors` server-side: OK.
- **Backend API** (apps/api): le route instructor usano profilo/session e filtrano per `instructor_id` / owner (bookings, conversations, drafts, ecc.). Scoping instructor: OK.
- **Pagine (app) solo client** che usano `instructorApi`: profile, services, availability, availability-conflicts, calendar, policies, meeting-points, ai-booking-draft-preview. Fetch in browser con cookie: OK.

### Server data layer: `instructorApiServer.ts`

Le pagine (app) che mostrano dati core (inbox, bookings, audit, lifecycle, ai-preview) usano **solo** `instructorApiServer.ts` (server fetch con `getServerSession()` + token verso Edge Function / API). Nessun uso di `instructorApi` browser in server components.

| Pagina | Funzione server |
|--------|-----------------|
| `(app)/inbox/[conversationId]/page.tsx` | `fetchInstructorInboxServer()` |
| `(app)/bookings/page.tsx` | `fetchInstructorBookingsServer()` |
| `(app)/bookings/[bookingId]/page.tsx` | `fetchInstructorBookingServer()` |
| `(app)/booking-lifecycle/page.tsx` | `fetchBookingLifecycleByIdServer()` |
| `(app)/booking-audit-logs/page.tsx` | `fetchInstructorBookingAuditLogsServer()` |
| `(app)/ai-booking-preview/page.tsx` | `fetchAIBookingSuggestionContextServer()` |

**Regola:** `instructorApi.ts` → solo client. `instructorApiServer.ts` → solo server (Server Components). Stessi endpoint, token da cookie lato server.

**Sicurezza:** Le Edge Functions devono verificare il bearer Supabase Auth lato server e applicare lo scoping per instructor (non fidarsi del client). `instructorApiServer` usa `cache: 'no-store'` e `httpError` tipizzato; normalizzazione URL senza regex “magiche”.

---

## 4) Gate: insert-only, nessun reset, assenza loop

- **Niente upsert:** prima `select`; se non esiste, solo `insert`. Così non si resettano mai `approval_status` e `onboarding_status` per utenti già approvati/completed.
- **Race:** due tab in parallelo → una fa insert, l’altra va in errore (unique) e fa retry con `select`. OK.
- **Loop:** gate in `(pre)`, layout guard solo in `(app)`. OK.
- **Campi in insert:** `id`, `email`, `approval_status: 'pending'`, `onboarding_status: 'pending'`, `whatsapp_connected: false`. Solo per nuove row.

---

## 5) Verifiche manuali consigliate

1. **Incognito** → `/instructor/dashboard` → redirect a `/login?next=/instructor/gate`; dopo login → gate → approval-pending / onboarding / dashboard.
2. **Utente nuovo (no row)** → login → gate → crea row → approval-pending.
3. **Utente pending** → `/instructor/onboarding` diretto → redirect a approval-pending (onboarding in (pre) fa il check).
4. **Approved, onboarding non completed** → login → gate → onboarding.
5. **Approved + completed** → apri `/instructor/services` in nuova tab → carica senza redirect/401.
6. **Profile** → `/instructor/profile` + hard refresh → resta in (app), niente redirect a login (profile è client e fetch con cookie).

---

## 6) Checklist “fatto a modo”

- [x] Due gruppi: `(pre)` e `(app)` con guard solo in `(app)`.
- [x] Layout guard: session, supabase, row (maybeSingle), approved, onboarding; else children.
- [x] Gate: session, ensure row (insert only), redirect per stato; no UI.
- [x] Nessuna route duplicata fuori da (pre)/(app).
- [x] **Nessuna pagina server in (app) che importa instructorApi per dati core** — le 6 pagine usano instructorApiServer (vedi §3).
- [x] **Golden rule in ESLint** — Due override in `apps/instructor/.eslintrc.json`: (1) File client (components, (pre), login, auth, signup, layout, page) non possono importare `instructorApiServer`. (2) File server sotto `app/**` (eccetto path con `*client*` / `*.client.*`) non possono importare `instructorApi`. Messaggi espliciti: "server-only" / "browser-only". Per far girare il lint: `pnpm add -D eslint eslint-config-next` in apps/instructor.
- [x] **CI safety net** — `scripts/check-instructor-api-layer.sh`: fallisce se un file con `'use client'` importa `instructorApiServer`. Da eseguire in CI (es. `bash scripts/check-instructor-api-layer.sh` dalla root).

---

## 7) Stato finale (verità oggettiva)

- **Auth:** single gate + hard guard server.
- **DB:** insert-only, zero reset.
- **Data:** server-first per core (bookings, inbox, audit, lifecycle, ai-preview), client-first per UI e interazioni.
- **Tooling:** ESLint + CI script rendono impossibile importare il layer sbagliato per errore.
- **PM-ready:** refresh safe, deep link safe, demo safe.

**Naming opzionale (per chi arriva dopo):** si può adottare `*.server.ts` / `*.client.ts` (es. `instructorApi.server.ts`, `instructorApi.client.ts`) e raffinare le regole ESLint con glob su `**/*.server` / `**/*.client`. Non obbligatorio: la regola per path attuale è già sufficiente.
