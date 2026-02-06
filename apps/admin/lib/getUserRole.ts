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
 * DEV-SAFE: In development, returns system_admin for UI consistency.
 * PROD: Full authentication and role lookup.
 * 
 * Flow:
 * 1. DEV: Return system_admin
 * 2. PROD: Get Supabase session
 * 3. PROD: Call API to get user role
 * 4. PROD: Return role or null
 * 
 * @returns User role or null if not authenticated (production only)
 */
export async function getUserRole(): Promise<string | null> {
  // DEV-SAFE: Return system_admin in development for UI consistency
  if (process.env.NODE_ENV === 'development') {
    return 'system_admin';
  }

  // PRODUCTION: Full authentication and role lookup
  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/user-role`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
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
