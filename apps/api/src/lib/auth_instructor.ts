import { createDbClient, isAdmin } from '@frostdesk/db';

export class InstructorAuthError extends Error {
  code = 'UNAUTHENTICATED' as const;
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'InstructorAuthError';
  }
}

export class AdminOnlyError extends Error {
  code = 'ADMIN_ONLY' as const;
  constructor(message: string = 'Admin access required') {
    super(message);
    this.name = 'AdminOnlyError';
  }
}

/**
 * Extracts the instructor user ID by verifying the Supabase JWT in the Authorization header.
 * Uses createDbClient() so the same Supabase project (URL + key from env) as the token issuer is used; set SUPABASE_URL + SUPABASE_ANON_KEY or NEXT_PUBLIC_* in API env to avoid "Invalid API key".
 */
export async function getUserIdFromJwt(request: {
  headers?: { authorization?: string };
}): Promise<string> {
  const authHeader = request?.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    throw new InstructorAuthError('Missing or invalid Authorization header');
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!token) {
    throw new InstructorAuthError('Missing Bearer token');
  }

  const supabase = createDbClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    if (error.message && /invalid\s*api\s*key/i.test(error.message)) {
      const e = new Error('Server misconfigured');
      (e as any).code = 'INTERNAL_ERROR';
      throw e;
    }
    throw new InstructorAuthError(error.message || 'Invalid or expired token');
  }
  if (!user?.id) {
    throw new InstructorAuthError('User not found');
  }

  return user.id;
}

/**
 * Validates Supabase JWT and enforces admin role. Use for all /admin/* routes.
 * In development (NODE_ENV !== 'production'), any authenticated user is treated as admin
 * so you can access the admin app without a row in admin_users.
 */
export async function requireAdminUser(request: {
  headers?: { authorization?: string };
  log?: { warn: (a: unknown, b?: string) => void };
}): Promise<string> {
  const userId = await getUserIdFromJwt(request);

  if (process.env.NODE_ENV !== 'production') {
    const admin = await isAdmin(userId);
    if (!admin) {
      request.log?.warn?.(
        { userId, hint: 'Add this user_id to public.admin_users or rely on dev bypass' },
        '[requireAdminUser] user not in admin_users'
      );
      // In development only: treat any authenticated user as admin so you can use the admin app
      return userId;
    }
  } else {
    const admin = await isAdmin(userId);
    if (!admin) {
      request.log?.warn?.({ userId }, '[requireAdminUser] 403: user_id not in admin_users');
      throw new AdminOnlyError('Admin access required');
    }
  }

  return userId;
}
