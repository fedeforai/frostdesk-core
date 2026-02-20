/**
 * Type for public.ai_behavior_events table.
 * Used for typed queries/inserts; no repository or business logic here.
 */
export type AiBehaviorEventRow = {
  id: string;
  instructor_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
