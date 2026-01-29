import { createDbClient } from '@frostdesk/db';
import type { SupabaseClient } from '@supabase/supabase-js';

let db: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!db) {
    db = createDbClient();
  }
  if (!db) {
    throw new Error('Failed to create database client');
  }
  return db;
}
