# BLOCK 23.0.6 — Manual Test Protocol

**Date:** 2026-01-24  
**Purpose:** End-to-end verification of authentication, roles, guards, and UI gating

---

## Prerequisites

**Test Users Required:**
1. `system_admin` — User with role `system_admin` in `profiles.role`
2. `human_approver` — User with role `human_approver` in `profiles.role`
3. `human_operator` — User with role `human_operator` in `profiles.role`

**Database Setup:**
- Ensure `profiles` table exists with test users
- Each test user must have:
  - `id` matching Supabase Auth `user.id`
  - `role` set to one of: `system_admin`, `human_approver`, `human_operator`
  - `is_admin = true` (for admin access)

**Environment:**
- Admin UI running
- API server running
- Supabase Auth configured
- Test users authenticated in Supabase

---

## Section 1: Unauthenticated Access

### Test 1.1: Unauthenticated User Cannot Access Admin Routes

**Action:**
1. Open browser in incognito/private mode
2. Navigate to `/admin`
3. Navigate to `/admin/bookings`
4. Navigate to `/admin/system-health`

**Expected Result:** PASS
- All routes redirect to `/admin/not-authorized` or login page
- No admin content is visible
- No data is exposed

**If FAIL, capture:**
- Route accessed
- Error message
- Screenshot

---

## Section 2: system_admin Role

### Test 2.1: Role Badge Display

**Action:**
1. Log in as `system_admin` user
2. Navigate to any admin page (e.g., `/admin/bookings`)

**Expected Result:** PASS
- Header displays: "Role: system_admin"
- Badge is visible on all admin pages

**If FAIL, capture:**
- Page URL
- Screenshot of header
- Console errors

---

### Test 2.2: View Access (All Pages)

**Action:**
1. As `system_admin`, navigate to:
   - `/admin/bookings`
   - `/admin/bookings/[bookingId]`
   - `/admin/bookings/[bookingId]/lifecycle`
   - `/admin/conversations`
   - `/admin/human-inbox`
   - `/admin/system-health`
   - `/admin/system-degradation`

**Expected Result:** PASS
- All pages load successfully
- Data is displayed
- No "Not authorized" errors

**If FAIL, capture:**
- Page URL
- HTTP status code
- Error message
- Screenshot

---

### Test 2.3: Booking Status Override

**Action:**
1. As `system_admin`, navigate to `/admin/bookings/[bookingId]`
2. Scroll to "Override Booking Status" section
3. Select a new status from dropdown
4. Click "Override Status"
5. Confirm in modal

**Expected Result:** PASS
- "Override Status" button is enabled
- No "Not authorized" message visible
- Modal appears on click
- Status override succeeds
- Booking status updates in UI
- Audit log entry created

**If FAIL, capture:**
- Booking ID
- Selected status
- HTTP status code
- Error message
- Screenshot

---

### Test 2.4: AI Draft Approval

**Action:**
1. As `system_admin`, navigate to `/admin/human-inbox/[conversationId]`
2. Locate `AIDraftPanel` component
3. Click "Send this reply" button

**Expected Result:** PASS
- "Send this reply" button is enabled
- No "Not authorized" message visible
- Draft is sent successfully
- Message appears in conversation timeline
- Draft panel shows "Sent" status

**If FAIL, capture:**
- Conversation ID
- HTTP status code
- Error message
- Screenshot

---

### Test 2.5: System Health Access

**Action:**
1. As `system_admin`, navigate to `/admin/system-health`

**Expected Result:** PASS
- Page loads successfully
- `SystemHealthPanel` displays data
- All sections visible (Emergency Status, Feature Flags, Quota, Activity)

**If FAIL, capture:**
- HTTP status code
- Error message
- Screenshot

---

## Section 3: human_approver Role

### Test 3.1: Role Badge Display

**Action:**
1. Log in as `human_approver` user
2. Navigate to any admin page

**Expected Result:** PASS
- Header displays: "Role: human_approver"

**If FAIL, capture:**
- Page URL
- Screenshot of header

---

### Test 3.2: View Access (Standard Pages)

**Action:**
1. As `human_approver`, navigate to:
   - `/admin/bookings`
   - `/admin/bookings/[bookingId]`
   - `/admin/bookings/[bookingId]/lifecycle`
   - `/admin/conversations`
   - `/admin/human-inbox`

**Expected Result:** PASS
- All pages load successfully
- Data is displayed

**If FAIL, capture:**
- Page URL
- HTTP status code
- Error message

---

### Test 3.3: Booking Status Override (Authorized)

**Action:**
1. As `human_approver`, navigate to `/admin/bookings/[bookingId]`
2. Scroll to "Override Booking Status" section

**Expected Result:** PASS
- "Override Status" button is enabled
- No "Not authorized" message visible
- Override succeeds when executed

**If FAIL, capture:**
- Booking ID
- HTTP status code
- Error message
- Screenshot

---

### Test 3.4: AI Draft Approval (Authorized)

**Action:**
1. As `human_approver`, navigate to `/admin/human-inbox/[conversationId]`
2. Locate `AIDraftPanel`

**Expected Result:** PASS
- "Send this reply" button is enabled
- No "Not authorized" message visible
- Draft can be sent successfully

**If FAIL, capture:**
- Conversation ID
- HTTP status code
- Error message

---

### Test 3.5: System Health Access (Unauthorized)

**Action:**
1. As `human_approver`, navigate to `/admin/system-health`

**Expected Result:** PASS
- Page shows error state (403 or error message)
- No sensitive system data displayed
- Error message is explicit ("Unauthorized" or "Role not allowed")

**If FAIL, capture:**
- HTTP status code
- Data exposed (if any)
- Error message
- Screenshot

---

## Section 4: human_operator Role

### Test 4.1: Role Badge Display

**Action:**
1. Log in as `human_operator` user
2. Navigate to any admin page

**Expected Result:** PASS
- Header displays: "Role: human_operator"

**If FAIL, capture:**
- Page URL
- Screenshot of header

---

### Test 4.2: View Access (Standard Pages)

**Action:**
1. As `human_operator`, navigate to:
   - `/admin/bookings`
   - `/admin/bookings/[bookingId]`
   - `/admin/bookings/[bookingId]/lifecycle`
   - `/admin/conversations`
   - `/admin/human-inbox`

**Expected Result:** PASS
- All pages load successfully
- Data is displayed (read-only access works)

**If FAIL, capture:**
- Page URL
- HTTP status code
- Error message

---

### Test 4.3: Booking Status Override (Unauthorized)

**Action:**
1. As `human_operator`, navigate to `/admin/bookings/[bookingId]`
2. Scroll to "Override Booking Status" section

**Expected Result:** PASS
- "Override Status" button is disabled (grayed out)
- "Not authorized" message is visible above button
- Button click does nothing (no API call)
- No modal appears

**If FAIL, capture:**
- Booking ID
- Button state (enabled/disabled)
- Presence of "Not authorized" message
- Any API calls made (check Network tab)
- Screenshot

---

### Test 4.4: AI Draft Approval (Unauthorized)

**Action:**
1. As `human_operator`, navigate to `/admin/human-inbox/[conversationId]`
2. Locate `AIDraftPanel` component

**Expected Result:** PASS
- "Send this reply" button is disabled
- "Not authorized" message is visible
- Button click does nothing (no API call)
- Draft text is still visible (read-only)

**If FAIL, capture:**
- Conversation ID
- Button state
- Presence of "Not authorized" message
- Any API calls to `/admin/conversations/:id/send-ai-draft`
- Screenshot

---

### Test 4.5: System Health Access (Unauthorized)

**Action:**
1. As `human_operator`, navigate to `/admin/system-health`

**Expected Result:** PASS
- Page shows error state (403 or explicit error)
- No system health data displayed
- Error message indicates role restriction

**If FAIL, capture:**
- HTTP status code
- Any data exposed
- Error message
- Screenshot

---

## Section 5: Error Handling & Explicit Messaging

### Test 5.1: Server-Side Guard Errors

**Action:**
1. As `human_operator`, attempt to access `/admin/system-health` via direct API call:
   ```
   GET /admin/system-health?userId={human_operator_user_id}
   ```

**Expected Result:** PASS
- API returns 403 or appropriate error
- Error response includes:
  - `ok: false`
  - `error.code: 'ROLE_NOT_ALLOWED'` or similar
  - Explicit message about role restriction

**If FAIL, capture:**
- HTTP status code
- Response body
- Error structure

---

### Test 5.2: UI Error States

**Action:**
1. As `human_operator`, navigate to pages with gated actions
2. Observe error messages

**Expected Result:** PASS
- "Not authorized" messages are clear and visible
- No sensitive data is rendered when unauthorized
- Error states use consistent styling

**If FAIL, capture:**
- Page URL
- Role
- UI state
- Screenshot

---

### Test 5.3: No Silent Failures

**Action:**
1. As `human_operator`, attempt actions via browser console:
   - Try to call `overrideAdminBookingStatus` API directly
   - Try to call `approveAndSendAIDraft` API directly

**Expected Result:** PASS
- All unauthorized API calls return explicit errors
- No 200 OK responses for unauthorized actions
- No silent failures or partial data exposure

**If FAIL, capture:**
- API endpoint
- Request payload
- Response status and body
- Any data leaked

---

## Section 6: Role Consistency

### Test 6.1: Role Source of Truth

**Action:**
1. Check database: `SELECT role FROM profiles WHERE id = '{user_id}'`
2. Compare with UI display
3. Compare with API response from `/admin/user-role`

**Expected Result:** PASS
- Database role matches UI display
- Database role matches API response
- All three sources are consistent

**If FAIL, capture:**
- User ID
- Database role value
- UI displayed role
- API returned role

---

### Test 6.2: Role Change Propagation

**Action:**
1. Update user role in database: `UPDATE profiles SET role = 'human_operator' WHERE id = '{system_admin_user_id}'`
2. Refresh admin page
3. Verify UI updates

**Expected Result:** PASS
- Role badge updates to new role
- UI gating reflects new role immediately
- No cached/stale role data

**If FAIL, capture:**
- User ID
- Old role
- New role
- UI state after change
- API response after change

---

## Section 7: Edge Cases

### Test 7.1: Missing Role

**Action:**
1. Create user with no role in `profiles` or `users` table
2. Attempt to access admin pages

**Expected Result:** PASS
- User cannot access admin (fails `requireAdmin()` check)
- Or shows "Role: unknown" if somehow reaches layout
- No crashes or undefined errors

**If FAIL, capture:**
- User ID
- Database state
- Error behavior
- Screenshot

---

### Test 7.2: Invalid Role Value

**Action:**
1. Manually set invalid role: `UPDATE profiles SET role = 'invalid_role' WHERE id = '{user_id}'`
2. Attempt to access admin pages

**Expected Result:** PASS
- System handles gracefully
- Shows "Role: invalid_role" or "unknown"
- Guards still work (invalid role not in allowed list)

**If FAIL, capture:**
- User ID
- Invalid role value
- System behavior
- Error messages

---

### Test 7.3: Role in users Table (Fallback)

**Action:**
1. Create user with role only in `users` table (not in `profiles`)
2. Set `users.role = 'admin'` (legacy)
3. Access admin pages

**Expected Result:** PASS
- System falls back to `users.role`
- `isAdmin()` returns true (for admin role)
- UI may show role from `getUserRole()` (which checks `profiles` first, then `users`)

**If FAIL, capture:**
- User ID
- Database state (profiles vs users)
- System behavior

---

## Section 8: Integration Verification

### Test 8.1: End-to-End Flow — Booking Override

**Action:**
1. As `human_approver`:
   - Navigate to booking detail
   - Override status from `proposed` to `confirmed`
   - Verify success
2. As `human_operator`:
   - Navigate to same booking
   - Verify override button is disabled
   - Verify "Not authorized" message

**Expected Result:** PASS
- `human_approver` can override
- `human_operator` sees disabled state
- No API calls from unauthorized user
- Audit log shows correct actor

**If FAIL, capture:**
- Booking ID
- Roles tested
- Actions attempted
- Results

---

### Test 8.2: End-to-End Flow — AI Draft

**Action:**
1. As `system_admin`:
   - Navigate to conversation with AI draft
   - Send draft
   - Verify message appears
2. As `human_operator`:
   - Navigate to same conversation
   - Verify send button disabled
   - Verify "Not authorized" message

**Expected Result:** PASS
- `system_admin` can send
- `human_operator` cannot send
- No unauthorized sends

**If FAIL, capture:**
- Conversation ID
- Roles tested
- Actions attempted
- Results

---

## Test Execution Log

**Tester:** _________________  
**Date:** _________________  
**Environment:** _________________

| Test ID | Role | Action | Expected | Actual | Status | Notes |
|---------|------|--------|----------|--------|--------|-------|
| 1.1 | None | Access /admin | Redirect | | | |
| 2.1 | system_admin | View role badge | "Role: system_admin" | | | |
| 2.2 | system_admin | View all pages | All load | | | |
| 2.3 | system_admin | Override booking | Success | | | |
| 2.4 | system_admin | Send AI draft | Success | | | |
| 2.5 | system_admin | View system-health | Success | | | |
| 3.1 | human_approver | View role badge | "Role: human_approver" | | | |
| 3.2 | human_approver | View pages | All load | | | |
| 3.3 | human_approver | Override booking | Success | | | |
| 3.4 | human_approver | Send AI draft | Success | | | |
| 3.5 | human_approver | View system-health | Error 403 | | | |
| 4.1 | human_operator | View role badge | "Role: human_operator" | | | |
| 4.2 | human_operator | View pages | All load | | | |
| 4.3 | human_operator | Override booking | Disabled | | | |
| 4.4 | human_operator | Send AI draft | Disabled | | | |
| 4.5 | human_operator | View system-health | Error 403 | | | |

---

## Failure Capture Template

**Test ID:** _________________  
**Role:** _________________  
**Route:** _________________  
**Expected:** _________________  
**Actual:** _________________  
**HTTP Status:** _________________  
**Error Message:** _________________  
**Screenshot:** [attach]  
**Console Errors:** _________________  
**Network Requests:** _________________  

---

## Definition of Done

**All tests must PASS for system to be considered verified:**

- ✅ Unauthenticated users cannot access admin
- ✅ `system_admin` has full access
- ✅ `human_approver` can approve but not view system health
- ✅ `human_operator` can view but cannot perform sensitive actions
- ✅ Role badge displays correctly for all roles
- ✅ UI gating matches server-side guards
- ✅ No silent failures
- ✅ All errors are explicit and logged

**System is verified when:**
- All 20+ test cases pass
- No unauthorized actions are possible
- All error states are explicit
- Role display is consistent
