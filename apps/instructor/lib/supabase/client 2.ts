/**
 * Adapter: re-export for alias @/lib/supabase/client (build fix only).
 * Uses existing getSupabaseBrowser(); throws if not configured so callers get a non-null client type.
 */
import { getSupabaseBrowser } from '../supabaseBrowser';

export function createClient() {
  const client = getSupabaseBrowser();
  if (!client) throw new Error('Supabase client not configured');
  return client;
}
