# BLOCK 23.0.5 — Minimal Admin Role UI

**Date:** 2026-01-24

---

## Files Modified

**6 files modified:**

1. `apps/api/src/routes/admin.ts`
   - Added `GET /admin/user-role` endpoint
   - Returns `{ ok: true, role: string | null }`

2. `apps/admin/lib/getUserRole.ts` (NEW)
   - Server-side function to fetch user role from API
   - Returns role or null

3. `apps/admin/app/admin/layout.tsx`
   - Added role display in header
   - Shows "Role: {role}" text

4. `apps/admin/app/admin/bookings/[bookingId]/page.tsx`
   - Fetches user role
   - Passes `userRole` prop to `BookingStatusOverride`

5. `apps/admin/app/admin/human-inbox/[conversationId]/page.tsx`
   - Fetches user role
   - Passes `userRole` prop to `AIDraftPanel`

6. `apps/admin/components/admin/BookingStatusOverride.tsx`
   - Added `userRole` prop
   - Checks if role is in `['system_admin', 'human_approver']`
   - Disables button and shows "Not authorized" if not allowed

7. `apps/admin/components/admin/AIDraftPanel.tsx`
   - Added `userRole` prop (optional)
   - Checks if role is in `['system_admin', 'human_approver']`
   - Disables button and shows "Not authorized" if not allowed

---

## Full Updated Code

### File 1: `apps/api/src/routes/admin.ts`

**Change:** Added endpoint after `/admin/check`

```typescript
  // GET /admin/user-role - Get authenticated user's role
  fastify.get('/admin/user-role', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const role = await getUserRole(userId);
      return { ok: true, role };
    } catch (error) {
      const normalized = normalizeError(error);
      const httpStatus = mapErrorToHttp(normalized.error);
      return reply.status(httpStatus).send({
        ok: false,
        error: normalized.error,
        ...(normalized.message ? { message: normalized.message } : {}),
      });
    }
  });
```

**Import change:**
```typescript
import { UnauthorizedError, isAdmin, getUserRole } from '@frostdesk/db/src/admin_access.js';
```

### File 2: `apps/admin/lib/getUserRole.ts` (NEW)

```typescript
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Gets the authenticated user's role.
 * 
 * Flow:
 * 1. Get Supabase session
 * 2. Call API to get user role
 * 3. Return role or null
 * 
 * @returns User role or null if not authenticated
 */
export async function getUserRole(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/user-role?userId=${session.user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.ok && data.role ? data.role : null;
  } catch {
    return null;
  }
}
```

### File 3: `apps/admin/app/admin/layout.tsx`

```typescript
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import { getUserRole } from '@/lib/getUserRole';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/admin/not-authorized');
  }

  const role = await getUserRole();

  return (
    <div>
      <div style={{
        padding: '0.75rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        fontSize: '0.875rem',
        color: '#6b7280',
      }}>
        Role: {role || 'unknown'}
      </div>
      {children}
    </div>
  );
}
```

### File 4: `apps/admin/app/admin/bookings/[bookingId]/page.tsx`

**Change:** Added role fetch and prop passing

```typescript
import { fetchAdminBookingDetail } from '@/lib/adminApi';
import { getUserRole } from '@/lib/getUserRole';
// ... other imports

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const bookingId = params.bookingId;

  try {
    const data = await fetchAdminBookingDetail(bookingId);
    const userRole = await getUserRole();

    return (
      // ... existing JSX
      <BookingStatusOverride bookingId={bookingId} currentStatus={data.booking.status} userRole={userRole} />
    );
  } catch (error: any) {
    // ... error handling
  }
}
```

### File 5: `apps/admin/app/admin/human-inbox/[conversationId]/page.tsx`

**Change:** Added role fetch and prop passing

```typescript
import { fetchHumanInboxDetail, fetchAIDraft } from '@/lib/adminApi';
import { getUserRole } from '@/lib/getUserRole';
// ... other imports

export default async function HumanInboxDetailPage({ params }: HumanInboxDetailPageProps) {
  const conversationId = params.conversationId;

  try {
    const data = await fetchHumanInboxDetail(conversationId);
    const userRole = await getUserRole();
    
    // ... existing code
    
    return (
      // ... existing JSX
      <AIDraftPanel 
        {...draftData.draft} 
        conversationId={conversationId}
        alreadySent={!!sentMessage}
        sentAt={sentMessage?.created_at}
        userRole={userRole}
      />
    );
  } catch (error: any) {
    // ... error handling
  }
}
```

### File 6: `apps/admin/components/admin/BookingStatusOverride.tsx`

**Changes:**
- Added `userRole` prop
- Added authorization check
- Disabled button if not authorized
- Shows "Not authorized" message

```typescript
interface BookingStatusOverrideProps {
  bookingId: string;
  currentStatus: string;
  userRole: string | null;
}

export default function BookingStatusOverride({ bookingId, currentStatus, userRole }: BookingStatusOverrideProps) {
  // ... existing state

  const allowedRoles = ['system_admin', 'human_approver'];
  const isAuthorized = userRole && allowedRoles.includes(userRole);

  // ... existing handlers

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.25rem', padding: '1.5rem', marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Override Booking Status</h2>
      
      {/* ... existing form fields ... */}

      {!isAuthorized && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          Not authorized
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmitClick}
        disabled={loading || !newStatus || !isAuthorized}
        // ... existing button props
      >
        Override Status
      </button>

      {/* ... existing modal ... */}
    </div>
  );
}
```

### File 7: `apps/admin/components/admin/AIDraftPanel.tsx`

**Changes:**
- Added `userRole` prop (optional)
- Added authorization check
- Disabled button if not authorized
- Shows "Not authorized" message

```typescript
interface AIDraftPanelProps {
  text: string;
  model: string;
  created_at: string;
  conversationId: string;
  alreadySent?: boolean;
  sentAt?: string;
  userRole?: string | null;
}

export default function AIDraftPanel({ 
  text, 
  model, 
  created_at, 
  conversationId,
  alreadySent = false,
  sentAt,
  userRole = null,
}: AIDraftPanelProps) {
  // ... existing state

  const allowedRoles = ['system_admin', 'human_approver'];
  const isAuthorized = userRole && allowedRoles.includes(userRole);

  // ... existing handlers

  return (
    <div style={{ /* ... existing styles ... */ }}>
      {/* ... existing header and content ... */}

      {!isAuthorized && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          Not authorized
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isSending || !isAuthorized}
        // ... existing button props
      >
        {isSending ? 'Sending...' : 'Send this reply'}
      </button>
    </div>
  );
}
```

---

## Manual Test Checklist

### 1. Role Display
- [ ] Navigate to any admin page
- [ ] Verify "Role: {role}" appears in header
- [ ] Verify role matches database value

### 2. Booking Status Override
- [ ] Navigate to `/admin/bookings/[bookingId]`
- [ ] As `system_admin`: Button enabled, no "Not authorized" message
- [ ] As `human_approver`: Button enabled, no "Not authorized" message
- [ ] As `human_operator`: Button disabled, "Not authorized" message visible
- [ ] Verify button click does nothing when disabled

### 3. AI Draft Approval
- [ ] Navigate to `/admin/human-inbox/[conversationId]`
- [ ] As `system_admin`: "Send this reply" button enabled
- [ ] As `human_approver`: "Send this reply" button enabled
- [ ] As `human_operator`: Button disabled, "Not authorized" message visible
- [ ] Verify button click does nothing when disabled

### 4. System Health Access
- [ ] Navigate to `/admin/system-health`
- [ ] As `system_admin`: Page loads successfully
- [ ] As `human_operator`: Should show error/unauthorized (server-side guard)

### 5. Regression
- [ ] All other admin pages still load
- [ ] No console errors
- [ ] Role display appears on all admin pages

---

## Summary

**Total Files Modified:** 7  
**New Files:** 1 (`getUserRole.ts`)  
**API Endpoints Added:** 1 (`GET /admin/user-role`)

**Features Added:**
- ✅ Role display in admin layout header
- ✅ Role-based UI gating for booking override
- ✅ Role-based UI gating for AI draft approval
- ✅ "Not authorized" messages for unauthorized actions
- ✅ Button disabling (no API calls when unauthorized)

**No Changes:**
- ✅ No business logic changes
- ✅ No backend guard changes (server-side guards remain)
- ✅ No UX redesign
- ✅ No new roles
