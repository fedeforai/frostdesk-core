# FrostDesk — Guidance for AI Agents

This file helps future agents (and humans) work safely in this repo. Follow it when suggesting commands, debugging, or changing env/credentials.

---

## 1. `.env.local` requirement

- **Never commit real secrets.** The repo has `.env.example` as a template only. Real keys go in env files that are gitignored.
- **Where to put env:**
  - **API / backend (Node, scripts):** Repo root **`.env`** or **`.env.local`**. The API’s `loadEnv.ts` loads (in order) `repo_root/.env.local`, `repo_root/.env`, `apps/api/.env.local`, `apps/api/.env`, then `cwd` variants. Prefer **repo root `.env.local`** for local dev.
  - **Next.js apps (instructor, admin):** Each app uses **its own** `.env.local` in the app directory:
    - `apps/instructor/.env.local` — set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001` for local API).
    - `apps/admin/.env.local` — same `NEXT_PUBLIC_*` vars; `NEXT_PUBLIC_API_URL` must point to the API the admin calls.
  - **Naming:** Use **`NEXT_PUBLIC_API_URL`** for the API base URL in Next.js apps (not `NEXT_PUBLIC_API_BASE_URL`). See `docs/ENV_AUDIT.md` for full convention.
- **Setup:** Copy `.env.example` to `.env.local` (at root and/or in each app as above), then fill with real values. Do not add `.env` or `.env.local` to version control.

---

## 2. Credential verification steps

Before suggesting or running commands that call the API, hit the inbox, or use WhatsApp/AI:

1. **Confirm env is present**
   - Root: a `.env` or `.env.local` exists (or platform env is set in production).
   - Instructor/Admin: `apps/<app>/.env.local` exists with at least `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` (for instructor inbox and admin API calls).

2. **Required vars for full flows**
   - **API/DB:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (or anon fallback), `DATABASE_URL`.
   - **AI drafts:** `OPENAI_API_KEY` (or stub/fallback; see `packages/ai`).
   - **WhatsApp:** `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_WHATSAPP_APP_SECRET`.
   - **Next.js apps:** `NEXT_PUBLIC_API_URL` must match the running API (e.g. `http://localhost:3001` locally).

3. **Quick verification**
   - **API:** `GET <API_BASE>/health` (e.g. `http://localhost:3001/health`) → expect `{ "status": "ok" }` or similar.
   - **Instructor app:** If inbox or server-side calls fail with missing API URL or 503, remind the user to set `NEXT_PUBLIC_API_URL` (and Supabase vars) in `apps/instructor/.env.local`.
   - **Admin app:** Same for `apps/admin/.env.local`; admin check and API calls use `NEXT_PUBLIC_API_URL`.

4. **When debugging 404 or “page not found”**
   - For **instructor** routes (e.g. `/instructor/gate`): Ensure the **deployment** serving that domain is the **instructor app** (Vercel project with Root Directory `apps/instructor`). If the domain is assigned to a different project or an old deploy with overrides, the route may 404 even if the code is correct.

---

## 3. References

- **Env audit (authoritative):** `docs/ENV_AUDIT.md`
- **Deploy / go-live:** `docs/DEPLOYMENT_GUIDE.md`, `docs/GO_LIVE_CHECKLIST.md`
- **Pilot setup:** `docs/PILOT_OPERATIONS_PROTOCOL.md` (includes `cp .env.example .env.local` and credential steps)
