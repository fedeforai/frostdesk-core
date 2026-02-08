import { sql } from './client.js';

export class UnauthorizedError extends Error {
  code = 'ADMIN_ONLY';
  
  constructor() {
    super('Admin access required');
    this.name = 'UnauthorizedError';
  }
}

export class RoleNotAllowedError extends Error {
  code = 'ROLE_NOT_ALLOWED';
  
  constructor(role: string | null, allowedRoles: string[]) {
    super(`Unauthorized: role '${role || 'unknown'}' not allowed. Allowed roles: ${allowedRoles.join(', ')}`);
    this.name = 'RoleNotAllowedError';
  }
}

export class AuthenticationRequiredError extends Error {
  code = 'AUTHENTICATION_REQUIRED';
  
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Determines if a user is an admin.
 * Uses public.admin_users (user_id = auth user id). Table created by migration add_admin_users_table.
 * If the table is missing or query fails, returns false (403 ADMIN_ONLY, not 500).
 *
 * @param userId - Auth user ID (auth.users.id)
 * @returns true if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const rows = await sql<Array<{ user_id: string }>>`
      SELECT user_id
      FROM public.admin_users
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (err) {
    console.error('[admin_access] isAdmin query failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Asserts that a user is authenticated (userId is provided).
 * 
 * @param userId - User ID to check
 * @throws AuthenticationRequiredError if userId is null, undefined, or empty
 */
export async function assertAuthenticated(userId: string | null | undefined): Promise<void> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new AuthenticationRequiredError();
  }
}

/**
 * Gets the user's role for admin UI (system_admin, human_approver, etc.).
 * Uses public.admin_users: if present, returns 'system_admin'.
 *
 * @param userId - Auth user ID
 * @returns Role string or null if not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const rows = await sql<Array<{ user_id: string }>>`
      SELECT user_id
      FROM public.admin_users
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return rows.length > 0 ? 'system_admin' : null;
  } catch (err) {
    console.error('[admin_access] getUserRole query failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Asserts that a user has one of the allowed roles.
 * 
 * @param userId - User ID to check
 * @param allowedRoles - Array of role names that are allowed
 * @throws AuthenticationRequiredError if userId is invalid
 * @throws RoleNotAllowedError if user's role is not in allowedRoles
 */
export async function assertRoleAllowed(
  userId: string | null | undefined,
  allowedRoles: string[]
): Promise<void> {
  // First assert authentication
  await assertAuthenticated(userId);

  // Get user role
  const userRole = await getUserRole(userId!);

  // Check if role is in allowed list
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new RoleNotAllowedError(userRole, allowedRoles);
  }
}

/**
 * Asserts that a user has admin access.
 * 
 * @param userId - User ID to check
 * @throws UnauthorizedError if user is not an admin
 */
export async function assertAdminAccess(userId: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new UnauthorizedError();
  }
}
