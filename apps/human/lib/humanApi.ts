import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export interface HumanInboxItem {
  conversation_id: string;
  customer_identifier: string;
  instructor_id: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface FetchHumanInboxParams {
  limit: number;
  offset: number;
}

export interface FetchHumanInboxResponse {
  items: HumanInboxItem[];
  limit: number;
  offset: number;
}

/**
 * Fetches human inbox conversations from the Supabase Edge Function.
 * 
 * @param params - Query parameters for pagination
 * @returns Human inbox list with pagination info
 */
export async function fetchHumanInbox(
  params: FetchHumanInboxParams
): Promise<FetchHumanInboxResponse> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/human/inbox`;

  const queryParams = new URLSearchParams({
    limit: params.limit.toString(),
    offset: params.offset.toString(),
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
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

export interface SendHumanReplyParams {
  conversationId: string;
  content: string;
}

export interface SendHumanReplyResponse {
  messageId: string;
}

/**
 * Sends a human reply to a conversation.
 * 
 * @param params - Reply parameters
 * @returns Message ID
 */
export async function sendHumanReply(
  params: SendHumanReplyParams
): Promise<SendHumanReplyResponse> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/human/reply`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      conversationId: params.conversationId,
      content: params.content,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

export interface ConversationDetails {
  id: string;
}

/**
 * Fetches conversation details.
 * 
 * @param conversationId - Conversation ID
 * @returns Conversation details, or null if not found
 */
export async function fetchConversationDetails(
  conversationId: string
): Promise<ConversationDetails | null> {
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

  // Check if conversation exists in human inbox
  const inboxUrl = `${supabaseUrl}/functions/v1/human/inbox`;
  const queryParams = new URLSearchParams({
    limit: '1000',
    offset: '0',
  });

  const response = await fetch(`${inboxUrl}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
    throw errorObj;
  }

  const data = await response.json();
  const conversation = data.items.find((item: any) => item.conversation_id === conversationId);
  
  if (!conversation) {
    return null;
  }

  return {
    id: conversation.conversation_id,
  };
}

/**
 * Resumes AI automation for a conversation.
 * 
 * @param conversationId - Conversation ID
 */
export async function resumeHumanConversation(
  conversationId: string
): Promise<void> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/human/resume`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
    throw errorObj;
  }

  const data = await response.json();
  return;
}

export async function resumeAI(conversationId: string) {
  const res = await fetch("/supabase/functions/human-resume-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversationId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  instructor_id: number | null;
  direction: 'inbound' | 'outbound';
  role: string | null;
  content: string;
  created_at: string;
}

export interface FetchConversationMessagesParams {
  conversationId: string;
  limit: number;
  offset: number;
}

export interface FetchConversationMessagesResponse {
  items: ConversationMessage[];
  limit: number;
  offset: number;
}

/**
 * Fetches conversation messages from the admin API (read-only).
 * Uses existing admin endpoint since it's read-only and already tested.
 * 
 * @param params - Query parameters including conversationId, pagination
 * @returns Message list with pagination info
 */
export async function fetchConversationMessages(
  params: FetchConversationMessagesParams
): Promise<FetchConversationMessagesResponse> {
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

  // Use existing admin API endpoint (read-only, already tested)
  const functionUrl = `${supabaseUrl}/functions/v1/admin/list_messages`;

  const queryParams = new URLSearchParams({
    conversationId: params.conversationId,
    limit: params.limit.toString(),
    offset: params.offset.toString(),
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
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
    throw errorObj;
  }

  const data = await response.json();
  return data;
}
