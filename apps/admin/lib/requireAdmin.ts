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

export interface AdminCheckError {
  code: 'ADMIN_ONLY';
}

/**
 * Requires admin access. Throws if user is not admin.
 * 
 * DEV-SAFE: In development, bypasses auth check for faster iteration.
 * PROD: Full authentication and authorization checks.
 * 
 * Flow:
 * 1. DEV: Return immediately (bypass)
 * 2. PROD: Get Supabase session
 * 3. PROD: Call admin check endpoint
 * 4. PROD: Throw if not admin
 * 
 * @throws {AdminCheckError} If user is not admin (production only)
 */
export async function requireAdmin(): Promise<void> {
  // DEV-SAFE: Bypass auth in development for faster iteration
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // PRODUCTION: Full authentication and authorization
  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    const error: AdminCheckError = { code: 'ADMIN_ONLY' };
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}/admin/check?userId=${session.user.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!data.ok || !data.isAdmin || data.error) {
    const error: AdminCheckError = { code: 'ADMIN_ONLY' };
    throw error;
  }
}
