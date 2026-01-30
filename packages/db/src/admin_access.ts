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
 * 
 * Checks in order:
 * 1. profiles.is_admin = true (preferred)
 * 2. users.role = 'admin' (fallback)
 * 
 * If profiles/users tables are missing or any query fails, returns false
 * (so caller gets 403 ADMIN_ONLY, not 500 INTERNAL_ERROR).
 * 
 * @param userId - User ID to check
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // First check profiles.is_admin (preferred)
    const profileResult = await sql<Array<{ is_admin: boolean }>>`
      SELECT is_admin
      FROM profiles
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (profileResult.length > 0) {
      return profileResult[0].is_admin === true;
    }

    // Fallback to users.role if profiles table doesn't have the user
    const userResult = await sql<Array<{ role: string }>>`
      SELECT role
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (userResult.length > 0) {
      return userResult[0].role === 'admin';
    }

    return false;
  } catch (err) {
    // Tables missing or query failed: treat as not admin (403, not 500)
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
 * Gets the user's role from profiles or users table.
 * 
 * @param userId - User ID to check
 * @returns User role or null if not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  // First check profiles.role (preferred)
  const profileResult = await sql<Array<{ role: string }>>`
    SELECT role
    FROM profiles
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (profileResult.length > 0) {
    return profileResult[0].role;
  }

  // Fallback to users.role if profiles table doesn't have the user
  const userResult = await sql<Array<{ role: string | null }>>`
    SELECT role
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (userResult.length > 0) {
    return userResult[0].role;
  }

  // User not found
  return null;
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
