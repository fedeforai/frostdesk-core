import { getAIBookingSuggestionContext } from './ai_booking_suggestion_repository.js';

/**
 * Retrieves READ-ONLY context data for AI booking suggestions.
 * 
 * Pure pass-through service layer. No logic, transformations, or side effects.
 * 
 * @param userId - User ID (instructor ID)
 * @returns Context data for AI suggestions
 */
export async function getAIBookingSuggestionContextService(
  userId: string
) {
  return getAIBookingSuggestionContext(userId);
}
