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
 * Extracts the instructor user ID from the request by verifying the Supabase JWT
 * in the Authorization header.
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
    throw new InstructorAuthError(error.message || 'Invalid or expired token');
  }
  if (!user?.id) {
    throw new InstructorAuthError('User not found');
  }

  return user.id;
}

/**
 * Validates Supabase JWT and enforces admin role. Use for all /admin/* routes.
 */
export async function requireAdminUser(request: {
  headers?: { authorization?: string };
}): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new AdminOnlyError('Admin access required');
  }
  return userId;
}
