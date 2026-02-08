import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
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
  // PILOT MODE: ai_enabled removed (column not in schema)
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/bookings/${bookingId}/lifecycle`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

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
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/messages/outbound`;

  const response = await fetch(url, {
    method: 'POST',
    ...getAdminFetchOptions(session),
    body: JSON.stringify({
      conversation_id: params.conversationId,
      text: params.text,
    }),
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
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/instructors/pending`;
  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const { message } = parseAdminErrorBody(errorData, 'Failed to fetch pending instructors');
    const errorObj = new Error(message);
    (errorObj as any).status = response.status;
    (errorObj as any).message = message;
    throw errorObj;
  }

  return response.json();
}

export async function approveInstructor(
  instructorId: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: true; instructor: { id: string; email: string | null; approval_status: string; created_at: string } }> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/instructors/${instructorId}/approve`;
  const response = await fetch(url, {
    method: 'POST',
    ...getAdminFetchOptions(session),
    body: JSON.stringify({ status }),
  });

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
  // PILOT MODE: ai_enabled removed (column not in schema)
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
  // PILOT MODE: ai_enabled hardcoded to false (column not in schema)
  return {
    conversation_id: data.detail.conversation_id,
    channel: data.detail.channel,
    status: data.detail.status,
    created_at: data.detail.created_at,
  };
}

export interface AdminBookingDetail {
  id: string;
  instructor_id: number;
  customer_name: string;
  phone: string;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  calendar_event_id: string | null;
  payment_intent_id: string | null;
  conversation_id: string | null;
  created_at: string;
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
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No session found');
  }

  const url = `${API_BASE_URL}/admin/bookings/${bookingId}`;

  const response = await fetch(url, {
    method: 'GET',
    ...getAdminFetchOptions(session),
  });

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
