import { sql } from './client.js';

export interface DashboardInstructor {
  id: string;
  name: string;
  languages: string;
  resort_base: string;
  country: string | null;
}

export interface DashboardService {
  id: string;
  service_name: string;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  is_active: boolean;
}

export interface DashboardMeetingPoint {
  id: string;
  name: string;
  address: string | null;
  what3words: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface DashboardPolicy {
  id: string;
  rule_type: string;
  rule_title: string;
  rule_description: string;
  version: number;
  is_active: boolean;
}

export interface DashboardAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface DashboardCalendar {
  connected: boolean;
  calendarId: string | null;
  lastSyncAt: string | null;
}

export interface DashboardBooking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string | null;
  service: string | null;
  status: string;
}

export interface InstructorDashboardData {
  instructor: DashboardInstructor | null;
  services: DashboardService[];
  meetingPoints: DashboardMeetingPoint[];
  policies: DashboardPolicy[];
  availability: DashboardAvailability[];
  calendar: DashboardCalendar;
  upcomingBookings: DashboardBooking[];
}

/**
 * Gets all dashboard data for an instructor (read-only).
 * 
 * @param instructorId - Instructor ID (UUID)
 * @returns Dashboard data
 */
export async function getInstructorDashboardData(
  instructorId: string
): Promise<InstructorDashboardData> {
  // 1. Get instructor profile
  const instructorResult = await sql<DashboardInstructor[]>`
    SELECT 
      id,
      full_name as name,
      working_language as languages,
      base_resort as resort_base,
      NULL::text as country
    FROM instructor_profiles
    WHERE id = ${instructorId}
    LIMIT 1
  `;
  const instructor = instructorResult.length > 0 ? instructorResult[0] : null;

  // 2. Get services (capped for fast response)
  const services = await sql<DashboardService[]>`
    SELECT 
      id,
      discipline as service_name,
      duration_minutes,
      price_amount,
      currency as price_currency,
      is_active
    FROM instructor_services
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  // 3. Get meeting points (capped)
  const meetingPoints = await sql<DashboardMeetingPoint[]>`
    SELECT 
      id,
      name,
      address,
      what3words,
      is_default,
      is_active
    FROM instructor_meeting_points
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  // 4. Get policies (capped)
  const policies = await sql<DashboardPolicy[]>`
    SELECT 
      id,
      policy_type as rule_type,
      title as rule_title,
      content as rule_description,
      version,
      is_active
    FROM instructor_policies
    WHERE instructor_id = ${instructorId}
    ORDER BY policy_type, version DESC
    LIMIT 50
  `;

  // 5. Get availability (capped)
  const availability = await sql<DashboardAvailability[]>`
    SELECT 
      id,
      day_of_week,
      start_time,
      end_time,
      is_active
    FROM instructor_availability
    WHERE instructor_id = ${instructorId}
    ORDER BY day_of_week, start_time
    LIMIT 100
  `;

  // 6. Get calendar status from calendar_connections (same table used by OAuth callback)
  const calendarConnectionResult = await sql<{
    status: string;
    last_sync_at: string | null;
  }[]>`
    SELECT status, last_sync_at
    FROM calendar_connections
    WHERE instructor_id = ${instructorId} AND provider = 'google'
    LIMIT 1
  `;

  const calendarRow = calendarConnectionResult.length > 0 ? calendarConnectionResult[0] : null;
  const calendar: DashboardCalendar = {
    connected: calendarRow !== null && calendarRow.status === 'connected',
    calendarId: null,
    lastSyncAt: calendarRow?.last_sync_at ?? null,
  };

  // 7. Get upcoming bookings (scoped to this instructor)
  const now = new Date().toISOString();
  const upcomingBookings = await sql<DashboardBooking[]>`
    SELECT 
      id,
      start_time,
      end_time,
      customer_name,
      NULL::text as service,
      status
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND start_time >= ${now}
    ORDER BY start_time ASC
    LIMIT 10
  `;

  return {
    instructor,
    services,
    meetingPoints,
    policies,
    availability,
    calendar,
    upcomingBookings,
  };
}
