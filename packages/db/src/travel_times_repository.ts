/**
 * Repository for meeting point travel times.
 * Stores travel times between meeting points for buffer calculation.
 */

import { sql } from './client.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MeetingPointTravelTime {
  id: string;
  instructor_id: string;
  from_meeting_point_id: string | null;
  to_meeting_point_id: string | null;
  travel_minutes: number;
  is_default: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class TravelTimeNotFoundError extends Error {
  constructor(id: string) {
    super(`Travel time not found: ${id}`);
    this.name = 'TravelTimeNotFoundError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create/Update params
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertTravelTimeParams {
  instructorId: string;
  fromMeetingPointId?: string | null;
  toMeetingPointId?: string | null;
  travelMinutes: number;
  isDefault?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets all travel times for an instructor.
 */
export async function getTravelTimes(
  instructorId: string
): Promise<MeetingPointTravelTime[]> {
  const result = await sql<MeetingPointTravelTime[]>`
    SELECT
      id,
      instructor_id,
      from_meeting_point_id,
      to_meeting_point_id,
      travel_minutes,
      is_default,
      created_at
    FROM meeting_point_travel_times
    WHERE instructor_id = ${instructorId}
    ORDER BY is_default DESC, created_at ASC
  `;
  return result;
}

/**
 * Gets the default travel time for an instructor.
 */
export async function getDefaultTravelTime(
  instructorId: string
): Promise<MeetingPointTravelTime | null> {
  const result = await sql<MeetingPointTravelTime[]>`
    SELECT
      id,
      instructor_id,
      from_meeting_point_id,
      to_meeting_point_id,
      travel_minutes,
      is_default,
      created_at
    FROM meeting_point_travel_times
    WHERE instructor_id = ${instructorId}
      AND is_default = true
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Gets the travel time between two specific meeting points.
 */
export async function getTravelTimeBetween(
  instructorId: string,
  fromMeetingPointId: string | null,
  toMeetingPointId: string | null
): Promise<MeetingPointTravelTime | null> {
  const result = await sql<MeetingPointTravelTime[]>`
    SELECT
      id,
      instructor_id,
      from_meeting_point_id,
      to_meeting_point_id,
      travel_minutes,
      is_default,
      created_at
    FROM meeting_point_travel_times
    WHERE instructor_id = ${instructorId}
      AND from_meeting_point_id IS NOT DISTINCT FROM ${fromMeetingPointId}
      AND to_meeting_point_id IS NOT DISTINCT FROM ${toMeetingPointId}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Gets the required travel buffer between two meeting points.
 * Falls back to default if no specific route is defined.
 * Returns 0 if no travel time is configured.
 */
export async function getRequiredTravelBuffer(
  instructorId: string,
  fromMeetingPointId: string | null,
  toMeetingPointId: string | null
): Promise<number> {
  // Same location = minimal buffer (or 0 if not configured)
  if (fromMeetingPointId === toMeetingPointId && fromMeetingPointId !== null) {
    const sameLocation = await getTravelTimeBetween(instructorId, fromMeetingPointId, toMeetingPointId);
    if (sameLocation) {
      return sameLocation.travel_minutes;
    }
    // Check for same-location default (from=to=same)
    const defaultForSame = await getDefaultTravelTime(instructorId);
    return defaultForSame ? Math.min(5, defaultForSame.travel_minutes) : 0;
  }

  // Try to find specific route
  const specific = await getTravelTimeBetween(instructorId, fromMeetingPointId, toMeetingPointId);
  if (specific) {
    return specific.travel_minutes;
  }

  // Try reverse route (B→A if A→B not found)
  const reverse = await getTravelTimeBetween(instructorId, toMeetingPointId, fromMeetingPointId);
  if (reverse) {
    return reverse.travel_minutes;
  }

  // Fall back to default
  const defaultTime = await getDefaultTravelTime(instructorId);
  return defaultTime ? defaultTime.travel_minutes : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts a travel time entry.
 * If a matching route exists, updates it. Otherwise inserts a new one.
 */
export async function upsertTravelTime(
  params: UpsertTravelTimeParams
): Promise<MeetingPointTravelTime> {
  const {
    instructorId,
    fromMeetingPointId = null,
    toMeetingPointId = null,
    travelMinutes,
    isDefault = false,
  } = params;

  // If setting as default, unset any existing default
  if (isDefault) {
    await sql`
      UPDATE meeting_point_travel_times
      SET is_default = false
      WHERE instructor_id = ${instructorId}
        AND is_default = true
    `;
  }

  // Try to find existing
  const existing = await getTravelTimeBetween(instructorId, fromMeetingPointId, toMeetingPointId);

  if (existing) {
    const result = await sql<MeetingPointTravelTime[]>`
      UPDATE meeting_point_travel_times
      SET travel_minutes = ${travelMinutes},
          is_default = ${isDefault}
      WHERE id = ${existing.id}
      RETURNING
        id,
        instructor_id,
        from_meeting_point_id,
        to_meeting_point_id,
        travel_minutes,
        is_default,
        created_at
    `;
    return result[0];
  }

  // Insert new
  const result = await sql<MeetingPointTravelTime[]>`
    INSERT INTO meeting_point_travel_times (
      instructor_id,
      from_meeting_point_id,
      to_meeting_point_id,
      travel_minutes,
      is_default,
      created_at
    )
    VALUES (
      ${instructorId},
      ${fromMeetingPointId},
      ${toMeetingPointId},
      ${travelMinutes},
      ${isDefault},
      NOW()
    )
    RETURNING
      id,
      instructor_id,
      from_meeting_point_id,
      to_meeting_point_id,
      travel_minutes,
      is_default,
      created_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create travel time');
  }

  return result[0];
}

/**
 * Sets the default travel buffer for an instructor.
 * Convenience function that creates/updates the default entry.
 */
export async function setDefaultTravelBuffer(
  instructorId: string,
  travelMinutes: number
): Promise<MeetingPointTravelTime> {
  return upsertTravelTime({
    instructorId,
    fromMeetingPointId: null,
    toMeetingPointId: null,
    travelMinutes,
    isDefault: true,
  });
}

/**
 * Deletes a travel time entry.
 */
export async function deleteTravelTime(
  id: string,
  instructorId: string
): Promise<void> {
  const result = await sql`
    DELETE FROM meeting_point_travel_times
    WHERE id = ${id}
      AND instructor_id = ${instructorId}
  `;

  if (result.count === 0) {
    throw new TravelTimeNotFoundError(id);
  }
}

/**
 * Deletes all travel times for an instructor.
 */
export async function deleteAllTravelTimes(
  instructorId: string
): Promise<number> {
  const result = await sql`
    DELETE FROM meeting_point_travel_times
    WHERE instructor_id = ${instructorId}
  `;
  return result.count;
}
