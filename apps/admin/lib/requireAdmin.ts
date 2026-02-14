import { getServerSession } from '@/lib/supabaseServer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AdminCheckError {
  code: 'UNAUTHENTICATED' | 'ADMIN_ONLY';
}

/**
 * Requires admin access. Uses server session (cookies) so layout and proxy share the same auth.
 * Throws if user is not admin. No dev bypass: real auth in dev and prod.
 *
 * @throws {AdminCheckError} If session missing or not admin
 */
export async function requireAdmin(): Promise<void> {
  let session;
  try {
    session = await getServerSession();
  } catch {
    throw { code: 'UNAUTHENTICATED' as const };
  }

  if (!session?.user?.id || !session.access_token) {
    throw { code: 'UNAUTHENTICATED' as const };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin/check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    // API non raggiungibile: tratta come non autenticato così l'utente può riprovare dal login
    throw { code: 'UNAUTHENTICATED' as const };
  }

  if (response.status === 401) {
    throw { code: 'UNAUTHENTICATED' as const };
  }
  if (response.status === 403) {
    throw { code: 'ADMIN_ONLY' as const };
  }

  let data: { ok?: boolean; isAdmin?: boolean; error?: string };
  try {
    data = await response.json();
  } catch {
    throw { code: 'ADMIN_ONLY' as const };
  }

  if (!data.ok || !data.isAdmin || data.error) {
    throw { code: (data.error ?? 'ADMIN_ONLY') as 'UNAUTHENTICATED' | 'ADMIN_ONLY' };
  }
}
