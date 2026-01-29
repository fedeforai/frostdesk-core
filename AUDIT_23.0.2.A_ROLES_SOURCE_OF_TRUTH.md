# BLOCK 23.0.2.A — Roles Source of Truth (DB-backed, minimal)

**Date:** 2026-01-24

---

## Section 1: admin_access.ts Exact Queries

**File:** `packages/db/src/admin_access.ts`

**Query 1: profiles table**
- Line 25-30:
```sql
SELECT is_admin
FROM profiles
WHERE id = ${userId}
LIMIT 1
```
- Columns read: `is_admin` (boolean)
- Primary key used: `id` (UUID, matches userId)
- Expected: Returns `{ is_admin: boolean }` or empty array

**Query 2: users table**
- Line 37-42:
```sql
SELECT role
FROM users
WHERE id = ${userId}
LIMIT 1
```
- Columns read: `role` (text/string)
- Primary key used: `id` (UUID, matches userId)
- Expected: Returns `{ role: string }` or empty array
- Usage: Fallback if profiles table doesn't have the user
- Check: `userResult[0].role === 'admin'` (exact string match)

**Note:** Query 1 uses `profiles.id`, Query 2 uses `users.id`. Both expect UUID matching Supabase Auth `user.id`.

---

## Section 2: All Other Role/Identity Reads

**Search Results:**
- No other files found reading from `profiles` table
- No other files found reading from `users` table
- `instructor_profiles` table exists but is separate (instructor-specific, not user identity)

**Conclusion:** Only `packages/db/src/admin_access.ts` reads from `profiles` and `users` tables.

---

## Section 3: Minimal Required Schemas

### public.profiles

**Required Columns:**
- `id` (UUID, PRIMARY KEY, NOT NULL)
  - Used in: `WHERE id = ${userId}` (line 28)
  - Must match Supabase Auth `user.id`
- `is_admin` (BOOLEAN, nullable or NOT NULL)
  - Used in: `SELECT is_admin` (line 26)
  - Checked: `profileResult[0].is_admin === true` (line 33)
  - Type: boolean (from TypeScript type annotation)

**Optional but Recommended:**
- `role` (TEXT, nullable or NOT NULL)
  - For future granular roles (system_admin, human_operator, human_approver)
  - Not currently read by code

### public.users

**Required Columns:**
- `id` (UUID, PRIMARY KEY, NOT NULL)
  - Used in: `WHERE id = ${userId}` (line 40)
  - Must match Supabase Auth `user.id`
- `role` (TEXT, nullable)
  - Used in: `SELECT role` (line 38)
  - Checked: `userResult[0].role === 'admin'` (line 45)
  - Type: string (from TypeScript type annotation)
  - Value checked: exact string `'admin'`

**Note:** `users` table is fallback only. If `profiles` has the user, `users` is never queried.

---

## Final: SAFE TO PROCEED WITH MIGRATION 23.0.2.B

**Answer:** YES

**Reasoning:**
- Only one file reads from these tables (`admin_access.ts`)
- Exact column names and types are known:
  - `profiles.id` (UUID), `profiles.is_admin` (boolean)
  - `users.id` (UUID), `users.role` (text)
- No INSERT/UPDATE queries found (read-only usage)
- Migration can be purely additive
- Backward compatibility: `profiles.is_admin` must remain for existing `isAdmin()` logic

**Migration Requirements:**
1. Create `profiles` table with `id` (PK), `is_admin` (boolean)
2. Create `users` table with `id` (PK), `role` (text) - for fallback compatibility
3. Add `profiles.role` column for granular roles (additive, doesn't break existing code)
4. Add check constraints for role values (system_admin, human_operator, human_approver)
