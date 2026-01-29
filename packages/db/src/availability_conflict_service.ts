import {
  listAvailabilityCalendarConflicts,
  type AvailabilityCalendarConflict,
} from './availability_conflict_repository.js';

/**
 * Lists conflicts between instructor availability windows and calendar events.
 * Returns raw conflicts from repository - no filtering, deduplication, or grouping.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of conflicts, ordered by availability start time
 */
export async function listAvailabilityCalendarConflictsService(
  userId: string
): Promise<AvailabilityCalendarConflict[]> {
  return listAvailabilityCalendarConflicts(userId);
}
