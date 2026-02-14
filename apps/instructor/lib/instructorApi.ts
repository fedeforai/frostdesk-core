import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export type LanguageCode = 'en' | 'it' | 'fr' | 'de' | 'es' | 'pt' | 'nl' | 'sv' | 'no' | 'da' | 'pl' | 'ru' | 'ar' | 'zh';

export type TargetAudience = 'families' | 'kids' | 'beginners' | 'advanced' | 'off_piste' | 'vip';

export interface MarketingFields {
  short_bio?: string | null;
  extended_bio?: string | null;
  teaching_philosophy?: string | null;
  target_audience?: TargetAudience[] | null;
  usp_tags?: string[] | null;
  /** Base resort + altre località dove il maestro può fare lezioni */
  resorts?: { base?: string; operating?: string[] } | null;
}

export interface OperationalFields {
  max_students_private?: number | null;
  max_students_group?: number | null;
  min_booking_duration_minutes?: number | null;
  same_day_booking_allowed?: boolean | null;
  advance_booking_hours?: number | null;
  travel_buffer_minutes?: number | null;
}

export interface InstructorProfile {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: LanguageCode | string;
  contact_email: string;
  languages?: LanguageCode[];
  timezone?: string | null;
  display_name?: string | null;
  slug?: string | null;
  marketing_fields?: MarketingFields;
  operational_fields?: OperationalFields;
}

export type UpdateInstructorProfileParams = {
  full_name?: string;
  base_resort?: string;
  working_language?: string;
  contact_email?: string;
  languages?: LanguageCode[];
  timezone?: string | null;
  display_name?: string | null;
  slug?: string | null;
  marketing_fields?: Partial<MarketingFields>;
  operational_fields?: Partial<OperationalFields>;
};

/**
 * Fetches instructor profile via same-origin proxy to Node API (GET /instructor/profile).
 * @returns Instructor profile or null if not found. Response includes legacy fields (base_resort, working_language, contact_email).
 */
export async function fetchInstructorProfile(): Promise<InstructorProfile | null> {
  const response = await fetch('/api/instructor/profile', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error((errorData as { message?: string }).message || '');
    (errorObj as { status?: number }).status = response.status;
    throw errorObj;
  }

  const data = await response.json() as { ok?: boolean; profile?: InstructorProfile };
  if (!data.ok || !data.profile) return null;
  return data.profile;
}

/**
 * Updates instructor profile via same-origin proxy (PATCH /instructor/profile).
 * @param params - Profile data to update (identity, marketing_fields, operational_fields; server shallow-merges JSONB)
 * @returns Updated instructor profile
 */
export async function updateInstructorProfile(
  params: UpdateInstructorProfileParams
): Promise<InstructorProfile> {
  const response = await fetch('/api/instructor/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error((errorData as { message?: string }).message || '');
    (errorObj as { status?: number }).status = response.status;
    throw errorObj;
  }

  const data = await response.json() as { ok?: boolean; profile?: InstructorProfile };
  if (!data.ok || !data.profile) throw new Error('Invalid response');
  return data.profile;
}

export interface DashboardBooking {
  id: string;
  conversation_id: string;
  instructor_id: number;
  date: string;
  time: string;
  duration: number;
  status: string;
  created_at: string;
}

export interface InstructorDashboardData {
  instructor: { name: string; languages: string; resort_base: string; } | null;
  services: { id: string; service_name: string; duration_minutes: number; price_amount: number; price_currency: string; is_active: boolean; }[];
  meetingPoints: { id: string; name: string; address: string | null; is_default: boolean; }[];
  policies: { id: string; rule_type: string; rule_title: string; version: number; is_active: boolean; }[];
  availability: { id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean; }[];
  calendar: { connected: boolean; calendarId: string | null; lastSyncAt: string | null; };
  upcomingBookings: { id: string; start_time: string; end_time: string; customer_name: string | null; status: string; }[];
}

/**
 * Fetches instructor dashboard data from the Supabase Edge Function.
 * 
 * @returns Dashboard data
 */
export async function fetchInstructorDashboard(): Promise<InstructorDashboardData> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // Construct Supabase Edge Function URL
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/dashboard`;

  const response = await fetch(functionUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error('FAILED_TO_LOAD_DASHBOARD');
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Fetches instructor dashboard data via same-origin proxy (GET /api/instructor/dashboard).
 * Use this in the browser so calendar.connected and other dashboard state are live from the API.
 */
export async function fetchInstructorDashboardViaApi(): Promise<InstructorDashboardData> {
  const baseUrl = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/([^:]\/)\/+/g, '$1');
  const url = `${baseUrl}/instructor/dashboard`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const err = new Error('FAILED_TO_LOAD_DASHBOARD');
    (err as { status?: number }).status = response.status;
    throw err;
  }
  return response.json();
}

export interface InstructorService {
  id: string;
  instructor_id: string;
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  is_active: boolean;
  notes: string | null;
}

export interface CreateInstructorServiceParams {
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
}

export interface UpdateInstructorServiceParams {
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
  is_active: boolean;
}

/**
 * Fetches instructor services via API proxy (cookie auth in browser).
 * @returns Array of instructor services
 */
export async function fetchInstructorServices(): Promise<InstructorService[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/services`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to load services');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = (await response.json()) as { ok?: boolean; services?: InstructorService[] };
  return data?.ok && Array.isArray(data.services) ? data.services : [];
}

/**
 * Creates a new instructor service via API proxy.
 * @param params - Service data
 * @returns Created instructor service
 */
export async function createInstructorService(
  params: CreateInstructorServiceParams
): Promise<InstructorService> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/services`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(params),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to create service');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = (await response.json()) as { ok?: boolean; service?: InstructorService };
  if (data?.ok && data.service) return data.service;
  throw new Error('Invalid response from API');
}



/**
 * Updates an instructor service via API proxy.
 * @param serviceId - Service ID
 * @param params - Service data to update
 * @returns Updated instructor service
 */
export async function updateInstructorService(
  serviceId: string,
  params: UpdateInstructorServiceParams
): Promise<InstructorService> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/services/${encodeURIComponent(serviceId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(params),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to update service');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = (await response.json()) as { ok?: boolean; service?: InstructorService };
  if (data?.ok && data.service) return data.service;
  throw new Error('Invalid response from API');
}

export interface AvailabilityCalendarConflict {
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

export interface FetchAvailabilityConflictsResponse {
  items: AvailabilityCalendarConflict[];
}

/**
 * Fetches conflicts between availability windows and calendar events via API proxy.
 * @returns Array of conflicts
 */
export async function fetchAvailabilityConflicts(): Promise<AvailabilityCalendarConflict[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/availability/conflicts`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    credentials: 'same-origin',
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' })) as { message?: string };
    const errorObj = new Error(errorData?.message || 'Failed to load conflicts');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = (await response.json()) as { ok?: boolean; items?: AvailabilityCalendarConflict[] };
  return data?.ok && Array.isArray(data.items) ? data.items : [];
}

// ============================
// BOOKINGS — HUMAN TRIGGERED
// ============================

export interface FetchInstructorBookingsResponse {
  items: any[];
}

/**
 * Fetches all bookings for the instructor via same-origin proxy (GET /api/instructor/bookings).
 * @returns Bookings list
 */
export async function fetchInstructorBookings(): Promise<FetchInstructorBookingsResponse> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg =
      errorData?.message ??
      (typeof errorData?.error === 'string' ? errorData.error : null) ??
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare le prenotazioni. Riprova.');
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Fetches a single booking by ID via same-origin proxy (GET /api/instructor/bookings/:id).
 * @param id - Booking ID
 * @returns Booking data
 */
export async function fetchInstructorBooking(id: string): Promise<any> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'FAILED_TO_LOAD_BOOKING');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Creates a new booking (human-triggered) via same-origin proxy (POST /api/instructor/bookings).
 * Requires customerId (existing customer). Create a customer first if needed.
 * @param payload - Booking data
 * @returns Created booking ID
 */
export async function createInstructorBooking(payload: {
  customerId: string;
  startTime: string;
  endTime: string;
  serviceId?: string | null;
  meetingPointId?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings`;
  const body: Record<string, unknown> = {
    customer_id: payload.customerId,
    start_time: payload.startTime,
    end_time: payload.endTime,
    notes: payload.notes ?? undefined,
    service_id: payload.serviceId ?? undefined,
    meeting_point_id: payload.meetingPointId ?? undefined,
  };
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg = errorData?.message || (typeof errorData?.error === 'string' ? errorData.error : null) || 'Failed to create booking';
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/** PATCH booking details. Customer cannot be changed (set at creation). Ownership enforced by API. */
export async function updateInstructorBooking(
  id: string,
  payload: {
    startTime?: string;
    endTime?: string;
    serviceId?: string | null;
    meetingPointId?: string | null;
    notes?: string | null;
  }
): Promise<any> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(id)}`;
  const body: Record<string, unknown> = {};
  if (payload.startTime !== undefined) body.start_time = payload.startTime;
  if (payload.endTime !== undefined) body.end_time = payload.endTime;
  if (payload.serviceId !== undefined) body.service_id = payload.serviceId;
  if (payload.meetingPointId !== undefined) body.meeting_point_id = payload.meetingPointId;
  if (payload.notes !== undefined) body.notes = payload.notes;

  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to update booking');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Updates booking status (PATCH /api/instructor/bookings/:id/status). Ownership enforced by API.
 */
export async function updateInstructorBookingStatus(
  id: string,
  status: string
): Promise<{ ok: true; booking: any }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(id)}/status`;
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status }),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to update status');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Deletes a booking (soft: sets status to cancelled). DELETE /api/instructor/bookings/:id.
 */
export async function deleteInstructorBooking(id: string): Promise<{ ok: true; deleted: boolean; booking: any }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to delete booking');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Cancels a booking (confirmed | modified → cancelled). POST /api/instructor/bookings/:id/cancel.
 * Records booking_audit. Accepts loose response shape: { ok, booking } | { booking } | { ok }.
 */
export async function cancelInstructorBooking(id: string): Promise<{ ok?: boolean; booking?: any }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(id)}/cancel`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('NOT_AUTHORIZED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const text = await response.text();
  let data: { ok?: boolean; booking?: any; message?: string } = {};
  try {
    if (text.trim()) data = JSON.parse(text) as typeof data;
  } catch {
    /* non-JSON body: keep data {} */
  }
  if (!response.ok) {
    const err = new Error((data as any)?.message || data?.message || 'Failed to cancel booking');
    (err as any).status = response.status;
    throw err;
  }
  if (data && data.ok === false) {
    const err = new Error((data as any)?.message || data?.message || 'Cancel failed');
    (err as any).status = response.status;
    throw err;
  }
  return data;
}

/** Event shape from GET /instructor/bookings/:id/timeline (booking_audit). type preserved from API when present. */
export interface BookingTimelineEventApi {
  timestamp: string;
  type: string;
  from: string;
  to: string;
  actor_type: 'human' | 'system';
  reason?: string | null;
}

export interface BookingTimelineResponse {
  booking_id: string;
  timeline: BookingTimelineEventApi[];
}

/** Normalizes a raw timeline event to BookingTimelineEventApi. Preserves raw.type when present for future event kinds. */
function normalizeTimelineEvent(raw: any): BookingTimelineEventApi {
  const ts = raw?.timestamp ?? raw?.created_at ?? '';
  const from = typeof raw?.from === 'string' ? raw.from : (raw?.previous_state ?? '');
  const to = typeof raw?.to === 'string' ? raw.to : (raw?.new_state ?? '');
  const actor = raw?.actor_type ?? raw?.actor ?? 'system';
  const type = raw?.type && typeof raw.type === 'string' ? raw.type : 'booking_state_change';
  return {
    timestamp: typeof ts === 'string' ? ts : (ts != null ? String(ts) : ''),
    type,
    from: typeof from === 'string' ? from : '',
    to: typeof to === 'string' ? to : '',
    actor_type: actor === 'human' ? 'human' : 'system',
  };
}

/**
 * Fetches booking decision timeline (audit events). GET /instructor/bookings/:id/timeline.
 * Accepts response shapes: { timeline }, { items }, { events }, or a top-level array.
 * Normalizes each event to { timestamp, type, from, to, actor_type }.
 */
export async function fetchBookingTimeline(bookingId: string): Promise<BookingTimelineResponse> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/bookings/${encodeURIComponent(bookingId)}/timeline`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('NOT_AUTHORIZED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to load timeline');
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json().catch(() => ({})) as any;
  const rawList = Array.isArray(data)
    ? data
    : Array.isArray(data?.timeline)
      ? data.timeline
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : [];
  const timeline = rawList.map((item: any) => normalizeTimelineEvent(item));
  return {
    booking_id: data?.booking_id ?? bookingId,
    timeline,
  };
}

// ========== Customers ==========

/** Customer list item; keys match backend snake_case. */
export type Customer = {
  id: string;
  phone_number: string | null;
  display_name: string | null;
  last_seen_at: string | null;
  first_seen_at: string | null;
  source?: string | null;
};

/** List item for customer selector; backend snake_case. */
export type InstructorCustomerListItem = {
  id: string;
  phone_number: string | null;
  display_name: string | null;
  last_seen_at: string | null;
  first_seen_at: string | null;
  notes_count?: number | null;
  value_score?: number | null;
  bookings_count?: number | null;
};

export type FetchCustomersResponse = { items: InstructorCustomerListItem[] };

export interface InstructorCustomerItem extends Customer {
  instructor_id: string;
  first_seen_at: string;
  last_seen_at: string;
  source: string;
  created_at: string;
  updated_at: string;
  notes_count: number;
  bookings_count: number;
  value_score: number;
}

export interface FetchInstructorCustomersResponse {
  items: InstructorCustomerListItem[];
}

/**
 * GET /instructor/customers?search=...&limit=...&offset=...
 * Returns { items }; items always array. Message precedence: json.message > json.error > default.
 */
export async function fetchInstructorCustomers(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<FetchCustomersResponse> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/customers${suffix}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg =
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare i clienti. Verifica che l\'API sia avviata e riprova.');
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  return { items: Array.isArray(data?.items) ? data.items : [] };
}

export interface InstructorCustomerDetailResponse {
  customer: InstructorCustomerItem & { updated_at: string };
  notes: Array<{ id: string; customer_id: string; instructor_id: string; content: string; created_at: string }>;
  stats: { notes_count: number; bookings_count: number; value_score: number };
}

export async function fetchInstructorCustomer(id: string): Promise<InstructorCustomerDetailResponse> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/customers/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to load customer');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/** Alias for fetchInstructorCustomer. Fetches customer detail + notes (latest 50) via /api/instructor/customers/:id. */
export const fetchInstructorCustomerDetail = fetchInstructorCustomer;

export async function createInstructorCustomerNote(
  customerId: string,
  payload: { content: string }
): Promise<{ ok: boolean; id: string; note: { id: string; content: string; created_at: string } }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/customers/${encodeURIComponent(customerId)}/notes`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const err = new Error(errorData?.message || 'Failed to add note');
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/** Add a note to a customer. Uses POST /api/instructor/customers/:id/notes. */
export async function addCustomerNote(
  customerId: string,
  content: string
): Promise<{ ok: boolean; id: string; note: { id: string; content: string; created_at: string } }> {
  return createInstructorCustomerNote(customerId, { content });
}

/**
 * POST /instructor/customers.
 * Accepts camelCase (phoneNumber, displayName, source); sends snake_case to backend.
 * Returns { customer, id } as per API.
 */
export async function createInstructorCustomer(payload: {
  phoneNumber: string;
  displayName?: string;
  source?: string;
}): Promise<{ customer: InstructorCustomerItem; id: string }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/customers`;
  const body = {
    phone_number: payload.phoneNumber.trim(),
    display_name: payload.displayName?.trim() || undefined,
    source: payload.source ?? 'manual',
  };
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg = errorData?.message || (typeof errorData?.error === 'string' ? errorData.error : null) || 'Failed to create customer';
    const err = new Error(msg);
    (err as any).status = response.status;
    throw err;
  }
  const data = await response.json();
  return { customer: data.customer ?? data, id: data.id ?? data.customer?.id ?? '' };
}

/**
 * Creates a new instructor meeting point (via API proxy; cookie auth in browser).
 */
export async function createInstructorMeetingPoint(
  params: CreateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/meeting-points`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(params),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const errorObj = new Error(errorData?.message || 'Failed to create meeting point');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  return response.json();
}

export interface InstructorAvailability {
  id: string;
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAvailabilityParams {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface UpdateAvailabilityParams {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface FetchAvailabilityResponse {
  items: InstructorAvailability[];
}

/**
 * Fetches instructor availability via API proxy (cookie auth in browser).
 * @returns Array of instructor availability windows
 */
export async function fetchAvailability(): Promise<InstructorAvailability[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/availability`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg =
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare la disponibilità. Verifica che l\'API sia avviata e riprova.');
    const errorObj = new Error(msg);
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = (await response.json()) as { ok?: boolean; availability?: InstructorAvailability[] };
  return data?.ok && Array.isArray(data.availability) ? data.availability : [];
}

/**
 * Creates a new instructor availability window via API proxy.
 * @param payload - Availability data (dayOfWeek, startTime, endTime, isActive)
 */
export async function createAvailability(
  payload: CreateAvailabilityParams
): Promise<void> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/availability`;
  const body = {
    day_of_week: payload.dayOfWeek,
    start_time: payload.startTime,
    end_time: payload.endTime,
    is_active: payload.isActive,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to create availability');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
}

/**
 * Updates an instructor availability window via API proxy (upsert by day+start+end).
 * @param payload - Availability data (id, dayOfWeek, startTime, endTime, isActive)
 */
export async function updateAvailability(
  payload: UpdateAvailabilityParams
): Promise<void> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/availability`;
  const body = {
    day_of_week: payload.dayOfWeek,
    start_time: payload.startTime,
    end_time: payload.endTime,
    is_active: payload.isActive,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to update availability');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
}

export interface InstructorMeetingPoint {
  id: string;
  instructor_id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  what3words?: string;
  notes: string | null;
  is_default?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInstructorMeetingPointParams {
  name: string;
  description?: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default?: boolean;
  notes?: string | null;
}

export interface UpdateInstructorMeetingPointParams {
  name: string;
  description?: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

/**
 * Updates an instructor meeting point (via API proxy; cookie auth in browser).
 */
export async function updateInstructorMeetingPoint(
  meetingPointId: string,
  params: UpdateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/meeting-points/${encodeURIComponent(meetingPointId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(params),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string };
    const errorObj = new Error(errorData?.message || 'Failed to update meeting point');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  return response.json();
}

/**
 * Fetches instructor meeting points via API proxy (cookie auth in browser).
 * @returns Array of instructor meeting points
 */
export async function fetchInstructorMeetingPoints(): Promise<InstructorMeetingPoint[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/meeting-points`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg =
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare i luoghi di ritrovo. Verifica che l\'API sia avviata e riprova.');
    const errorObj = new Error(msg);
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data?.meetingPoints ?? []);
}

/**
 * Fetches instructor policies from the Supabase Edge Function.
 * 
 * @returns Array of instructor policies
 */
export async function fetchInstructorPolicies(): Promise<InstructorPolicy[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/policies`;

  const response = await fetch(functionUrl, {
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

/**
 * Fetches calendar events via same-origin proxy (GET /api/instructor/calendar/events).
 * Auth: cookie sent to proxy, API validates JWT. Use this in the browser so Calendar page does not redirect to login.
 */
export async function fetchCalendarEvents(
  params?: FetchCalendarEventsParams
): Promise<CalendarEvent[]> {
  const baseUrl = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/([^:]\/)\/+/g, '$1');
  const queryParams = new URLSearchParams();
  if (params?.dateFrom) {
    queryParams.append('dateFrom', params.dateFrom);
  }
  if (params?.dateTo) {
    queryParams.append('dateTo', params.dateTo);
  }
  const url = queryParams.toString()
    ? `${baseUrl}/instructor/calendar/events?${queryParams.toString()}`
    : `${baseUrl}/instructor/calendar/events`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as { message?: string }).message || 'Failed to fetch calendar events');
    (errorObj as { status?: number }).status = response.status;
    throw errorObj;
  }

  const data = (await response.json()) as CalendarEvent[];
  return data;
}

export interface AvailabilityCalendarConflict {
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

export interface FetchAvailabilityConflictsResponse {
  items: AvailabilityCalendarConflict[];
}

export type PolicyType = 
  | 'cancellation'
  | 'no_show'
  | 'weather'
  | 'payment'
  | 'liability'
  | 'meeting_point'
  | 'substitution'
  | 'group_private'
  | 'escalation';

export interface InstructorPolicy {
  id: string;
  instructor_id: string;
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInstructorPolicyParams {
  policy_type: PolicyType;
  title: string;
  content: string;
}

export interface UpdateInstructorPolicyParams {
  policy_type?: PolicyType;
  title: string;
  content: string;
  is_active: boolean;
}

// --- Policy document (structured + freeform, versioned) ---

export interface PolicyStructuredApi {
  cancellation?: {
    notice_hours?: number;
    refund_percent_before?: number;
    refund_percent_after?: number;
    text_override?: string;
  };
  no_show?: {
    charge_percent?: number;
    grace_minutes?: number;
    text_override?: string;
  };
  weather?: {
    reschedule_or_refund?: 'reschedule' | 'refund' | 'either';
    text_override?: string;
  };
  payment?: {
    methods?: string[];
    currency?: string;
    text_override?: string;
  };
  liability?: {
    waiver_required?: boolean;
    text_override?: string;
  };
  meeting_point?: {
    arrival_minutes_before?: number;
    text_override?: string;
  };
}

export interface InstructorPolicyDocumentApi {
  structured: PolicyStructuredApi;
  freeform: string;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

export async function fetchInstructorPolicyDocument(): Promise<InstructorPolicyDocumentApi> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/policies`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    const msg =
      data?.message ||
      (typeof data?.error === 'string' ? data.error : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare le policy. Verifica che l\'API sia avviata e riprova.');
    const err = new Error(msg);
    (err as Error & { status: number }).status = response.status;
    throw err;
  }
  return response.json() as Promise<InstructorPolicyDocumentApi>;
}

export async function patchInstructorPolicyDocumentApi(
  params: { structured?: Partial<PolicyStructuredApi>; freeform?: string },
  version: number
): Promise<InstructorPolicyDocumentApi> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('No session found');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/policies`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': String(version),
      ...authHeaders,
    },
    credentials: 'same-origin',
    body: JSON.stringify(params),
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  if (response.status === 409) {
    const err = new Error('Version mismatch; please reload and try again');
    (err as Error & { status: number }).status = 409;
    throw err;
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    const err = new Error(data?.message ?? 'Failed to update policies');
    (err as Error & { status: number }).status = response.status;
    throw err;
  }
  return response.json() as Promise<InstructorPolicyDocumentApi>;
}

/**
 * Creates a new instructor policy.
 * 
 * @param params - Policy data
 * @returns Created instructor policy
 */
export async function createInstructorPolicy(
  params: CreateInstructorPolicyParams
): Promise<InstructorPolicy> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/policies`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
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

export interface AvailabilityCalendarConflict {
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

/**
 * Updates an instructor policy.
 * 
 * @param policyId - Policy ID
 * @param params - Policy data to update
 * @returns Updated instructor policy
 */
export async function updateInstructorPolicy(
  policyId: string,
  params: UpdateInstructorPolicyParams
): Promise<InstructorPolicy> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/policies/${policyId}`;

  const response = await fetch(functionUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
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

export interface AvailabilityCalendarConflict {
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

export interface FetchAvailabilityConflictsResponse {
  items: AvailabilityCalendarConflict[];
}

// ============================
// AI BOOKING SUGGESTION CONTEXT — READ-ONLY
// ============================

export interface AIBookingSuggestionContext {
  availability: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
  busySlots: {
    start_time: string;
    end_time: string;
  }[];
  recentBookings: {
    start_time: string;
    end_time: string;
  }[];
}

/**
 * Fetches AI booking suggestion context (READ-ONLY) via same-origin proxy to Fastify.
 * Returns availability, busySlots, recentBookings for the logged-in instructor.
 *
 * @returns Context data for AI suggestions
 */
export async function fetchAIBookingSuggestionContext(): Promise<AIBookingSuggestionContext> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/ai-booking-suggestion-context`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const error = new Error('UNAUTHORIZED');
      (error as any).status = 401;
      throw error;
    }
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const isUpstreamDown =
      response.status === 502 ||
      response.status === 503 ||
      (typeof errorData?.error === 'string' && errorData.error === 'UPSTREAM_DOWN');
    const msg =
      errorData?.message ||
      (isUpstreamDown
        ? 'L\'API non è raggiungibile. Verifica che l\'API sia avviata (es. porta 3001) e riprova.'
        : typeof errorData?.error === 'string'
          ? errorData.error
          : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare il contesto per le prenotazioni. Riprova.');
    const error = new Error(msg);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

// ============================
// AI BOOKING CONFIRM — HUMAN CONFIRMED
// ============================

export interface ConfirmAIBookingDraftRequest {
  confirmed: true;
  requestId: string;

  startTime: string;
  endTime: string;

  serviceId?: string | null;
  meetingPointId?: string | null;
  customerName?: string | null;
  notes?: string | null;

  draftPayload: unknown;
}

export async function confirmAIBookingDraft(
  payload: ConfirmAIBookingDraftRequest
): Promise<{ bookingId: string }> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/ai-booking-confirm`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error('FAILED_TO_CONFIRM_AI_DRAFT');
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Deletes an instructor availability window.
 * 
 * @param availabilityId - Availability ID
 */
export async function deleteInstructorAvailability(
  availabilityId: string
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/availability/${availabilityId}`;

  const response = await fetch(functionUrl, {
    method: 'DELETE',
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
}

/**
 * Deactivates an instructor availability window via API proxy (toggle is_active).
 * @param id - Availability ID
 */
export async function deactivateAvailability(id: string): Promise<void> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const error = new Error('No session found');
    (error as any).status = 401;
    throw error;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/availability/${encodeURIComponent(id)}/toggle`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });
  if (response.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (response.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (response.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }));
    const errorObj = new Error((errorData as any).message || 'Failed to deactivate availability');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
}

export interface InstructorCalendarConnection {
  id: string;
  provider: string;
  calendar_id: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectCalendarParams {
  auth_code: string;
  calendar_id: string;
}

/**
 * Fetches current calendar connection via proxy (cookie auth). Use for Calendar page.
 */
export async function fetchCalendarConnection(): Promise<InstructorCalendarConnection | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/instructor/calendar/connection`;
  const opts: RequestInit = {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  };
  if (baseUrl !== '/api') {
    const auth = await getAuthHeadersForApi();
    if (!auth) return null;
    opts.headers = { ...(opts.headers as Record<string, string>), ...auth };
  }
  const response = await fetch(url, opts);
  if (response.status === 404 || !response.ok) return null;
  const data = await response.json();
  if (!data?.ok || !data.id || data.status === 'disconnected') return null;
  return {
    id: data.id,
    provider: data.provider ?? 'google',
    calendar_id: data.calendar_id ?? '',
    expires_at: null,
    created_at: '',
    updated_at: data.last_sync_at ?? '',
  };
}

export interface CalendarEvent {
  id: string;
  instructor_id: string;
  provider: string;
  external_event_id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  is_all_day: boolean;
  created_at: string;
}

export interface FetchCalendarEventsParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface SyncCalendarResult {
  success: boolean;
  eventsCount: number;
}

/**
 * Connects a Google Calendar for the instructor.
 * Uses same-origin proxy so auth is from cookie (no getSession in browser).
 */
export async function connectCalendar(
  params: ConnectCalendarParams
): Promise<InstructorCalendarConnection> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/instructor/calendar/connect/google`;
  const opts: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'connected', calendar_id: params.calendar_id }),
  };
  if (baseUrl !== '/api') {
    const auth = await getAuthHeadersForApi();
    if (!auth) {
      const err = new Error('No session found');
      (err as any).status = 401;
      throw err;
    }
    opts.headers = { ...(opts.headers as Record<string, string>), ...auth };
  }
  const response = await fetch(url, opts);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorObj = new Error((errorData as { message?: string }).message || 'Failed to connect calendar');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = await response.json();
  return {
    id: data.connection_id ?? data.id ?? '',
    provider: data.provider ?? 'google',
    calendar_id: params.calendar_id,
    expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Disconnects the calendar for the instructor.
 * Uses same-origin proxy so auth is from cookie (no getSession in browser).
 */
export async function disconnectCalendar(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/instructor/calendar/disconnect`;
  const opts: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (baseUrl !== '/api') {
    const auth = await getAuthHeadersForApi();
    if (!auth) {
      const err = new Error('No session found');
      (err as any).status = 401;
      throw err;
    }
    opts.headers = { ...(opts.headers as Record<string, string>), ...auth };
  }
  const response = await fetch(url, opts);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorObj = new Error((errorData as { message?: string }).message || 'Failed to disconnect');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
}

/**
 * Manually syncs calendar events from Google Calendar.
 * Uses same-origin proxy so auth is from cookie (no getSession in browser).
 */
export async function syncCalendar(): Promise<SyncCalendarResult> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/instructor/calendar/sync/google`;
  const opts: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  };
  if (baseUrl !== '/api') {
    const auth = await getAuthHeadersForApi();
    if (!auth) {
      const err = new Error('No session found');
      (err as any).status = 401;
      throw err;
    }
    opts.headers = { ...(opts.headers as Record<string, string>), ...auth };
  }
  const response = await fetch(url, opts);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorObj = new Error((errorData as { message?: string }).message || 'Failed to sync calendar');
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  const data = await response.json();
  return {
    success: data.ok === true,
    eventsCount: data.synced_events ?? 0,
  };
}

export interface AvailabilityCalendarConflict {
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

export interface FetchAvailabilityConflictsResponse {
  items: AvailabilityCalendarConflict[];
}

// ============================
// BOOKING AUDIT LOGS — READ-ONLY
// ============================

export interface BookingAuditLogRow {
  id: string;
  instructor_id: string;
  request_id: string;
  booking_id: string | null;
  action: string;
  draft_payload: any | null;
  created_at: string;
}

/**
 * Fetches booking audit logs for the instructor.
 * 
 * @returns Array of booking audit log rows
 */
export async function fetchInstructorBookingAuditLogs(): Promise<BookingAuditLogRow[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const error = new Error('UNAUTHORIZED');
    (error as any).status = 401;
    throw error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/booking-audit-logs`;

  const response = await fetch(functionUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const error = new Error('UNAUTHORIZED');
      (error as any).status = 401;
      throw error;
    }
    const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string };
    const msg =
      errorData?.message ||
      (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
      (response.status === 502 || response.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : response.status === 404
          ? 'Endpoint non trovato.'
          : response.status === 500
            ? 'Errore del server. Riprova.'
            : 'Impossibile caricare i log di audit. Riprova.');
    const error = new Error(msg);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export interface BookingLifecycleReadModel {
  booking: any | null;
  auditLog: any[];
}

export async function fetchBookingLifecycleById(
  bookingId: string
): Promise<BookingLifecycleReadModel> {
  const supabase = getSupabaseClient();
  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }

  const res = await fetch(
    `/functions/v1/instructor/booking-lifecycle?bookingId=${encodeURIComponent(
      bookingId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    }
  );

  if (res.status === 401) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }

  if (res.status === 404) {
    const err: any = new Error("BOOKING_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error("FAILED_TO_LOAD_BOOKING_LIFECYCLE");
    err.status = res.status;
    throw err;
  }

  return await res.json();
}

// --- Instructor Inbox & Reply (FEATURE 2.8 / 2.9) ---

/**
 * Base URL for Fastify API calls.
 * Browser must use proxy (/api) to avoid CORS and to attach Authorization from cookie.
 * Server (SSR) can use direct API URL from env.
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';
  return base.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Auth headers for proxy-backed or direct API calls.
 * In browser when using proxy (base === '/api'), returns {} so the proxy adds Bearer from cookie.
 * On server or when no proxy, returns { Authorization } from getSession() or null.
 */
async function getAuthHeadersForApi(): Promise<Record<string, string> | null> {
  const base = getApiBaseUrl();
  if (typeof window !== 'undefined' && base === '/api') {
    return {};
  }
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface InstructorConversation {
  id: string;
  customerName: string;
  channel: 'whatsapp' | 'instagram' | 'web';
  lastMessagePreview: string;
  updatedAt: string;
  status: 'hot' | 'waiting' | 'resolved';
  unreadCount: number;
}

export interface InstructorMessage {
  id: string;
  role: 'customer' | 'instructor';
  text: string;
  createdAt: string;
}

export interface GetConversationsResponse {
  ok: boolean;
  conversations: InstructorConversation[];
}

export interface GetMessagesResponse {
  ok: boolean;
  messages: InstructorMessage[];
}

/**
 * Pure helper: hot leads from conversations (top N by updatedAt).
 * Dashboard-ready, no fetch.
 */
export function getHotLeads(
  conversations: InstructorConversation[],
  limit = 6
): InstructorConversation[] {
  return conversations
    .filter((c) => c.status === 'hot')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Pure helper: single latest conversation by updatedAt.
 * Dashboard-ready, no fetch.
 */
export function getLatestConversation(
  conversations: InstructorConversation[]
): InstructorConversation | null {
  if (conversations.length === 0) return null;
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0] ?? null;
}

/**
 * Fetches instructor conversations (STEP 1 contract).
 * GET /instructor/conversations
 */
export async function getConversations(): Promise<InstructorConversation[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }
  const url = `${getApiBaseUrl()}/instructor/conversations`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
  });

  if (res.status === 401) {
    const err = new Error('UNAUTHORIZED');
    (err as any).status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('NOT_AUTHORIZED');
    (err as any).status = 403;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string | { message?: string } };
    const msg =
      body?.message ??
      (typeof body?.error === 'object' && body?.error && 'message' in body.error ? body.error.message : null) ??
      (typeof body?.error === 'string' ? body.error : null) ??
      (res.status === 502 || res.status === 503
        ? 'Servizio non disponibile. Riprova più tardi.'
        : res.status === 404
          ? 'Endpoint non trovato. Verifica che l\'API sia avviata.'
          : 'Failed to load conversations');
    const err = new Error(msg);
    (err as any).status = res.status;
    throw err;
  }

  const data: GetConversationsResponse = await res.json();
  return data.ok && data.conversations ? data.conversations : [];
}

/**
 * Fetches messages for a conversation (STEP 1 contract).
 * GET /instructor/conversations/:id/messages
 */
export async function getMessages(conversationId: string): Promise<InstructorMessage[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }
  const url = `${getApiBaseUrl()}/instructor/conversations/${encodeURIComponent(conversationId)}/messages`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });

  if (res.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('NOT_AUTHORIZED');
    (err as any).status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message ?? body?.error?.message ?? 'Failed to load messages';
    const err = new Error(msg);
    (err as any).status = res.status;
    throw err;
  }

  const data: GetMessagesResponse = await res.json();
  return data.ok && data.messages ? data.messages : [];
}

export type ConversationAiState = 'ai_on' | 'ai_paused_by_human' | 'ai_suggestion_only';

/**
 * PATCH /instructor/conversations/:id/ai-state — Take over (pause AI) or Resume AI.
 */
export async function patchConversationAiState(
  conversationId: string,
  body: { ai_state: ConversationAiState }
): Promise<{ ok: boolean; ai_state: string }> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/conversations/${encodeURIComponent(conversationId)}/ai-state`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    const err = new Error(data?.message ?? 'Failed to update AI state');
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export interface InstructorInboxItem {
  conversation_id: string;
  channel: string;
  status: string;
  last_message: {
    direction: 'inbound' | 'outbound';
    text: string;
    created_at: string;
  } | null;
  last_activity_at: string;
  needs_human: boolean;
}

export interface InstructorInboxResponse {
  ok: boolean;
  items: InstructorInboxItem[];
}

/**
 * Fetches instructor inbox (conversations for this instructor).
 * GET /instructor/inbox
 */
export async function fetchInstructorInbox(): Promise<InstructorInboxItem[]> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/inbox`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    credentials: 'same-origin',
  });

  if (res.status === 401) {
    const err = new Error('UNAUTHENTICATED');
    (err as any).status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('ONBOARDING_REQUIRED');
    (err as any).status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('FAILED_TO_LOAD_INBOX');
    (err as any).status = res.status;
    throw err;
  }

  const data: InstructorInboxResponse = await res.json();
  return data.ok && data.items ? data.items : [];
}

/**
 * Sends instructor reply. POST /instructor/inbox/:conversation_id/reply
 * Uses getApiBaseUrl() (same as getConversations/getMessages).
 */
export async function sendInstructorReply(
  conversationId: string,
  body: { text: string }
): Promise<{
  ok: boolean;
  message: {
    id: string;
    conversation_id: string;
    direction: 'outbound';
    text: string;
    created_at: string;
  };
}> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/inbox/${conversationId}/reply`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err: any = new Error(json?.message || json?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

// --- Instructor Draft Lifecycle (STEP 4.1 / 4.2) ---

export type DraftEffectiveState = 'proposed' | 'used' | 'ignored' | 'expired';

export interface ConversationDraft {
  id: string;
  conversationId: string;
  state: string;
  effectiveState: DraftEffectiveState;
  text: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface GetConversationDraftResponse {
  ok: boolean;
  draft: ConversationDraft | null;
}

/**
 * Fetches the active draft for a conversation.
 * GET /instructor/conversations/:id/draft
 */
export async function getConversationDraft(
  conversationId: string
): Promise<ConversationDraft | null> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/conversations/${encodeURIComponent(conversationId)}/draft`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (res.status === 401) {
    const err: any = new Error('UNAUTHENTICATED');
    err.status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err: any = new Error('ONBOARDING_REQUIRED');
    err.status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err: any = new Error('NOT_FOUND');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data: GetConversationDraftResponse = await res.json();
  return data.ok ? data.draft ?? null : null;
}

/**
 * Marks draft as used (trace only; does not send message).
 * POST /instructor/drafts/:draftId/use
 */
export async function useDraft(
  draftId: string,
  params: { edited: boolean; finalText: string }
): Promise<void> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/drafts/${encodeURIComponent(draftId)}/use`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ edited: params.edited, finalText: params.finalText }),
  });
  if (res.status === 401) {
    const err: any = new Error('UNAUTHENTICATED');
    err.status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err: any = new Error('ONBOARDING_REQUIRED');
    err.status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err: any = new Error('NOT_FOUND');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
}

/**
 * Marks draft as ignored.
 * POST /instructor/drafts/:draftId/ignore
 */
export async function ignoreDraft(draftId: string): Promise<void> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/drafts/${encodeURIComponent(draftId)}/ignore`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (res.status === 401) {
    const err: any = new Error('UNAUTHENTICATED');
    err.status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err: any = new Error('ONBOARDING_REQUIRED');
    err.status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err: any = new Error('NOT_FOUND');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
}

export interface KpiSummaryDrafts {
  generated: number;
  usedExact: number;
  usedEdited: number;
  used: number;
  ignored: number;
  expired: number;
  usageRate: number;
}

export interface GetKpiSummaryResponse {
  ok: boolean;
  window: '7d' | '30d';
  drafts: KpiSummaryDrafts;
}

/**
 * Fetches draft KPI summary for dashboard.
 * GET /instructor/kpis/summary?window=7d|30d
 */
export async function getKpiSummary(
  window: '7d' | '30d' = '7d'
): Promise<GetKpiSummaryResponse> {
  const authHeaders = await getAuthHeadersForApi();
  if (authHeaders === null) {
    const err: any = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/instructor/kpis/summary?window=${window}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  if (res.status === 401) {
    const err: any = new Error('UNAUTHENTICATED');
    err.status = 401;
    throw err;
  }
  if (res.status === 403) {
    const err: any = new Error('ONBOARDING_REQUIRED');
    err.status = 403;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
