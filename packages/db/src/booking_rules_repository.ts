/**
 * Repository for instructor booking rules.
 * Handles CRUD operations for rules like min duration, advance booking, travel buffer, etc.
 */

import { sql } from './client.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BookingRuleType =
  | 'min_duration'
  | 'advance_booking'
  | 'max_advance'
  | 'travel_buffer'
  | 'gap_protection'
  | 'daily_limit'
  | 'weekly_limit'
  | 'full_week_preference';

export interface MinDurationConfig {
  min_hours: number;
  message_it?: string;
  message_en?: string;
}

export interface AdvanceBookingConfig {
  min_hours_advance: number;
  message_it?: string;
  message_en?: string;
}

export interface MaxAdvanceConfig {
  max_days_advance: number;
  rolling_window?: boolean;
  message_it?: string;
  message_en?: string;
}

export interface TravelBufferConfig {
  default_minutes: number;
  same_location_minutes?: number;
  use_travel_times_matrix?: boolean;
  enforce?: 'hard' | 'soft';
  message_it?: string;
  message_en?: string;
}

export interface GapProtectionConfig {
  min_useful_gap_hours: number;
  enforce?: 'hard' | 'soft';
  message_it?: string;
  message_en?: string;
}

export interface DailyLimitConfig {
  max_bookings_per_day?: number;
  max_hours_per_day?: number;
  enforce?: 'hard' | 'soft';
  message_it?: string;
  message_en?: string;
}

export interface WeeklyLimitConfig {
  max_hours_per_week: number;
  week_start?: 'monday' | 'sunday';
  message_it?: string;
  message_en?: string;
}

export interface FullWeekPreferenceConfig {
  enforce?: 'hard' | 'soft';
  min_consecutive_days?: number;
  discount_percent?: number;
  block_partial_within_days?: number;
  allow_partial_if_week_has_bookings?: boolean;
  allow_last_minute_days?: number;
  message_it?: string;
  message_en?: string;
}

export type BookingRuleConfig =
  | MinDurationConfig
  | AdvanceBookingConfig
  | MaxAdvanceConfig
  | TravelBufferConfig
  | GapProtectionConfig
  | DailyLimitConfig
  | WeeklyLimitConfig
  | FullWeekPreferenceConfig;

export interface InstructorBookingRule {
  id: string;
  instructor_id: string;
  rule_type: BookingRuleType;
  config: BookingRuleConfig;
  valid_from: string | null;
  valid_to: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class BookingRuleNotFoundError extends Error {
  constructor(id: string) {
    super(`Booking rule not found: ${id}`);
    this.name = 'BookingRuleNotFoundError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create/Update params
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateBookingRuleParams {
  instructorId: string;
  ruleType: BookingRuleType;
  config: BookingRuleConfig;
  validFrom?: string | null;
  validTo?: string | null;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateBookingRuleParams {
  id: string;
  instructorId: string;
  config?: BookingRuleConfig;
  validFrom?: string | null;
  validTo?: string | null;
  priority?: number;
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets all booking rules for an instructor (active and inactive).
 */
export async function getBookingRules(
  instructorId: string
): Promise<InstructorBookingRule[]> {
  const result = await sql<InstructorBookingRule[]>`
    SELECT
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
    FROM instructor_booking_rules
    WHERE instructor_id = ${instructorId}
    ORDER BY priority DESC, created_at ASC
  `;
  return result;
}

/**
 * Gets active booking rules for an instructor, optionally filtered by date.
 * Rules are returned in priority order (highest first).
 */
export async function getActiveBookingRules(
  instructorId: string,
  forDate?: string
): Promise<InstructorBookingRule[]> {
  if (forDate) {
    const result = await sql<InstructorBookingRule[]>`
      SELECT
        id,
        instructor_id,
        rule_type,
        config,
        valid_from,
        valid_to,
        priority,
        is_active,
        created_at,
        updated_at
      FROM instructor_booking_rules
      WHERE instructor_id = ${instructorId}
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= ${forDate}::date)
        AND (valid_to IS NULL OR valid_to >= ${forDate}::date)
      ORDER BY priority DESC, created_at ASC
    `;
    return result;
  }

  const result = await sql<InstructorBookingRule[]>`
    SELECT
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
    FROM instructor_booking_rules
    WHERE instructor_id = ${instructorId}
      AND is_active = true
    ORDER BY priority DESC, created_at ASC
  `;
  return result;
}

/**
 * Gets a specific booking rule by ID.
 */
export async function getBookingRuleById(
  ruleId: string,
  instructorId: string
): Promise<InstructorBookingRule | null> {
  const result = await sql<InstructorBookingRule[]>`
    SELECT
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
    FROM instructor_booking_rules
    WHERE id = ${ruleId}
      AND instructor_id = ${instructorId}
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Gets active rule by type for an instructor.
 * Returns the highest priority active rule of that type.
 */
export async function getActiveRuleByType(
  instructorId: string,
  ruleType: BookingRuleType,
  forDate?: string
): Promise<InstructorBookingRule | null> {
  if (forDate) {
    const result = await sql<InstructorBookingRule[]>`
      SELECT
        id,
        instructor_id,
        rule_type,
        config,
        valid_from,
        valid_to,
        priority,
        is_active,
        created_at,
        updated_at
      FROM instructor_booking_rules
      WHERE instructor_id = ${instructorId}
        AND rule_type = ${ruleType}
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= ${forDate}::date)
        AND (valid_to IS NULL OR valid_to >= ${forDate}::date)
      ORDER BY priority DESC
      LIMIT 1
    `;
    return result.length > 0 ? result[0] : null;
  }

  const result = await sql<InstructorBookingRule[]>`
    SELECT
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
    FROM instructor_booking_rules
    WHERE instructor_id = ${instructorId}
      AND rule_type = ${ruleType}
      AND is_active = true
    ORDER BY priority DESC
    LIMIT 1
  `;
  return result.length > 0 ? result[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new booking rule.
 */
export async function createBookingRule(
  params: CreateBookingRuleParams
): Promise<InstructorBookingRule> {
  const {
    instructorId,
    ruleType,
    config,
    validFrom = null,
    validTo = null,
    priority = 0,
    isActive = true,
  } = params;

  const result = await sql<InstructorBookingRule[]>`
    INSERT INTO instructor_booking_rules (
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${ruleType},
      ${JSON.stringify(config)}::jsonb,
      ${validFrom}::date,
      ${validTo}::date,
      ${priority},
      ${isActive},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create booking rule');
  }

  return result[0];
}

/**
 * Updates an existing booking rule.
 */
export async function updateBookingRule(
  params: UpdateBookingRuleParams
): Promise<InstructorBookingRule> {
  const { id, instructorId, config, validFrom, validTo, priority, isActive } = params;

  const existing = await getBookingRuleById(id, instructorId);
  if (!existing) {
    throw new BookingRuleNotFoundError(id);
  }

  const newConfig = config !== undefined ? config : existing.config;
  const newValidFrom = validFrom !== undefined ? validFrom : existing.valid_from;
  const newValidTo = validTo !== undefined ? validTo : existing.valid_to;
  const newPriority = priority !== undefined ? priority : existing.priority;
  const newIsActive = isActive !== undefined ? isActive : existing.is_active;

  const result = await sql<InstructorBookingRule[]>`
    UPDATE instructor_booking_rules
    SET
      config = ${JSON.stringify(newConfig)}::jsonb,
      valid_from = ${newValidFrom}::date,
      valid_to = ${newValidTo}::date,
      priority = ${newPriority},
      is_active = ${newIsActive},
      updated_at = NOW()
    WHERE id = ${id}
      AND instructor_id = ${instructorId}
    RETURNING
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new BookingRuleNotFoundError(id);
  }

  return result[0];
}

/**
 * Deletes a booking rule.
 */
export async function deleteBookingRule(
  ruleId: string,
  instructorId: string
): Promise<void> {
  const result = await sql`
    DELETE FROM instructor_booking_rules
    WHERE id = ${ruleId}
      AND instructor_id = ${instructorId}
  `;

  if (result.count === 0) {
    throw new BookingRuleNotFoundError(ruleId);
  }
}

/**
 * Toggles is_active for a booking rule.
 */
export async function toggleBookingRule(
  ruleId: string,
  instructorId: string
): Promise<InstructorBookingRule> {
  const result = await sql<InstructorBookingRule[]>`
    UPDATE instructor_booking_rules
    SET is_active = NOT is_active,
        updated_at = NOW()
    WHERE id = ${ruleId}
      AND instructor_id = ${instructorId}
    RETURNING
      id,
      instructor_id,
      rule_type,
      config,
      valid_from,
      valid_to,
      priority,
      is_active,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new BookingRuleNotFoundError(ruleId);
  }

  return result[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a rule type is a "hard" rule (blocks booking) vs "soft" (warning only).
 */
export function isHardRuleType(ruleType: BookingRuleType): boolean {
  return ['min_duration', 'advance_booking', 'max_advance', 'daily_limit', 'weekly_limit'].includes(ruleType);
}

/**
 * Gets default config values for a rule type.
 */
export function getDefaultConfig(ruleType: BookingRuleType): BookingRuleConfig {
  switch (ruleType) {
    case 'min_duration':
      return { min_hours: 1 };
    case 'advance_booking':
      return { min_hours_advance: 24 };
    case 'max_advance':
      return { max_days_advance: 60, rolling_window: true };
    case 'travel_buffer':
      return { default_minutes: 15, same_location_minutes: 5, use_travel_times_matrix: true, enforce: 'hard' };
    case 'gap_protection':
      return { min_useful_gap_hours: 2, enforce: 'soft' };
    case 'daily_limit':
      return { max_hours_per_day: 8, enforce: 'hard' };
    case 'weekly_limit':
      return { max_hours_per_week: 40, week_start: 'monday' };
    case 'full_week_preference':
      return { enforce: 'soft', min_consecutive_days: 5, discount_percent: 10, allow_last_minute_days: 3 };
    default:
      return {};
  }
}
