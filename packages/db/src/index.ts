import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function createDbClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return createClient(url, serviceRoleKey);
}

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return databaseUrl;
}

export { getClient } from './client.js';
export { createConversation, createMessage } from './messages.js';
export * from './bookings.js';