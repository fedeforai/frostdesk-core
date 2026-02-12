# Auth Debug Protocol (local dev)

Repeatable check that both auth paths work:

1. **Next proxy path:** browser cookie → Next.js (`/api/instructor/...`) → API with `Authorization: Bearer <access_token>`.
2. **Direct API path:** `curl` to API with `Authorization: Bearer <token>`.

## Prerequisites

- **Instructor app** running on `http://localhost:3012`.
- **API** running on `http://localhost:3001`.
- **Cookie** from a logged-in instructor session saved to `/tmp/sb_cookie.txt` (value only, see below).

## Obtaining the cookie into `/tmp/sb_cookie.txt`

1. Open the instructor app in the browser: `http://localhost:3012`.
2. Log in so that the Supabase auth cookie is set (cookie name: `sb-fggheegqtghedvibisma-auth-token`).
3. Copy **only the cookie value** (the part after the `=`) into `/tmp/sb_cookie.txt`:
   - **Chrome / Edge:** DevTools → Application → Cookies → `http://localhost:3012` → select `sb-fggheegqtghedvibisma-auth-token` → copy Value.
   - **Firefox:** DevTools → Storage → Cookies → `http://localhost:3012` → copy the value of `sb-fggheegqtghedvibisma-auth-token`.
   - Paste into a file and save as `/tmp/sb_cookie.txt` (no cookie name, no `=`, just the value).
4. Do **not** commit or log this file; it contains secrets. Use it only locally for the script.

## Sanitizing the cookie file

If you pasted the full header line or `name=value`, normalize to the value only (no tokens printed):

**Bash (overwrites file):**
```bash
# Strip newlines/quotes and optional "Cookie:" / "sb-*-auth-token=" prefix; write value only
v=$(tr -d '\n' < /tmp/sb_cookie.txt | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/^Cookie:[[:space:]]*//i' -e 's/^sb-[a-z0-9]*-auth-token=//i'); printf '%s' "$v" > /tmp/sb_cookie.txt
```

**Node one-liner (safe for JSON/base64 content):**
```bash
node -e "const fs=require('fs'); let r=fs.readFileSync('/tmp/sb_cookie.txt','utf8').replace(/\s+/g,'').trim().replace(/^[\"']|[\"']$/g,'').replace(/^Cookie:\s*/i,'').replace(/^sb-[a-z0-9]+-auth-token=/i,''); fs.writeFileSync('/tmp/sb_cookie.txt',r);"
```

Then run `./scripts/auth_debug.sh`.

## How to run the script

From the repo root:

```bash
./scripts/auth_debug.sh
```

The script:

- Reads the cookie value from `/tmp/sb_cookie.txt`.
- Extracts `access_token` (JSON or base64-encoded JSON).
- Prints token length and dot count (must be 2 for a valid JWT); only the first 12 characters of the token are shown.
- Calls `http://localhost:3001/instructor/services` with `Authorization: Bearer <token>`.
- Calls `http://localhost:3012/api/instructor/services` with the `Cookie` header.
- Prints the first line of the HTTP response and the first 200 characters of the body for each call.
- Exits with code 1 if the token is invalid (dot count ≠ 2) or if either request returns 500.

## Interpreting common failures

| Symptom | Likely cause | What to check |
|--------|----------------|----------------|
| **401 Unauthenticated** | Invalid or expired token; wrong project/keys. | Token in cookie matches Supabase project (`SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`). API uses same project (same JWT secret). Cookie not expired; re-login and copy cookie again. |
| **403 Onboarding required** | User not yet onboarded. | Expected for new users. Complete onboarding in the instructor app or use a user that already has a profile and onboarding completed. |
| **500 Schema / DB errors** | DB missing tables or wrong DB. | API `DATABASE_URL` points to the correct Supabase project. Run migrations (e.g. `supabase db push` or apply `supabase/migrations/20260217120000_instructor_profiles_and_services.sql`). See `docs/SUPABASE_CLOUD_DEV_SCHEMA.md`. |
| **Connection refused** | Servers not running. | Start API (`pnpm --filter api dev`) and instructor app (`PORT=3012 pnpm --filter @frostdesk/instructor dev`). |
| **Invalid JWT (dot count ≠ 2)** | Cookie value is not a valid session JSON or token is corrupted. | Re-copy the cookie value (no extra newlines/spaces). Ensure the file contains the full JSON object (or base64-encoded JSON) with `access_token`. |

## Security

- The script never prints the full token; only length and first 12 characters.
- Do not add `/tmp/sb_cookie.txt` or any file containing tokens to version control.
- Use this protocol only in local dev; do not use production cookies or tokens.
