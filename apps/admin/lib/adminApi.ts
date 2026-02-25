import { createClient } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/** In browser use cookie-based client (same as login) so session is found after admin login. */
function getSessionClient() {
  if (typeof window !== 'undefined') {
    const browser = getSupabaseBrowser();
    if (browser) return browser;
  }
  return getSupabaseClient();
}

/** Admin requests: identity from Bearer only; no x-user-id or userId query. */
function getAdminFetchOptions(session: { access_token: string }) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  };
}

/** Parse API error body: { ok: false, error: string, message?: string }. */
function parseAdminErrorBody(data: any, fallback: string): { message: string; status?: number } {
  const message =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' ? data.error : '') ||
    fallback;
  return { message };
}

export interface IntentConfidenceBucket {
  bucket: 'low' | 'medium' | 'high';
  count: number;
}

export interface FetchIntentConfidenceResponse {
  ok: true;
  buckets: IntentConfidenceBucket[];
}

export interface HumanInboxDetail {
  conversation_id: string;
  channel: string;
  status: string;
  // ai_enabled not in schema
  created_at: string;
  booking: {
    booking_id: string;
    status: string;
    instructor_id: string;
    created_at: string;
  } | null;
  messages: Array<{
    message_id: string;
    direction: 'inbound' | 'outbound';
    message_text: string | null;
    sender_identity: string | null;
    created_at: string;
    intent: string | null;
    confidence: number | null;
    model: string | null;
  }>;
}

export interface AIDecision {
  eligible: boolean;
  blockers: Array<
    | 'low_confidence'
    | 'explicit_request'
    | 'negative_sentiment'
    | 'booking_risk'
    | 'policy_block'
    | 'ai_disabled'
  >;
}

/** AI snapshot row as returned by GET /admin/human-inbox/:conversationId (read-only). Aligned with ai_snapshots table. */
export interface AISnapshotForMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  channel: string;
  relevant: boolean;
  relevance_confidence: number;
  relevance_reason: string | null;
  intent: string | null;
  intent_confidence: number | null;
  model: string;
  created_at: string;
}

export interface FetchHumanInboxDetailResponse {
  ok: true;
  detail: HumanInboxDetail;
  ai_decision: AIDecision;
  /** AI snapshots keyed by message_id (F2.5.7). Present only when snapshots exist. */
  ai_snapshots_by_message_id?: Record<string, AISnapshotForMessage>;
}

/** Human inbox list item (GET /admin/human-inbox). Read-only; values from API only. */
export interface HumanInboxItem {
  conversation_id: string;
  channel: string;
  status: string;
  last_message: {
    direction: 'inbound' | 'outbound' | null;
    text: string | null;
    created_at: string | null;
  };
  last_activity_at: string;
  /** true iff conversation needs human (from API; no UI logic). */
  needs_human: boolean;
  /** Audit/debug only; from API. No inference, no thresholds. */
  intent_confidence?: number | null;
  /** Audit/debug only; from API. No inference, no thresholds. */
  relevance_confidence?: number | null;
}

export interface FetchHumanInboxResponse {
  ok: true;
  items: HumanInboxItem[];
}

/**
 * Fetches human inbox list from the Fastify API (READ-ONLY).
 * Uses existing needs_human from API; no new logic.
 */
export async function fetchHumanInbox(params?: {
  status?: string;
  channel?: string;
}): Promise<FetchHumanInboxResponse> {
  const useProxy = typeof window !== 'undefined';

  if (useProxy) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.channel) queryParams.append('channel', params.channel);
    const qs = queryParams.toString();
    const response = await fetch(`/api/admin/human-inbox${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const { message } = parseAdminErrorBody(errorData, 'Failed to fetch human inbox');
      const errorObj = new Error(message);
      (errorObj as any).status = response.status;
      throw errorObj;
    }
    return response.json();
  }

  const supabase = getSessionClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.channel) queryParams.append('channel', params.channel);
  const qs = queryParams.toString();
  const url = `${API_BASE_URL}/admin/human-inbox${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch human inbox');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches intent confidence telemetry from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches intent confidence stats from GET /admin/intent-confidence
 * - Returns confidence buckets (low/medium/high) with counts
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No routing
 * - No AI calls
 * - No automation
 * - No side effects
 * 
 * @param params - Optional date filters
 * @returns Intent confidence buckets
 */
export async function fetchIntentConfidence(
  params?: { from?: string; to?: string }
): Promise<FetchIntentConfidenceResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  const qs = queryParams.toString();
  const url = `${API_BASE_URL}/admin/intent-confidence${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch intent confidence');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */
export async function fetchConversationTimeline(conversationId: string) {
  const response = await fetchConversationTimelineEvents(conversationId);
  
  // Transform events to include payload
  const transformedEvents = response.events.map((event) => ({
    type: event.type,
    actor: event.actor,
    timestamp: event.timestamp,
    payload: {
      label: event.label,
      ...(event.href ? { href: event.href } : {}),
    },
  }));

  return {
    ok: true,
    events: transformedEvents,
  };
}

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */
export async function fetchConversationTimelineEvents(
  conversationId: string
): Promise<FetchConversationTimelineEventsResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/conversations/${conversationId}/timeline`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch conversation timeline');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */
export async function fetchKPISnapshot(): Promise<FetchKPISnapshotResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/kpi`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch KPI snapshot');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminDashboardMetrics {
  total_conversations: number;
  pending_ai_drafts: number;
  active_bookings: number;
  overrides_today: number;
}

export interface FetchDashboardMetricsResponse {
  ok: true;
  metrics: AdminDashboardMetrics;
}

/**
 * Fetches admin dashboard metrics from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches dashboard metrics from GET /admin/dashboard
 * - Returns aggregated metrics (conversations, drafts, bookings, overrides)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No routing
 * - No AI calls
 * - No automation
 * - No side effects
 * 
 * @returns Dashboard metrics
 */
export async function fetchDashboardMetrics(): Promise<FetchDashboardMetricsResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/dashboard`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch dashboard metrics');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

/**
 * Fetches human inbox detail data from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches human inbox detail from GET /admin/human-inbox/:conversationId
 * - Returns conversation with booking and messages
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No routing
 * - No AI calls
 * - No automation
 * - No side effects
 * 
 * @param conversationId - UUID of the conversation
 * @returns Human inbox detail data
 */
export async function fetchHumanInboxDetail(
  conversationId: string
): Promise<FetchHumanInboxDetailResponse> {
  const useProxy = typeof window !== 'undefined';

  if (useProxy) {
    const response = await fetch(`/api/admin/human-inbox/${conversationId}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const { message } = parseAdminErrorBody(errorData, 'Failed to fetch human inbox detail');
      const errorObj = new Error(message);
      (errorObj as any).status = response.status;
      throw errorObj;
    }
    return response.json();
  }

  const supabase = getSessionClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/human-inbox/${conversationId}`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch human inbox detail');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminDashboardMetrics {
  total_conversations: number;
  pending_ai_drafts: number;
  active_bookings: number;
  overrides_today: number;
}

export interface FetchDashboardMetricsResponse {
  ok: true;
  metrics: AdminDashboardMetrics;
}

/**
 * Fetches admin dashboard metrics from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches dashboard metrics from GET /admin/dashboard
 * - Returns aggregated metrics (conversations, drafts, bookings, overrides)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No routing
 * - No AI calls
 * - No automation
 * - No side effects
 * 
 * @returns Dashboard metrics
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AIDraft {
  text: string;
  model: string;
  created_at: string;
}

export interface FetchAIDraftResponse {
  ok: true;
  draft: AIDraft;
}

/**
 * Fetches AI draft reply from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches AI draft from GET /admin/conversations/:conversationId/ai-draft
 * - Returns draft text, model, and timestamp
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No sending
 * - No side effects
 * 
 * @param conversationId - UUID of the conversation
 * @returns AI draft data
 */
export async function fetchAIDraft(
  conversationId: string
): Promise<FetchAIDraftResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/conversations/${conversationId}/ai-draft`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch AI draft');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminDashboardMetrics {
  total_conversations: number;
  pending_ai_drafts: number;
  active_bookings: number;
  overrides_today: number;
}

export interface FetchDashboardMetricsResponse {
  ok: true;
  metrics: AdminDashboardMetrics;
}

/**
 * Fetches admin dashboard metrics from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches dashboard metrics from GET /admin/dashboard
 * - Returns aggregated metrics (conversations, drafts, bookings, overrides)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No routing
 * - No AI calls
 * - No automation
 * - No side effects
 * 
 * @returns Dashboard metrics
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AdminKPISnapshot {
  conversations_today: number;
  ai_drafts_pending: number;
  human_overrides_today: number;
  bookings_created_today: number;
}

export interface FetchKPISnapshotResponse {
  ok: true;
  snapshot: AdminKPISnapshot;
}

/**
 * Fetches admin KPI snapshot from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches KPI snapshot from GET /admin/kpi
 * - Returns today's KPIs (conversations, drafts, overrides, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @returns KPI snapshot
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface TimelineEvent {
  type:
    | 'message_received'
    | 'ai_draft_created'
    | 'human_approved'
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled';
  label: string;
  timestamp: string;
  actor: 'customer' | 'ai' | 'human' | 'system';
  href?: string;
}

export interface FetchConversationTimelineEventsResponse {
  ok: true;
  events: TimelineEvent[];
}

/**
 * Fetches conversation timeline events from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches timeline events from GET /admin/conversations/:conversationId/timeline
 * - Returns chronological events (messages, drafts, approvals, bookings)
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No caching
 * 
 * @param conversationId - UUID of the conversation
 * @returns Timeline events
 */

/**
 * Fetches conversation timeline and transforms events to include payload.
 * 
 * Maps the existing API structure to the UI-friendly format with payload.
 */

export interface AIFeatureFlags {
  ai_enabled: boolean;
  ai_whatsapp_enabled: boolean;
}

export interface FetchAIFeatureFlagsResponse {
  ok: true;
  flags: AIFeatureFlags;
  emergency_disabled: boolean;
}

/**
 * Fetches AI feature flags status from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches AI feature flags from GET /admin/ai-feature-flags
 * - Returns AI global and WhatsApp AI status
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No toggles
 * - No side effects
 * 
 * @returns AI feature flags status
 */
export async function fetchAIFeatureFlags(): Promise<FetchAIFeatureFlagsResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/ai-feature-flags`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch AI feature flags');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data = await response.json();
  return data;
}

export interface BookingLifecycleEvent {
  type: 'booking_created' | 'manual_override' | 'status_transition';
  actor: string;
  from: string | null;
  to: string | null;
  timestamp: string;
}

export interface FetchBookingLifecycleResponse {
  ok: true;
  events: BookingLifecycleEvent[];
}

/**
 * Fetches booking lifecycle timeline from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches lifecycle events from GET /admin/bookings/:bookingId/lifecycle
 * - Returns chronological lifecycle events
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * 
 * @param bookingId - UUID of the booking
 * @returns Lifecycle events array
 */
export async function fetchBookingLifecycle(
  bookingId: string
): Promise<BookingLifecycleEvent[]> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch(`/api/admin/bookings/${bookingId}/lifecycle`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');
      response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/lifecycle`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error('Network error');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch booking lifecycle');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data: FetchBookingLifecycleResponse = await response.json();
  return data.events;
}

/**
 * Sends an outbound message (manual send only).
 * 
 * WHAT IT DOES:
 * - Sends POST /admin/messages/outbound
 * - Persists outbound message to messages table
 * - Makes message visible in UI (timeline / inbox)
 * 
 * WHAT IT DOES NOT DO:
 * - No WhatsApp delivery
 * - No AI calls
 * - No booking creation
 * - No automation
 * - No side effects beyond persistence
 * 
 * @param params - Outbound message parameters
 * @throws Error if request fails
 */
export async function sendOutboundMessage(params: {
  conversationId: string;
  text: string;
}): Promise<void> {
  const useProxy = typeof window !== 'undefined';
  const body = JSON.stringify({
    conversation_id: params.conversationId,
    text: params.text,
  });

  if (useProxy) {
    const response = await fetch('/api/admin/messages/outbound', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const { message } = parseAdminErrorBody(errorData, 'Failed to send outbound message');
      const errorObj = new Error(message);
      (errorObj as any).status = response.status;
      throw errorObj;
    }
    return;
  }

  const supabase = getSessionClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/messages/outbound`;

  const response = await fetch(url, {
    method: 'POST',
    ...getAdminFetchOptions(session),
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to send outbound message');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }
}

// --- Instructor approval (admin) ---

export interface PendingInstructorItem {
  id: string;
  email: string | null;
  created_at: string;
}

export interface FetchPendingInstructorsResponse {
  ok: true;
  items: PendingInstructorItem[];
}

export async function fetchPendingInstructors(): Promise<FetchPendingInstructorsResponse> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      // Proxy uses server session (cookies via getServerSession); no client token needed
      response = await fetch('/api/admin/instructors/pending', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');
      response = await fetch(`${API_BASE_URL}/admin/instructors/pending`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Network error');
    if (err.message === 'Failed to fetch' || (err as any).name === 'TypeError') {
      const friendly = new Error('Impossibile contattare l\'API. Avvia l\'API (es. pnpm dev:instructor) e ricarica.');
      (friendly as any).status = 0;
      throw friendly;
    }
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, `Errore ${response.status}`);
    let fullMessage = message;
    if (response.status === 502) {
      fullMessage = `${message}. Verifica che l'API sia avviata (es. pnpm dev:instructor).`;
    } else if (response.status === 404) {
      fullMessage = `Endpoint non trovato (404). L'app admin deve chiamare l'API sulla porta 3001: avvia l'API con \`pnpm dev:instructor\` e verifica che in .env dell'admin sia \`NEXT_PUBLIC_API_URL=http://localhost:3001\` (non la porta 3012).`;
    }
    const errorObj = new Error(fullMessage);
    (errorObj as any).status = response.status;
    (errorObj as any).message = fullMessage;
    throw errorObj;
  }

  return response.json();
}

// --- System Health (admin, system_admin only) ---

export interface SystemHealthSnapshot {
  emergency_disabled: boolean;
  ai_global_enabled: boolean;
  ai_whatsapp_enabled: boolean;
  quota: {
    channel: 'whatsapp';
    limit: number | null;
    used_today: number | null;
    percentage: number | null;
    status: 'ok' | 'exceeded' | 'not_configured';
  };
  activity_today: {
    conversations_ai_eligible: number;
    escalations: number;
    drafts_generated: number;
    drafts_sent: number;
  };
}

export interface FetchSystemHealthResponse {
  ok: true;
  snapshot: SystemHealthSnapshot;
}

export async function fetchSystemHealth(): Promise<FetchSystemHealthResponse | null> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch('/api/admin/system-health', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      response = await fetch(`${API_BASE_URL}/admin/system-health`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const data = await response.json();
  return data.ok && data.snapshot ? data : null;
}

export async function approveInstructor(
  instructorId: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: true; instructor: { id: string; email: string | null; approval_status: string; created_at: string } }> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  if (useProxy) {
    // Proxy uses server session (cookies); no client token needed
    response = await fetch(`/api/admin/instructors/${instructorId}/approve`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status }),
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/instructors/${instructorId}/approve`, {
      method: 'POST',
      ...getAdminFetchOptions(session),
      body: JSON.stringify({ status }),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to update instructor approval');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  return response.json();
}

// --- Instructor WhatsApp (admin: list + verify) ---

export interface InstructorWhatsappAccountItem {
  instructor_id: string;
  phone_number: string;
  status: string;
  connected_at: string | null;
  created_at: string;
  full_name: string | null;
}

export interface FetchInstructorWhatsappAccountsResponse {
  ok: true;
  items: InstructorWhatsappAccountItem[];
}

export async function fetchInstructorWhatsappAccounts(
  status?: 'pending' | 'verified'
): Promise<FetchInstructorWhatsappAccountsResponse> {
  const useProxy = typeof window !== 'undefined';
  const qs = status ? `?status=${status}` : '';
  let response: Response;

  if (useProxy) {
    response = await fetch(`/api/admin/instructor/whatsapp/list${qs}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/instructor/whatsapp/list${qs}`, {
      method: 'GET',
      ...getAdminFetchOptions(session),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to load WhatsApp accounts');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  return response.json();
}

export async function verifyInstructorWhatsapp(
  instructorId: string
): Promise<{ ok: true; account: { instructor_id: string; phone_number: string; status: string } }> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  if (useProxy) {
    response = await fetch('/api/admin/instructor/whatsapp/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ instructor_id: instructorId }),
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/instructor/whatsapp/verify`, {
      method: 'POST',
      ...getAdminFetchOptions(session),
      body: JSON.stringify({ instructor_id: instructorId }),
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to verify WhatsApp account');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  return response.json();
}

// --- AI Draft Approval ---
// MVP v1: Admin approves AI-generated draft and sends it via WhatsApp
// Backend already exists: POST /admin/conversations/:conversationId/send-ai-draft

export async function sendAIDraftApproval(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/conversations/${conversationId}/send-ai-draft`;

  const response = await fetch(url, {
    method: 'POST',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to approve AI draft');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }
}

/**
 * Sets the AI mode for a conversation (admin-only).
 * 
 * WHAT IT DOES:
 * - Sends POST /admin/conversations/:id/ai-mode
 * - Updates ai_enabled flag in conversations table
 * 
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No outbound messages
 * - No automation
 * - No side effects beyond DB update
 * 
 * @param conversationId - Conversation ID
 * @param enabled - AI enabled state (true = ON, false = OFF)
 * @throws Error if request fails
 */
export async function setConversationAIMode(
  conversationId: string,
  enabled: boolean
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/conversations/${conversationId}/ai-mode`;

  const response = await fetch(url, {
    method: 'POST',
    ...getAdminFetchOptions(session),
    body: JSON.stringify({
      enabled,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to update AI mode');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }
}

/**
 * Fetches conversation details by ID (admin-only).
 * 
 * WHAT IT DOES:
 * - Fetches conversation details from GET /admin/human-inbox/:conversationId
 * - Returns conversation data including ai_enabled flag
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * 
 * @param conversationId - UUID of the conversation
 * @returns Conversation details including ai_enabled
 */
export interface ConversationDetail {
  conversation_id: string;
  channel: string;
  status: string;
  // ai_enabled not in schema
  created_at: string;
}

export async function fetchConversationById(
  conversationId: string
): Promise<ConversationDetail> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/human-inbox/${conversationId}`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch conversation');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data: FetchHumanInboxDetailResponse = await response.json();
  
  // Extract conversation details from human inbox detail response
  // ai_enabled not in schema, hardcoded false
  return {
    conversation_id: data.detail.conversation_id,
    channel: data.detail.channel,
    status: data.detail.status,
    created_at: data.detail.created_at,
  };
}

export interface AdminBookingSummary {
  id: string;
  instructor_id: string;
  customer_name: string | null;
  phone: string | null;
  status: string;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  calendar_event_id: string | null;
  payment_intent_id: string | null;
  created_at: string;
}

export interface AdminBookingDetail extends AdminBookingSummary {
  conversation_id: string | null;
}

export interface BookingAuditEntry {
  id: string;
  booking_id: string;
  previous_state: string;
  new_state: string;
  actor: 'system' | 'human';
  created_at: string;
}

export interface FetchAdminBookingDetailResponse {
  ok: true;
  data: {
    booking: AdminBookingDetail;
    auditTrail: BookingAuditEntry[];
  };
}

/**
 * Fetches admin booking detail from the Fastify API.
 * 
 * WHAT IT DOES:
 * - Fetches booking detail from GET /admin/bookings/:id
 * - Returns booking data with audit trail
 * - READ-ONLY operation
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * 
 * @param bookingId - UUID of the booking
 * @returns Booking detail with audit trail
 */
export async function fetchAdminBookingDetail(
  bookingId: string
): Promise<FetchAdminBookingDetailResponse['data']> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');
      response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error('Network error');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch booking detail');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  const data: FetchAdminBookingDetailResponse = await response.json();
  return data.data;
}

export interface FetchAdminBookingsResponse {
  ok: true;
  data: {
    items: AdminBookingSummary[];
    limit: number;
    offset: number;
    total?: number;
  };
}

export async function fetchAdminBookings(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  instructorId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<FetchAdminBookingsResponse['data']> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  const qp = new URLSearchParams();
  if (params?.limit != null) qp.set('limit', String(params.limit));
  if (params?.offset != null) qp.set('offset', String(params.offset));
  if (params?.status) qp.set('status', params.status);
  if (params?.instructorId) qp.set('instructorId', params.instructorId);
  if (params?.dateFrom) qp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qp.set('dateTo', params.dateTo);
  const qs = qp.toString();

  try {
    if (useProxy) {
      response = await fetch(`/api/admin/bookings${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');
      response = await fetch(`${API_BASE_URL}/admin/bookings${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Network error');
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch bookings');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    throw errorObj;
  }

  const json: FetchAdminBookingsResponse = await response.json();
  return json.data;
}

/** Conversation list item from GET /admin/conversations. */
export interface ConversationSummary {
  id: string;
  customer_phone?: string | null;
  customer_name?: string | null;
  instructor_id?: string;
  status?: string;
  created_at?: string;
}

/** GET /admin/conversations — list conversations (admin). */
export async function fetchAdminConversations(params?: {
  limit?: number;
  offset?: number;
  instructorId?: string;
  status?: string;
}): Promise<{ items: any[]; limit: number; offset: number }> {
  const useProxy = typeof window !== 'undefined';
  const qp = new URLSearchParams();
  if (params?.limit != null) qp.set('limit', String(params.limit));
  if (params?.offset != null) qp.set('offset', String(params.offset));
  if (params?.instructorId) qp.set('instructorId', params.instructorId);
  if (params?.status) qp.set('status', params.status);
  const qs = qp.toString();
  let response: Response;
  if (useProxy) {
    response = await fetch(`/api/admin/conversations${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/conversations${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...getAdminFetchOptions(session),
    });
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch conversations');
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }
  const json = await response.json();
  const data = json?.data ?? { items: [], limit: params?.limit ?? 50, offset: params?.offset ?? 0 };
  return { items: data.items ?? [], limit: data.limit ?? 50, offset: data.offset ?? 0 };
}

/** POST /admin/bookings/:id/override-status — admin override booking status. */
export async function overrideAdminBookingStatus(
  bookingId: string,
  body: { newStatus: string; reason?: string }
): Promise<void> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;
  if (useProxy) {
    response = await fetch(`/api/admin/bookings/${bookingId}/override-status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/bookings/${bookingId}/override-status`, {
      method: 'POST',
      ...getAdminFetchOptions(session),
      body: JSON.stringify(body),
    });
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to override booking status');
    const err = new Error(message);
    (err as any).status = response.status;
    throw err;
  }
}

/** GET /admin/system-degradation — system degradation signals. */
export async function fetchSystemDegradationSignals(): Promise<{ ok: boolean; snapshot: any }> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;
  if (useProxy) {
    response = await fetch('/api/admin/system-degradation', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/system-degradation`, {
      method: 'GET',
      ...getAdminFetchOptions(session),
    });
  }
  if (!response.ok) throw new Error('Failed to fetch system degradation');
  return response.json();
}

/** GET /admin/ai-quota — AI quota status. */
export async function fetchAIQuota(params?: { channel?: string; period?: string }): Promise<{ ok: boolean; quota: any }> {
  const qp = new URLSearchParams();
  if (params?.channel) qp.set('channel', params.channel);
  if (params?.period) qp.set('period', params.period);
  const qs = qp.toString();
  const useProxy = typeof window !== 'undefined';
  let response: Response;
  if (useProxy) {
    response = await fetch(`/api/admin/ai-quota${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } else {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    response = await fetch(`${API_BASE_URL}/admin/ai-quota${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...getAdminFetchOptions(session),
    });
  }
  if (!response.ok) throw new Error('Failed to fetch AI quota');
  return response.json();
}

/** Channel identity mapping row (for table display). */
export interface ChannelIdentityMapping {
  id?: string;
  channel?: string;
  external_identity?: string;
  conversation_id?: string;
  first_seen_at?: string;
  last_seen_at?: string;
}

/** Channel identity mappings — stub until backend route exists. */
export async function fetchChannelIdentityMappings(): Promise<{ items: ChannelIdentityMapping[] }> {
  return Promise.resolve({ items: [] });
}

/** Inbound message row (for table display). */
export interface InboundMessage {
  id?: string;
  channel?: string;
  conversation_id?: string;
  external_message_id?: string;
  sender_identity?: string;
  message_type?: string;
  message_text?: string | null;
  received_at?: string;
  created_at?: string;
}

/** Inbound messages — stub until backend route exists. */
export async function fetchInboundMessages(_params?: { conversationId?: string; limit?: number }): Promise<{ items: InboundMessage[] }> {
  return Promise.resolve({ items: [] });
}

/** WhatsApp inbound raw row (for table display). */
export interface WhatsappInboundRaw {
  id?: string;
  received_at?: string;
  sender_id?: string | null;
  message_id?: string | null;
  signature_valid?: boolean;
}

/** WhatsApp inbound raw — stub until backend route exists. */
export async function fetchWhatsappInboundRaw(): Promise<{ items: WhatsappInboundRaw[] }> {
  return Promise.resolve({ items: [] });
}

/** Admin message summary (for messages table). */
export interface AdminMessageSummary {
  id: string;
  created_at?: string;
  role?: string;
  direction?: string;
  instructor_id?: string;
  content?: string | null;
}

/** System degradation signals snapshot (from GET /admin/system-degradation). */
export interface SystemDegradationSignals {
  webhook: {
    inbound_received_24h: number;
    inbound_errors_24h: number;
    last_error_at?: string | null;
  };
  ai_drafts: {
    drafts_generated_24h: number;
    draft_errors_24h: number;
  };
  quota: {
    quota_exceeded_24h: number;
    last_quota_block_at?: string | null;
  };
  escalation: {
    escalations_24h: number;
  };
}

// ── Comprehensive Dashboard ─────────────────────────────────────────────────

export interface ComprehensiveDashboardData {
  system: {
    ai_global_enabled: boolean;
    ai_whatsapp_enabled: boolean;
    emergency_disabled: boolean;
    pilot_instructor_count: number;
    pilot_max?: number;
    quota: {
      channel: 'whatsapp';
      limit: number | null;
      used_today: number | null;
      percentage: number | null;
      status: 'ok' | 'exceeded' | 'not_configured';
    };
  };
  today: {
    conversations_new: number;
    conversations_open: number;
    messages_inbound: number;
    messages_outbound: number;
    bookings_created: number;
    bookings_cancelled: number;
    customer_notes_added: number;
    human_overrides: number;
  };
  yesterday?: {
    conversations_open: number;
    escalations: number;
    draft_approval_rate: number | null;
    draft_errors: number;
    bookings_created: number;
    instructors_online: number;
  };
  ai: {
    drafts_generated_today: number;
    drafts_sent_today: number;
    drafts_pending: number;
    draft_approval_rate: number | null;
    draft_errors_today: number;
    escalations_today: number;
    conversations_ai_eligible_today: number;
    avg_latency_ms_7d: number;
    total_cost_cents_7d: number;
    total_calls_7d: number;
    error_rate_7d: number;
  };
  instructors: {
    total_profiles: number;
    onboarded_profiles: number;
    active_7d: number;
    pilot_count: number;
    total_bookings: number;
    active_bookings: number;
    bookings_by_status: Array<{ status: string; count: number }>;
    bookings_created_7d: number;
    customer_notes_7d: number;
  };
  presence?: {
    online_now: number;
    last_30m: number;
    offline: number;
  };
  user_access?: {
    logins_today: number;
    unique_users_today: number;
    active_sessions: number;
    logouts_today: number;
  };
  health_24h: {
    webhook_inbound: number;
    webhook_errors: number;
    webhook_last_error_at: string | null;
    ai_draft_errors: number;
    quota_exceeded: number;
    escalations: number;
  };
  recent_events: Array<{
    id: string;
    created_at: string;
    actor_type: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    severity: string;
  }>;
  ai_adoption?: {
    toggles_on_today: number;
    toggles_off_today: number;
    toggles_7d_total: number;
    toggles_grouped_by_instructor_7d: Array<{ instructor_id: string; toggles: number }>;
    recent_ai_behavior_events: Array<{
      created_at: string;
      instructor_id: string;
      action: string;
      new_state: boolean;
    }>;
  };
  generated_at: string;
}

export async function fetchComprehensiveDashboard(): Promise<ComprehensiveDashboardData | null> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch('/api/admin/dashboard-comprehensive', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      response = await fetch(`${API_BASE_URL}/admin/dashboard-comprehensive`, {
        method: 'GET',
        ...getAdminFetchOptions(session),
      });
    }
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const json = await response.json();
  return json.ok && json.data ? json.data : null;
}

// ── Report Archive ──────────────────────────────────────────────────────

export type ReportArchiveType = 'daily' | 'weekly' | 'investor';

export interface ReportArchiveItem {
  name: string;
  path: string;
  created_at: string | null;
  size: number | null;
  download_url: string | null;
}

export interface ReportArchiveResponse {
  type: ReportArchiveType;
  items: ReportArchiveItem[];
  count: number;
  limit: number;
}

/**
 * Fetches the list of archived reports from Supabase Storage.
 */
export async function fetchReportArchive(
  type: ReportArchiveType,
  limit: number = 20,
): Promise<ReportArchiveResponse | null> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch(`/api/admin/reports/archive?type=${type}&limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      response = await fetch(
        `${API_BASE_URL}/admin/reports/archive?type=${type}&limit=${limit}`,
        { method: 'GET', ...getAdminFetchOptions(session) },
      );
    }
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const json = await response.json();
  return json.ok && json.data ? json.data : null;
}

// ── Feature flags (Control Room toggles) ───────────────────────────────────

export type FeatureFlagKey = 'ai_enabled' | 'ai_whatsapp_enabled';

export interface UpdateFeatureFlagResult {
  key: string;
  enabled: boolean;
}

/**
 * Sets a feature flag (AI Global = ai_enabled, AI WhatsApp = ai_whatsapp_enabled).
 * Requires admin session. Call after success to refresh dashboard data.
 */
export async function updateFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean
): Promise<UpdateFeatureFlagResult | null> {
  const useProxy = typeof window !== 'undefined';
  let response: Response;

  try {
    if (useProxy) {
      response = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
    } else {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      response = await fetch(`${API_BASE_URL}/admin/feature-flags`, {
        method: 'PATCH',
        ...getAdminFetchOptions(session),
        body: JSON.stringify({ key, enabled }),
      });
    }
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const json = await response.json();
  return json.ok && json.data ? json.data : null;
}
