/**
 * Reschedule Context Repository (READ-ONLY)
 *
 * Provides read-only queries to support AI-enriched reschedule drafts.
 * No mutations. No side effects. Fail-open.
 *
 * Used by inbound_draft_orchestrator when intent = RESCHEDULE to:
 *   1. Find the active booking the customer likely wants to reschedule
 *   2. Combine with validateAvailability() for the new slot
 *
 * Does NOT import booking_repository (no create/update/delete).
 * Does NOT import booking_state_machine (no state transitions).
 */

import { sql } from './client.js';

export interface ActiveBookingForReschedule {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string | null;
  meetingPointName: string | null;
  customerDisplayName: string | null;
}

/**
 * Finds the most likely active booking for a customer+instructor near a date.
 *
 * Searches for confirmed/modified bookings on the given date.
 * If no date provided, returns the next upcoming booking.
 *
 * Read-only. Fail-open: returns null on any error.
 */
export async function findActiveBookingForReschedule(
  instructorId: string,
  customerId: string,
  approximateDate: string | null,
): Promise<ActiveBookingForReschedule | null> {
  try {
    if (approximateDate) {
      const rows = await sql<Array<{
        id: string;
        start_time: string;
        end_time: string;
        status: string;
        service_name: string | null;
        meeting_point_name: string | null;
        display_name: string | null;
      }>>`
        SELECT
          b.id::text,
          b.start_time,
          b.end_time,
          b.status,
          s.name AS service_name,
          mp.name AS meeting_point_name,
          cp.display_name
        FROM bookings b
        LEFT JOIN instructor_services s ON s.id = b.service_id
        LEFT JOIN instructor_meeting_points mp ON mp.id = b.meeting_point_id
        LEFT JOIN customer_profiles cp ON cp.id = b.customer_id
        WHERE b.instructor_id = ${instructorId}::uuid
          AND b.customer_id = ${customerId}::uuid
          AND b.status IN ('confirmed', 'modified')
          AND b.start_time::date = ${approximateDate}::date
        ORDER BY b.start_time ASC
        LIMIT 1
      `;

      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          startTime: r.start_time,
          endTime: r.end_time,
          status: r.status,
          serviceName: r.service_name,
          meetingPointName: r.meeting_point_name,
          customerDisplayName: r.display_name,
        };
      }
    }

    // Fallback: find next upcoming active booking (no date filter)
    const fallbackRows = await sql<Array<{
      id: string;
      start_time: string;
      end_time: string;
      status: string;
      service_name: string | null;
      meeting_point_name: string | null;
      display_name: string | null;
    }>>`
      SELECT
        b.id::text,
        b.start_time,
        b.end_time,
        b.status,
        s.name AS service_name,
        mp.name AS meeting_point_name,
        cp.display_name
      FROM bookings b
      LEFT JOIN instructor_services s ON s.id = b.service_id
      LEFT JOIN instructor_meeting_points mp ON mp.id = b.meeting_point_id
      LEFT JOIN customer_profiles cp ON cp.id = b.customer_id
      WHERE b.instructor_id = ${instructorId}::uuid
        AND b.customer_id = ${customerId}::uuid
        AND b.status IN ('confirmed', 'modified')
        AND b.start_time > NOW()
      ORDER BY b.start_time ASC
      LIMIT 1
    `;

    if (fallbackRows.length === 0) return null;

    const r = fallbackRows[0];
    return {
      id: r.id,
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
      serviceName: r.service_name,
      meetingPointName: r.meeting_point_name,
      customerDisplayName: r.display_name,
    };
  } catch {
    return null;
  }
}
