import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server vs client env resolution:
 * - Server (e.g. apps/api): prefer SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.
 * - Client (e.g. apps/web, apps/admin): typically use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Resolution order below works in both; set the vars that exist in your context.
 */
export function createDbClient(): SupabaseClient {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey)
      missing.push(
        'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(', ')} are required`
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
