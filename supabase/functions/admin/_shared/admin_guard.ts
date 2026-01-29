import { assertAdminAccess } from '../../../../packages/db/src/admin_access.js';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Extracts userId from Supabase auth and asserts admin access.
 * 
 * @param req - Request object with Supabase auth headers
 * @returns User ID if admin
 * @throws UnauthorizedError if not admin or auth fails
 */
export async function requireAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  // Get Supabase URL and anon key from environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  // Create Supabase client with auth header
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Get user from auth
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication failed');
  }

  // Assert admin access
  await assertAdminAccess(user.id);

  return user.id;
}
