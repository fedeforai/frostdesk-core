# Sidebar navigation + Admin instructor approval — audit

## Micro patch applicata

- **HumanInboxPage.tsx**: `draftActionable = draft?.effectiveState === 'proposed'`. I bottoni "Use draft" e "Dismiss" sono già mostrati solo se `draftActionable` è true.

---

## Sezione A: Sidebar instructor (menu items)

**File**: `apps/instructor/components/shell/Sidebar.tsx` (usato da AppShell).

| Label       | href                              |
|------------|-------------------------------------|
| Dashboard  | /instructor/dashboard               |
| Inbox      | /instructor/inbox                   |
| Bookings   | /instructor/bookings                |
| Services   | /instructor/services                |
| Availability | /instructor/availability          |
| Conflicts  | /instructor/availability-conflicts  |
| Meeting points | /instructor/meeting-points     |
| Calendar   | /instructor/calendar                |
| Policies   | /instructor/policies                |
| Audit logs | /instructor/booking-audit-logs      |
| Booking lifecycle | /instructor/booking-lifecycle |
| AI booking preview | /instructor/ai-booking-preview |
| AI draft preview | /instructor/ai-booking-draft-preview |
| Profile    | /instructor/profile                 |
| Settings   | /instructor/settings                |
| Onboarding | /instructor/onboarding              |

---

## Sezione B: Sidebar admin (menu items)

**File**: `apps/admin/components/admin/AdminSidebar.tsx` (usato da `app/admin/layout.tsx`). Nav reale = `AdminSidebarNav` con items filtrati per ruolo.

| Label               | href                        |
|---------------------|-----------------------------|
| Dashboard           | /admin/dashboard            |
| Instructor approvals| /admin/instructor-approvals  |
| Pilot               | /admin/pilot                |
| Inbox               | /admin/human-inbox          |
| Bookings            | /admin/bookings             |
| Calendar            | /admin/calendar             |
| System              | /admin/system-health        |

**Nota**: `apps/admin/components/shell/Sidebar.tsx` ha solo Dashboard (/) e Inbox (/admin/human-inbox); questo sidebar non è usato dal layout admin (il layout usa AdminSidebar).

---

## Sezione C: Tabella match link → route file

| App       | Label               | href                         | Route file exists? | File path |
|-----------|---------------------|------------------------------|--------------------|-----------|
| Instructor| Dashboard           | /instructor/dashboard        | Sì                 | app/instructor/dashboard/page.tsx |
| Instructor| Inbox               | /instructor/inbox           | Sì                 | app/instructor/inbox/page.tsx |
| Instructor| Bookings            | /instructor/bookings        | Sì                 | app/instructor/bookings/page.tsx |
| Instructor| Services            | /instructor/services        | Sì                 | app/instructor/services/page.tsx |
| Instructor| Availability        | /instructor/availability     | Sì                 | app/instructor/availability/page.tsx |
| Instructor| Conflicts           | /instructor/availability-conflicts | Sì          | app/instructor/availability-conflicts/page.tsx |
| Instructor| Meeting points      | /instructor/meeting-points   | Sì                 | app/instructor/meeting-points/page.tsx |
| Instructor| Calendar            | /instructor/calendar         | Sì                 | app/instructor/calendar/page.tsx |
| Instructor| Policies            | /instructor/policies         | Sì                 | app/instructor/policies/page.tsx |
| Instructor| Audit logs          | /instructor/booking-audit-logs | Sì               | app/instructor/booking-audit-logs/page.tsx |
| Instructor| Booking lifecycle   | /instructor/booking-lifecycle | Sì               | app/instructor/booking-lifecycle/page.tsx |
| Instructor| AI booking preview  | /instructor/ai-booking-preview | Sì              | app/instructor/ai-booking-preview/page.tsx |
| Instructor| AI draft preview    | /instructor/ai-booking-draft-preview | Sì       | app/instructor/ai-booking-draft-preview/page.tsx |
| Instructor| Profile             | /instructor/profile          | Sì                 | app/instructor/profile/page.tsx |
| Instructor| Settings            | /instructor/settings         | Sì                 | app/instructor/settings/page.tsx |
| Instructor| Onboarding          | /instructor/onboarding      | Sì                 | app/instructor/onboarding/page.tsx |
| Admin     | Dashboard           | /admin/dashboard             | Sì                 | app/admin/dashboard/page.tsx |
| Admin     | Instructor approvals| /admin/instructor-approvals  | Sì                 | app/admin/instructor-approvals/page.tsx |
| Admin     | Pilot               | /admin/pilot                 | Sì                 | app/admin/pilot/page.tsx |
| Admin     | Inbox               | /admin/human-inbox           | Sì                 | app/admin/human-inbox/page.tsx |
| Admin     | Bookings            | /admin/bookings              | Sì                 | app/admin/bookings/page.tsx |
| Admin     | Calendar            | /admin/calendar              | Sì                 | app/admin/calendar/page.tsx |
| Admin     | System              | /admin/system-health         | Sì                 | app/admin/system-health/page.tsx |

Tutti i link delle sidebar hanno una `page.tsx` corrispondente. Nessun href punta a una route inesistente.

Possibili cause di “menu non naviga”:
- **Admin**: layout fa `redirect('/admin/not-authorized')` se `requireAdmin()` fallisce, ma **non esiste** la route `/admin/not-authorized` (manca `app/admin/not-authorized/page.tsx`). C’è solo `app/admin/not-authorized.tsx`, che in App Router non definisce una route → redirect porta a 404.
- **Instructor**: verificare che le pagine usino `AppShell` (con Sidebar) e che non ci siano redirect in middleware che bloccano l’accesso.

---

## Sezione D: Patch proposte

### D.1 Route `/admin/not-authorized` (fix redirect 403)

Creare la route così che il redirect del layout admin funzioni.

**Creare** `apps/admin/app/admin/not-authorized/page.tsx`:

```tsx
import NotAuthorized from '../not-authorized';

export default function NotAuthorizedPage() {
  return <NotAuthorized />;
}
```

Così `redirect('/admin/not-authorized')` mostra la pagina “Access Denied” invece di 404.

### D.2 (Opzionale) Link “Instructor approvals” nella Quick Navigation

In `apps/admin/app/admin/page.tsx` la Quick Navigation non include “Instructor approvals”. Aggiungere un link per coerenza con la sidebar:

- Label: "Instructor approvals" (o "→ Instructor approvals")
- href: `/admin/instructor-approvals`

---

## Mappa “Admin instructor approval” — UI / API / DB

### UI exists?

**Sì.**  
- **File**: `apps/admin/app/admin/instructor-approvals/page.tsx`  
- **Route**: `/admin/instructor-approvals`  
- **Comportamento**: lista pending da `fetchPendingInstructors()`, pulsanti Approva/Rifiuta che chiamano `approveInstructor(id, 'approved'|'rejected')`.

### API exists?

**Sì.**  
- **GET** `/admin/instructors/pending` — lista instructor in attesa.  
  File: `apps/api/src/routes/admin/instructor_approval.ts` (registrato in `admin.ts`).  
  Auth: `requireAdminUser(request)`.  
  Response: `{ ok: true, items: PendingInstructorItem[] }`.
- **POST** `/admin/instructors/:id/approve` — body `{ status: 'approved' | 'rejected' }`.  
  Stesso file. Aggiorna stato e scrive audit.

### DB exists?

**Sì, con rischio schema.**  
- **File**: `packages/db/src/instructor_approval_repository.ts`  
  - `listPendingInstructors()`: `SELECT id, email, created_at FROM instructors WHERE approval_status = 'pending'`  
  - `setInstructorApprovalStatus(id, status)`: `UPDATE instructors SET approval_status = $status WHERE id = $id`  
- **Migration**: `013_instructor_approval_status.sql` — aggiunge `approval_status` alla tabella **`instructors`**.

**Rischio**: nel repo la maggior parte del codice instructor usa la tabella **`instructor_profiles`** (id, full_name, onboarding_completed_at, …). La migration 013 e il repository approval usano la tabella **`instructors`**. Se in Supabase esiste solo `instructor_profiles` e non `instructors`, le query approval falliscono (tabella inesistente). Se invece esiste `instructors` (es. vista o tabella legacy), il flusso è coerente.

**Verifica**: in DB eseguire `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('instructors', 'instructor_profiles');`. Se c’è solo `instructor_profiles`, serve un ticket “Backend minimal deterministic” per allineare approval a `instructor_profiles` (aggiungere colonna `approval_status` se manca, e usarla nel repository).

---

## Perché “oggi non funziona” (se tutto esiste)

Possibili cause:

1. **Redirect 403 → 404**: layout admin fa `redirect('/admin/not-authorized')` ma la route non esiste → utente vede 404 invece di “Access Denied”. Fix: D.1.
2. **Base URL admin**: `adminApi` usa `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`. Se l’admin gira su altro host/port o l’API è su un’altra URL, serve `NEXT_PUBLIC_API_URL` corretto in `.env` dell’app admin.
3. **Auth admin**: `requireAdmin()` in dev fa bypass e non chiama l’API; in prod chiama `GET /admin/check`. Se l’utente non è in `admin_users` (tabella da migration 015), l’API risponde 403 e il layout reindirizza a not-authorized (poi 404 senza D.1).
4. **Tabella `instructors`**: se nel DB non esiste e esiste solo `instructor_profiles`, `listPendingInstructors` e `setInstructorApprovalStatus` vanno in errore DB. Serve allineare schema e repository come sopra.

---

## Se manca qualcosa — ticket proposta

- **Manca route `/admin/not-authorized`**: implementazione D.1 (sopra).
- **Manca tabella `instructors` / c’è solo `instructor_profiles`**:  
  **Ticket “Backend minimal deterministic”**:  
  - Acceptance: admin può vedere lista pending e approvare/rifiutare; stato persistito.  
  - Schema: usare `instructor_profiles` (o tabella unica documentata); colonna `approval_status` (pending | approved | rejected).  
  - Endpoint: invariati `GET /admin/instructors/pending`, `POST /admin/instructors/:id/approve`.  
  - Modifiche: migration che aggiunge `approval_status` a `instructor_profiles` se assente; `instructor_approval_repository` che legge/scrive da `instructor_profiles` invece di `instructors`.
