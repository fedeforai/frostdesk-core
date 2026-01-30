import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export interface InstructorProfile {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

export interface UpdateInstructorProfileParams {
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

/**
 * Fetches instructor profile from the Supabase Edge Function.
 * 
 * @returns Instructor profile or null if not found
 */
export async function fetchInstructorProfile(): Promise<InstructorProfile | null> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/profile`;

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
 * Updates instructor profile.
 * 
 * @param params - Profile data to update
 * @returns Updated instructor profile
 */
export async function updateInstructorProfile(
  params: UpdateInstructorProfileParams
): Promise<InstructorProfile> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/profile`;

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
 * Fetches instructor services from the Supabase Edge Function.
 * 
 * @returns Array of instructor services
 */
export async function fetchInstructorServices(): Promise<InstructorService[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/services`;

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
 * Creates a new instructor service.
 * 
 * @param params - Service data
 * @returns Created instructor service
 */
export async function createInstructorService(
  params: CreateInstructorServiceParams
): Promise<InstructorService> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/services`;

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



/**
 * Updates an instructor service.
 * 
 * @param serviceId - Service ID
 * @param params - Service data to update
 * @returns Updated instructor service
 */
export async function updateInstructorService(
  serviceId: string,
  params: UpdateInstructorServiceParams
): Promise<InstructorService> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/services/${serviceId}`;

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

/**
 * Fetches conflicts between availability windows and calendar events.
 * 
 * @returns Array of conflicts
 */
export async function fetchAvailabilityConflicts(): Promise<AvailabilityCalendarConflict[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/availability-conflicts`;

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

  const data: FetchAvailabilityConflictsResponse = await response.json();
  return data.items;
}

// ============================
// BOOKINGS — HUMAN TRIGGERED
// ============================

export interface FetchInstructorBookingsResponse {
  items: any[];
}

/**
 * Fetches all bookings for the instructor.
 * 
 * @returns Bookings list
 */
export async function fetchInstructorBookings(): Promise<FetchInstructorBookingsResponse> {
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

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/bookings`;

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
    const error = new Error('FAILED_TO_LOAD_BOOKINGS');
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Fetches a single booking by ID.
 * 
 * @param id - Booking ID
 * @returns Booking data
 */
export async function fetchInstructorBooking(id: string): Promise<any> {
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

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/bookings/${id}`;

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
    if (response.status === 404) {
      const error = new Error('NOT_FOUND');
      (error as any).status = 404;
      throw error;
    }
    const error = new Error('FAILED_TO_LOAD_BOOKING');
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Creates a new booking (human-triggered).
 * 
 * @param payload - Booking data
 * @returns Created booking ID
 */
export async function createInstructorBooking(payload: {
  customerName: string;
  startTime: string;
  endTime: string;
  serviceId?: string | null;
  meetingPointId?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
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

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/bookings`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const error = new Error('UNAUTHORIZED');
      (error as any).status = 401;
      throw error;
    }
    const error = new Error('FAILED_TO_CREATE_BOOKING');
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Creates a new instructor meeting point.
 * 
 * @param params - Meeting point data
 * @returns Created instructor meeting point
 */
export async function createInstructorMeetingPoint(
  params: CreateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/meeting-points`;

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
 * Fetches instructor availability from the Supabase Edge Function.
 * 
 * @returns Array of instructor availability windows
 */
export async function fetchAvailability(): Promise<InstructorAvailability[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/availability`;

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

  const data: FetchAvailabilityResponse = await response.json();
  return data.items;
}

/**
 * Creates a new instructor availability window.
 * 
 * @param payload - Availability data (dayOfWeek, startTime, endTime, isActive)
 */
export async function createAvailability(
  payload: CreateAvailabilityParams
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/availability`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
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
 * Updates an instructor availability window.
 * 
 * @param payload - Availability data (id, dayOfWeek, startTime, endTime, isActive)
 */
export async function updateAvailability(
  payload: UpdateAvailabilityParams
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/availability`;

  const response = await fetch(functionUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: {} }));
    const errorObj = new Error(errorData.error?.message || '');
    (errorObj as any).status = response.status;
    (errorObj as any).message = errorData.error?.message || '';
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
 * Updates an instructor meeting point.
 * 
 * @param meetingPointId - Meeting point ID
 * @param params - Meeting point data to update
 * @returns Updated instructor meeting point
 */
export async function updateInstructorMeetingPoint(
  meetingPointId: string,
  params: UpdateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/meeting-points/${meetingPointId}`;

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

/**
 * Fetches instructor meeting points from the Supabase Edge Function.
 * 
 * @returns Array of instructor meeting points
 */
export async function fetchInstructorMeetingPoints(): Promise<InstructorMeetingPoint[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/meeting-points`;

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
 * Fetches calendar events from the Supabase Edge Function.
 * 
 * @param params - Optional dateFrom and dateTo filters
 * @returns Array of calendar events
 */
export async function fetchCalendarEvents(
  params?: FetchCalendarEventsParams
): Promise<CalendarEvent[]> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/calendar/events`;

  const queryParams = new URLSearchParams();
  if (params?.dateFrom) {
    queryParams.append('dateFrom', params.dateFrom);
  }
  if (params?.dateTo) {
    queryParams.append('dateTo', params.dateTo);
  }

  const url = queryParams.toString() 
    ? `${functionUrl}?${queryParams.toString()}`
    : functionUrl;

  const response = await fetch(url, {
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
 * Fetches AI booking suggestion context (READ-ONLY).
 * 
 * This function provides minimal, safe data that AI can read to generate
 * booking suggestions. No mutations, inferences, or side effects.
 * 
 * @returns Context data for AI suggestions
 */
export async function fetchAIBookingSuggestionContext(): Promise<AIBookingSuggestionContext> {
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

  const functionUrl = `${supabaseUrl}/functions/v1/instructor/ai-booking-suggestions`;

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
    const error = new Error('FAILED_TO_LOAD_AI_BOOKING_CONTEXT');
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
 * Deactivates an instructor availability window.
 * 
 * @param id - Availability ID
 */
export async function deactivateAvailability(id: string): Promise<void> {
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
 * 
 * @param params - Connection parameters (auth_code, calendar_id)
 * @returns Calendar connection details
 */
export async function connectCalendar(
  params: ConnectCalendarParams
): Promise<InstructorCalendarConnection> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/calendar/connect`;

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

/**
 * Disconnects the calendar for the instructor.
 */
export async function disconnectCalendar(): Promise<void> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/calendar/disconnect`;

  const response = await fetch(functionUrl, {
    method: 'POST',
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
 * Manually syncs calendar events from Google Calendar.
 * 
 * @returns Sync result with events count
 */
export async function syncCalendar(): Promise<SyncCalendarResult> {
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
  const functionUrl = `${supabaseUrl}/functions/v1/instructor/calendar/sync`;

  const response = await fetch(functionUrl, {
    method: 'POST',
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
    const error = new Error('FAILED_TO_LOAD_BOOKING_AUDIT_LOGS');
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
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/instructor/inbox`.replace(/([^:]\/)\/+/g, '$1');

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
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

export interface SendInstructorReplyResponse {
  ok: boolean;
  message?: { id: string; conversation_id: string; direction: string; text: string; status?: string; created_at: string };
}

/**
 * Sends instructor reply. POST /instructor/inbox/:conversation_id/reply
 */
export async function sendInstructorReply(
  conversationId: string,
  body: { text: string }
): Promise<SendInstructorReplyResponse> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const err = new Error('No session found');
    (err as any).status = 401;
    throw err;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/instructor/inbox/${encodeURIComponent(conversationId)}/reply`.replace(/([^:]\/)\/+/g, '$1');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ text: body.text.trim() }),
  });

  if (res.status === 201) {
    return await res.json();
  }
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
  if (res.status === 400) {
    const err = new Error('INVALID_PAYLOAD');
    (err as any).status = 400;
    throw err;
  }
  const err = new Error('FAILED_TO_SEND_REPLY');
  (err as any).status = res.status;
  throw err;
}
