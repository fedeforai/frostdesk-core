import { createClient } from '@supabase/supabase-js';
import type { ConversationObservability } from '../../../packages/shared/src/types/conversationObservability.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Fetches conversation observability data from the Supabase Edge Function.
 * 
 * @param conversationId - Conversation ID
 * @returns Conversation observability data
 */
export async function fetchConversationObservability(
  conversationId: string
): Promise<ConversationObservability> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // Construct Supabase Edge Function URL
  const functionUrl = `${supabaseUrl}/functions/v1/human/observability`;
  const queryParams = new URLSearchParams({
    conversationId,
  });

  const response = await fetch(`${functionUrl}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error(errorData.error?.message || 'Unable to load observability data');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || 'Unable to load observability data';
    throw errorObj;
  }

  const data = await response.json();
  return data;
}
