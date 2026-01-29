import { assertAdminAccess as dbAssertAdminAccess } from '@frostdesk/db/src/admin_access.js';

/**
 * Asserts admin access by extracting userId from request context.
 * 
 * This is a convenience wrapper for use in API services.
 * Extracts userId from request headers or query params.
 * 
 * @param request - Fastify request object (or any object with headers/query)
 * @throws UnauthorizedError if user is not an admin
 */
export async function assertAdminAccess(request?: any): Promise<void> {
  // Extract userId from request context
  // Try header first, then query param
  const userId = request?.headers?.['x-user-id'] || request?.query?.userId;
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID required for admin access check');
  }

  await dbAssertAdminAccess(userId);
}
