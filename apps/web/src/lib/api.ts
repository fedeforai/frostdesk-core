const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Shared headers for admin API calls. Pass the Supabase session access_token.
 * Use this so every admin request sends Bearer and avoids relying on query params for identity.
 */
export function getAdminHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface AdminCheckResponse {
  ok: boolean;
  isAdmin: boolean;
  error?: string;
  message?: string;
}

export interface ConversationSummary {
  id: string;
  instructor_id: number;
  customer_name: string;
  customer_phone: string;
  source: string;
  status: string;
  handoff_to_human: boolean;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
}

export interface AdminListResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  total?: number;
}

export interface AdminApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GetConversationsParams {
  limit?: number;
  offset?: number;
  instructorId?: string;
  status?: string;
}

export async function checkAdminStatus(accessToken: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/admin/check`, {
    method: 'GET',
    headers: getAdminHeaders(accessToken),
  });

  const data: AdminCheckResponse = await response.json();

  if (!data.ok) return false;
  if (data.error) return false;
  return data.isAdmin === true;
}

export async function getAdminConversations(
  accessToken: string,
  params: GetConversationsParams = {}
): Promise<AdminListResponse<ConversationSummary>> {
  const { limit = 50, offset = 0, instructorId, status } = params;
  
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (instructorId) {
    queryParams.append('instructorId', instructorId);
  }
  
  if (status) {
    queryParams.append('status', status);
  }

  const response = await fetch(`${API_BASE_URL}/admin/conversations?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAdminHeaders(accessToken),
  });

  const data: AdminApiResponse<AdminListResponse<ConversationSummary>> = await response.json();

  if (!data.ok || !data.data || data.error) {
    const msg = data.error && data.message ? `${data.error}: ${data.message}` : (data.error ?? 'Failed to fetch conversations');
    throw new Error(msg);
  }

  return data.data;
}
