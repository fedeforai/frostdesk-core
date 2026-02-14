# Admin: one sidebar (fix human-inbox)

## STEP 1: Discovery table (route href to page.tsx)

| Sidebar href              | Page file path |
|---------------------------|----------------|
| /admin/dashboard          | apps/admin/app/admin/dashboard/page.tsx |
| /admin/instructor-approvals | apps/admin/app/admin/instructor-approvals/page.tsx |
| /admin/pilot              | apps/admin/app/admin/pilot/page.tsx |
| /admin/human-inbox        | apps/admin/app/admin/human-inbox/page.tsx |
| /admin/bookings           | apps/admin/app/admin/bookings/page.tsx |
| /admin/calendar           | apps/admin/app/admin/calendar/page.tsx |
| /admin/system-health      | apps/admin/app/admin/system-health/page.tsx |

- Layout that provides AdminSidebar: `apps/admin/app/admin/layout.tsx` (renders AdminSidebar + children).
- Human-inbox route is already under admin: `apps/admin/app/admin/human-inbox/page.tsx` returns `<HumanInboxPage />`.
- Problem: `HumanInboxPage` (admin) wraps content in `AppShell`, which renders the reduced `shell/Sidebar.tsx`, so the page shows a second sidebar and "Instructor approvals" is not visible from that reduced menu.

## STEP 2: Implementation plan

**Option B chosen.** Keep route as-is; refactor the page component so it does not render AppShell. The admin layout already provides AdminSidebar and the main content area, so the human-inbox page should only render the inbox UI (list + detail + composer). No layout or route changes.

**Changes:**
1. In `apps/admin/components/inbox/HumanInboxPage.tsx`: remove `AppShell` import and wrapper; return only the inner content (the `div` with `styles.page`). Result: one sidebar (AdminSidebar from layout) on `/admin/human-inbox`.
2. No changes to `apps/admin/app/admin/human-inbox/page.tsx` or `apps/admin/app/admin/layout.tsx`.
3. AdminSidebar links already point to existing routes (see table). No href fixes needed in AdminSidebar.
4. The reduced sidebar (`shell/Sidebar.tsx`) remains in the codebase but is no longer used by the human-inbox page. It is still used by `HomeDashboard` on the root page (`app/page.tsx`), which is outside the admin layout.

## STEP 3: Code patch

See below (HumanInboxPage.tsx updated).

## Cosa stava succedendo (in semplice)

- C’erano **due shell diverse** in admin.
- Le pagine sotto `/admin/*` devono vivere dentro `apps/admin/app/admin/layout.tsx`, che rende l’**AdminSidebar completo**.
- HumanInboxPage però **re-inseriva un AppShell** suo, che montava la sidebar ridotta.

**Risultato:** su `/admin/human-inbox` vedevi un menu diverso e quindi “spariva” Instructor approvals, anche se la pagina esisteva.

**Perché la patch funziona:** togliendo AppShell da HumanInboxPage, è il layout admin a gestire layout e sidebar. Quindi `/admin/human-inbox` eredita la stessa sidebar del resto dell’admin e “Instructor approvals” torna visibile.

## STEP 4: Verification checklist

- [ ] Run admin app (`pnpm -C apps/admin dev` or equivalent).
- [ ] Open `/admin/human-inbox`: AdminSidebar is visible on the left; **"Instructor approvals"** is present in the menu.
- [ ] Click **"Instructor approvals"**: page loads (no 404).
- [ ] From human-inbox, click "Dashboard", "Inbox", "Bookings", etc. in the sidebar: navigation works.
- [ ] No link in the sidebar goes to a non-existent route.

### Se ancora non puoi “confermare” istruttori

Allora il problema non è la UI ma uno di questi:

1. **Utente non in `admin_users`** — stai loggando con un utente non presente in `admin_users`.
2. **API** — `/admin/instructors/pending` o `/admin/instructors/:id/approve` tornano 401, 403 o 500.
3. **Base URL** — l’admin app punta a host sbagliato (config base URL).
