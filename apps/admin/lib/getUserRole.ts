import { getServerSession } from '@/lib/supabaseServer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Gets the authenticated user's role from the API using server session (cookies).
 * Same auth source as requireAdmin and the API proxy.
 *
 * @returns User role or null if not authenticated
 */
export async function getUserRole(): Promise<string | null> {
  const session = await getServerSession();

  if (!session?.access_token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/user-role`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
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
