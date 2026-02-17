/**
 * Instructor domain: type-safe models and Zod schemas for API boundaries.
 * No `any`. All times UTC ISO strings unless noted.
 */

import { z } from 'zod';

// ---- InstructorProfile ----
export type InstructorProfileStatus = 'draft' | 'active' | 'suspended';

export interface InstructorProfile {
  id: string;
  org_id: string | null;
  user_id: string;
  status: InstructorProfileStatus;
  display_name: string;
  full_name: string;
  timezone: string;
  phone: string | null;
  languages: string[];
  resorts: unknown[];
  certifications: unknown[];
  contact_email: string;
  created_at: string;
  updated_at: string | null;
}

export const instructorProfileStatusSchema = z.enum(['draft', 'active', 'suspended']);
export const instructorProfileSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
  user_id: z.string().uuid(),
  status: instructorProfileStatusSchema,
  display_name: z.string(),
  full_name: z.string(),
  timezone: z.string(),
  phone: z.string().nullable(),
  languages: z.array(z.string()),
  resorts: z.array(z.unknown()),
  certifications: z.array(z.unknown()),
  contact_email: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

// ---- InstructorService ----
export type LessonType = 'private' | 'group' | 'semi_private';

export interface InstructorService {
  id: string;
  instructor_id: string;
  sport: string | null;
  lesson_type: LessonType | null;
  duration_minutes: number;
  min_participants: number;
  max_participants: number;
  base_price: number | null;
  price_amount: number;
  currency: string;
  rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const lessonTypeSchema = z.enum(['private', 'group', 'semi_private']);
export const instructorServiceRulesSchema = z.record(z.string(), z.unknown()).default({});
export const instructorServiceSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  sport: z.string().nullable(),
  lesson_type: lessonTypeSchema.nullable(),
  duration_minutes: z.number().int().positive(),
  min_participants: z.number().int().min(0),
  max_participants: z.number().int().min(1),
  base_price: z.number().nonnegative().nullable(),
  price_amount: z.number().int().min(0),
  currency: z.string().length(3),
  rules: instructorServiceRulesSchema,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---- AvailabilityWindow (recurring) ----
export interface AvailabilityWindow {
  id: string;
  instructor_id: string;
  day_of_week: number; // 0..6
  start_time: string; // HH:mm
  end_time: string;
  is_active: boolean;
  meeting_point_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const availabilityWindowSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---- AvailabilityOverride (date-specific) ----
export type AvailabilityOverrideType = 'add' | 'block';

export interface AvailabilityOverride {
  id: string;
  instructor_id: string;
  start_utc: string;
  end_utc: string;
  override_type: AvailabilityOverrideType;
  is_available: boolean;
  created_at: string;
}

export const availabilityOverrideTypeSchema = z.enum(['add', 'block']);
export const availabilityOverrideSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  start_utc: z.string(),
  end_utc: z.string(),
  override_type: availabilityOverrideTypeSchema,
  is_available: z.boolean(),
  created_at: z.string(),
});

// ---- ExternalBusyBlock ----
export interface ExternalBusyBlock {
  id: string;
  instructor_id: string;
  source_event_id: string;
  source_calendar_id: string | null;
  start_utc: string;
  end_utc: string;
  summary_hash: string | null;
  created_at: string;
  updated_at: string;
}

export const externalBusyBlockSchema = z.object({
  id: z.string().uuid(),
  instructor_id: z.string().uuid(),
  source_event_id: z.string(),
  source_calendar_id: z.string().nullable(),
  start_utc: z.string(),
  end_utc: z.string(),
  summary_hash: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---- AIConfig ----
export type EscalationMode = 'never' | 'on_risk' | 'always';

export interface InstructorAIConfig {
  instructor_id: string;
  automation_enabled: boolean;
  escalation_mode: EscalationMode;
  max_daily_hours: number | null;
  preferred_gap_minutes: number | null;
  last_minute_threshold_hours: number | null;
  tone_profile: Record<string, unknown>;
  safety_policies: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const escalationModeSchema = z.enum(['never', 'on_risk', 'always']);
export const instructorAIConfigSchema = z.object({
  instructor_id: z.string().uuid(),
  automation_enabled: z.boolean(),
  escalation_mode: escalationModeSchema,
  max_daily_hours: z.number().nonnegative().nullable(),
  preferred_gap_minutes: z.number().int().min(0).nullable(),
  last_minute_threshold_hours: z.number().nonnegative().nullable(),
  tone_profile: z.record(z.string(), z.unknown()).default({}),
  safety_policies: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

// ---- SellableSlot (with optional exclusion reason for debugging) ----
export interface SellableSlot {
  start_utc: string;
  end_utc: string;
  excluded_reason?: string; // only when returning with debug info
}

export const sellableSlotSchema = z.object({
  start_utc: z.string(),
  end_utc: z.string(),
  excluded_reason: z.string().optional(),
});

// ---- Input for pure computeSellableSlots ----
export interface ComputeSellableSlotsInput {
  from_utc: string;
  to_utc: string;
  timezone: string;
  availability_windows: Array<Pick<AvailabilityWindow, 'day_of_week' | 'start_time' | 'end_time' | 'is_active' | 'meeting_point_id'>>;
  overrides: Array<Pick<AvailabilityOverride, 'start_utc' | 'end_utc' | 'is_available'>>;
  bookings: Array<{ start_time: string; end_time: string }>;
  external_busy_blocks: Array<Pick<ExternalBusyBlock, 'start_utc' | 'end_utc'>>;
}

export const computeSellableSlotsInputSchema = z.object({
  from_utc: z.string(),
  to_utc: z.string(),
  timezone: z.string(),
  availability_windows: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string(),
    end_time: z.string(),
    is_active: z.boolean(),
    meeting_point_id: z.string().uuid().nullable().optional(),
  })),
  overrides: z.array(z.object({
    start_utc: z.string(),
    end_utc: z.string(),
    is_available: z.boolean(),
  })),
  bookings: z.array(z.object({ start_time: z.string(), end_time: z.string() })),
  external_busy_blocks: z.array(z.object({ start_utc: z.string(), end_utc: z.string() })),
});
