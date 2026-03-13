/**
 * Booking Rules Validator
 * 
 * LOOP-SAFE: This is a PURE function validator with:
 * - No circular dependencies
 * - Explicit inputs (no internal fetches)
 * - Fixed execution order
 * - Early exit on hard errors
 * - Single pass filtering
 */

import type {
  InstructorBookingRule,
  BookingRuleType,
  MinDurationConfig,
  AdvanceBookingConfig,
  MaxAdvanceConfig,
  TravelBufferConfig,
  GapProtectionConfig,
  DailyLimitConfig,
  WeeklyLimitConfig,
  FullWeekPreferenceConfig,
} from './booking_rules_repository.js';
import type { MeetingPointTravelTime } from './travel_times_repository.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExistingBooking {
  start_time: string;
  end_time: string;
  meeting_point_id?: string | null;
}

export interface BookingValidationInput {
  startTime: string;
  endTime: string;
  meetingPointId?: string | null;
  instructorId: string;
  now?: Date;
  rules: InstructorBookingRule[];
  existingBookings: ExistingBooking[];
  travelTimes: MeetingPointTravelTime[];
}

export interface ValidationError {
  rule_type: BookingRuleType;
  rule_id: string;
  message: string;
  message_it?: string;
  message_en?: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  rule_type: BookingRuleType;
  rule_id: string;
  message: string;
  message_it?: string;
  message_en?: string;
  can_override: boolean;
  suggestion?: string;
}

export interface AppliedDiscount {
  rule_type: BookingRuleType;
  rule_id: string;
  percent: number;
  reason: string;
}

export interface BookingValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  discounts: AppliedDiscount[];
}

interface SingleRuleResult {
  error?: ValidationError;
  warning?: ValidationWarning;
  discount?: AppliedDiscount;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fixed validation order - NO RECURSION.
 * Hard rules first, soft rules last.
 */
const VALIDATION_ORDER: BookingRuleType[] = [
  'min_duration',
  'advance_booking',
  'max_advance',
  'travel_buffer',
  'daily_limit',
  'weekly_limit',
  'gap_protection',
  'full_week_preference',
];

const HARD_RULES: Set<BookingRuleType> = new Set([
  'min_duration',
  'advance_booking',
  'max_advance',
  'daily_limit',
  'weekly_limit',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Main Validator (PURE FUNCTION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a booking against all active rules.
 * 
 * LOOP-SAFE guarantees:
 * - Iterates VALIDATION_ORDER exactly once
 * - No recursive calls
 * - Exits early on first hard error
 * - All data pre-fetched (no I/O inside)
 */
export function validateBookingRules(input: BookingValidationInput): BookingValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const discounts: AppliedDiscount[] = [];

  const now = input.now ?? new Date();
  const startMs = new Date(input.startTime).getTime();
  const endMs = new Date(input.endTime).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return {
      valid: false,
      errors: [{
        rule_type: 'min_duration',
        rule_id: 'system',
        message: 'Invalid time range',
        message_en: 'Invalid time range',
        message_it: 'Intervallo di tempo non valido',
      }],
      warnings: [],
      discounts: [],
    };
  }

  const context: ValidationContext = {
    startTime: input.startTime,
    endTime: input.endTime,
    startMs,
    endMs,
    durationHours: (endMs - startMs) / (1000 * 60 * 60),
    meetingPointId: input.meetingPointId ?? null,
    instructorId: input.instructorId,
    now,
    nowMs: now.getTime(),
    existingBookings: input.existingBookings,
    travelTimes: input.travelTimes,
  };

  for (const ruleType of VALIDATION_ORDER) {
    const rule = input.rules.find(r => r.rule_type === ruleType && r.is_active);
    if (!rule) continue;

    const result = validateSingleRule(rule, context);

    if (result.error) {
      errors.push(result.error);
      if (HARD_RULES.has(ruleType)) {
        break;
      }
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (result.discount) {
      discounts.push(result.discount);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    discounts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Context
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationContext {
  startTime: string;
  endTime: string;
  startMs: number;
  endMs: number;
  durationHours: number;
  meetingPointId: string | null;
  instructorId: string;
  now: Date;
  nowMs: number;
  existingBookings: ExistingBooking[];
  travelTimes: MeetingPointTravelTime[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Rule Validators
// ─────────────────────────────────────────────────────────────────────────────

function validateSingleRule(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  switch (rule.rule_type) {
    case 'min_duration':
      return validateMinDuration(rule, ctx);
    case 'advance_booking':
      return validateAdvanceBooking(rule, ctx);
    case 'max_advance':
      return validateMaxAdvance(rule, ctx);
    case 'travel_buffer':
      return validateTravelBuffer(rule, ctx);
    case 'daily_limit':
      return validateDailyLimit(rule, ctx);
    case 'weekly_limit':
      return validateWeeklyLimit(rule, ctx);
    case 'gap_protection':
      return validateGapProtection(rule, ctx);
    case 'full_week_preference':
      return validateFullWeekPreference(rule, ctx);
    default:
      return {};
  }
}

function validateMinDuration(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as MinDurationConfig;
  const minHours = config.min_hours ?? 1;

  if (ctx.durationHours < minHours) {
    return {
      error: {
        rule_type: 'min_duration',
        rule_id: rule.id,
        message: `Booking must be at least ${minHours} hour(s)`,
        message_en: config.message_en ?? `Booking must be at least ${minHours} hour(s)`,
        message_it: config.message_it ?? `Prenotazione minima ${minHours} ora/e`,
        details: { required: minHours, actual: ctx.durationHours },
      },
    };
  }

  return {};
}

function validateAdvanceBooking(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as AdvanceBookingConfig;
  const minHoursAdvance = config.min_hours_advance ?? 24;

  const hoursUntilStart = (ctx.startMs - ctx.nowMs) / (1000 * 60 * 60);

  if (hoursUntilStart < minHoursAdvance) {
    return {
      error: {
        rule_type: 'advance_booking',
        rule_id: rule.id,
        message: `Booking requires at least ${minHoursAdvance} hours advance notice`,
        message_en: config.message_en ?? `Booking requires at least ${minHoursAdvance} hours advance notice`,
        message_it: config.message_it ?? `Prenotazioni con almeno ${minHoursAdvance} ore di anticipo`,
        details: { required: minHoursAdvance, actual: Math.round(hoursUntilStart * 10) / 10 },
      },
    };
  }

  return {};
}

function validateMaxAdvance(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as MaxAdvanceConfig;
  const maxDays = config.max_days_advance ?? 60;

  const daysUntilStart = (ctx.startMs - ctx.nowMs) / (1000 * 60 * 60 * 24);

  if (daysUntilStart > maxDays) {
    return {
      error: {
        rule_type: 'max_advance',
        rule_id: rule.id,
        message: `Booking can only be made up to ${maxDays} days in advance`,
        message_en: config.message_en ?? `Booking can only be made up to ${maxDays} days in advance`,
        message_it: config.message_it ?? `Prenotazioni possibili solo entro ${maxDays} giorni`,
        details: { max_days: maxDays, actual_days: Math.round(daysUntilStart) },
      },
    };
  }

  return {};
}

function validateTravelBuffer(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as TravelBufferConfig;
  const defaultMinutes = config.default_minutes ?? 15;
  const sameLocationMinutes = config.same_location_minutes ?? 5;
  const useMatrix = config.use_travel_times_matrix !== false;
  const enforce = config.enforce ?? 'hard';

  for (const booking of ctx.existingBookings) {
    const bookingStartMs = new Date(booking.start_time).getTime();
    const bookingEndMs = new Date(booking.end_time).getTime();

    let requiredBufferMinutes = defaultMinutes;

    if (booking.meeting_point_id === ctx.meetingPointId && ctx.meetingPointId !== null) {
      requiredBufferMinutes = sameLocationMinutes;
    } else if (useMatrix && ctx.travelTimes.length > 0) {
      const travelTime = findTravelTime(
        ctx.travelTimes,
        booking.meeting_point_id ?? null,
        ctx.meetingPointId
      );
      if (travelTime !== null) {
        requiredBufferMinutes = travelTime;
      }
    }

    const bufferMs = requiredBufferMinutes * 60 * 1000;

    const newEndsBeforeExisting = ctx.endMs + bufferMs <= bookingStartMs;
    const newStartsAfterExisting = ctx.startMs >= bookingEndMs + bufferMs;

    if (!newEndsBeforeExisting && !newStartsAfterExisting) {
      const errorOrWarning = {
        rule_type: 'travel_buffer' as const,
        rule_id: rule.id,
        message: `Insufficient travel time (need ${requiredBufferMinutes} minutes buffer)`,
        message_en: config.message_en ?? `Insufficient travel time (need ${requiredBufferMinutes} minutes buffer)`,
        message_it: config.message_it ?? `Serve più tempo per spostarsi (${requiredBufferMinutes} minuti)`,
        details: { required_minutes: requiredBufferMinutes },
      };

      if (enforce === 'hard') {
        return { error: errorOrWarning };
      } else {
        return {
          warning: {
            ...errorOrWarning,
            can_override: true,
            suggestion: 'Consider allowing more time between bookings',
          },
        };
      }
    }
  }

  return {};
}

function validateDailyLimit(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as DailyLimitConfig;
  const maxBookings = config.max_bookings_per_day;
  const maxHours = config.max_hours_per_day;

  const bookingDate = new Date(ctx.startTime).toISOString().split('T')[0];

  const sameDayBookings = ctx.existingBookings.filter(b => {
    const bDate = new Date(b.start_time).toISOString().split('T')[0];
    return bDate === bookingDate;
  });

  if (maxBookings !== undefined && sameDayBookings.length >= maxBookings) {
    return {
      error: {
        rule_type: 'daily_limit',
        rule_id: rule.id,
        message: `Maximum ${maxBookings} bookings per day`,
        message_en: config.message_en ?? `Maximum ${maxBookings} bookings per day`,
        message_it: config.message_it ?? `Massimo ${maxBookings} prenotazioni al giorno`,
        details: { max: maxBookings, current: sameDayBookings.length },
      },
    };
  }

  if (maxHours !== undefined) {
    const existingHours = sameDayBookings.reduce((sum, b) => {
      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time).getTime();
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);

    if (existingHours + ctx.durationHours > maxHours) {
      return {
        error: {
          rule_type: 'daily_limit',
          rule_id: rule.id,
          message: `Maximum ${maxHours} hours per day`,
          message_en: config.message_en ?? `Maximum ${maxHours} hours per day`,
          message_it: config.message_it ?? `Massimo ${maxHours} ore al giorno`,
          details: { max: maxHours, current: existingHours, requested: ctx.durationHours },
        },
      };
    }
  }

  return {};
}

function validateWeeklyLimit(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as WeeklyLimitConfig;
  const maxHours = config.max_hours_per_week ?? 40;
  const weekStart = config.week_start ?? 'monday';

  const bookingDate = new Date(ctx.startTime);
  const { weekStartDate, weekEndDate } = getWeekBounds(bookingDate, weekStart);

  const sameWeekBookings = ctx.existingBookings.filter(b => {
    const bDate = new Date(b.start_time);
    return bDate >= weekStartDate && bDate < weekEndDate;
  });

  const existingHours = sameWeekBookings.reduce((sum, b) => {
    const start = new Date(b.start_time).getTime();
    const end = new Date(b.end_time).getTime();
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0);

  if (existingHours + ctx.durationHours > maxHours) {
    return {
      error: {
        rule_type: 'weekly_limit',
        rule_id: rule.id,
        message: `Maximum ${maxHours} hours per week`,
        message_en: config.message_en ?? `Maximum ${maxHours} hours per week`,
        message_it: config.message_it ?? `Massimo ${maxHours} ore a settimana`,
        details: { max: maxHours, current: existingHours, requested: ctx.durationHours },
      },
    };
  }

  return {};
}

function validateGapProtection(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as GapProtectionConfig;
  const minUsefulGapHours = config.min_useful_gap_hours ?? 2;

  for (const booking of ctx.existingBookings) {
    const bookingStartMs = new Date(booking.start_time).getTime();
    const bookingEndMs = new Date(booking.end_time).getTime();

    const gapBefore = (ctx.startMs - bookingEndMs) / (1000 * 60 * 60);
    const gapAfter = (bookingStartMs - ctx.endMs) / (1000 * 60 * 60);

    if ((gapBefore > 0 && gapBefore < minUsefulGapHours) ||
        (gapAfter > 0 && gapAfter < minUsefulGapHours)) {
      const actualGap = gapBefore > 0 ? gapBefore : gapAfter;
      return {
        warning: {
          rule_type: 'gap_protection',
          rule_id: rule.id,
          message: `This creates a ${Math.round(actualGap * 60)} minute gap`,
          message_en: config.message_en ?? `This slot creates a small gap (${Math.round(actualGap * 60)} min)`,
          message_it: config.message_it ?? `Questo slot crea un buco di ${Math.round(actualGap * 60)} minuti`,
          can_override: true,
          suggestion: 'Consider choosing a different time to avoid gaps',
        },
      };
    }
  }

  return {};
}

function validateFullWeekPreference(rule: InstructorBookingRule, ctx: ValidationContext): SingleRuleResult {
  const config = rule.config as FullWeekPreferenceConfig;
  const minConsecutiveDays = config.min_consecutive_days ?? 5;
  const discountPercent = config.discount_percent ?? 10;
  const blockPartialWithinDays = config.block_partial_within_days ?? 14;
  const allowPartialIfWeekHasBookings = config.allow_partial_if_week_has_bookings !== false;
  const allowLastMinuteDays = config.allow_last_minute_days ?? 3;

  const bookingDate = new Date(ctx.startTime);
  const daysUntilBooking = (ctx.startMs - ctx.nowMs) / (1000 * 60 * 60 * 24);

  if (daysUntilBooking <= allowLastMinuteDays) {
    return {};
  }

  const { weekStartDate, weekEndDate } = getWeekBounds(bookingDate, 'monday');

  const sameWeekBookings = ctx.existingBookings.filter(b => {
    const bDate = new Date(b.start_time);
    return bDate >= weekStartDate && bDate < weekEndDate;
  });

  const bookedDays = new Set(sameWeekBookings.map(b => 
    new Date(b.start_time).toISOString().split('T')[0]
  ));

  if (allowPartialIfWeekHasBookings && bookedDays.size >= 2) {
    return {};
  }

  const newBookingDay = bookingDate.toISOString().split('T')[0];
  const totalDaysAfterBooking = bookedDays.size + (bookedDays.has(newBookingDay) ? 0 : 1);

  if (totalDaysAfterBooking < minConsecutiveDays && 
      daysUntilBooking > blockPartialWithinDays && 
      bookedDays.size < 2) {
    return {
      warning: {
        rule_type: 'full_week_preference',
        rule_id: rule.id,
        message: `Book ${minConsecutiveDays}+ days and save ${discountPercent}%`,
        message_en: config.message_en ?? `Book the full week (${minConsecutiveDays}+ days) and save ${discountPercent}%!`,
        message_it: config.message_it ?? `Prenota la settimana intera (${minConsecutiveDays}+ giorni) e risparmia il ${discountPercent}%!`,
        can_override: true,
        suggestion: `Consider booking ${minConsecutiveDays} or more consecutive days for a discount`,
      },
      discount: {
        rule_type: 'full_week_preference',
        rule_id: rule.id,
        percent: discountPercent,
        reason: `${minConsecutiveDays}+ day booking discount`,
      },
    };
  }

  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (PURE)
// ─────────────────────────────────────────────────────────────────────────────

function findTravelTime(
  travelTimes: MeetingPointTravelTime[],
  fromId: string | null,
  toId: string | null
): number | null {
  const direct = travelTimes.find(
    t => t.from_meeting_point_id === fromId && t.to_meeting_point_id === toId
  );
  if (direct) return direct.travel_minutes;

  const reverse = travelTimes.find(
    t => t.from_meeting_point_id === toId && t.to_meeting_point_id === fromId
  );
  if (reverse) return reverse.travel_minutes;

  const defaultTime = travelTimes.find(t => t.is_default);
  if (defaultTime) return defaultTime.travel_minutes;

  return null;
}

function getWeekBounds(date: Date, weekStart: 'monday' | 'sunday'): { weekStartDate: Date; weekEndDate: Date } {
  const d = new Date(date);
  const day = d.getDay();
  
  let diff: number;
  if (weekStart === 'monday') {
    diff = day === 0 ? -6 : 1 - day;
  } else {
    diff = -day;
  }

  const weekStartDate = new Date(d);
  weekStartDate.setDate(d.getDate() + diff);
  weekStartDate.setHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);

  return { weekStartDate, weekEndDate };
}

/**
 * Checks if a rule type is a "hard" rule (blocks booking).
 */
export function isHardRule(ruleType: BookingRuleType): boolean {
  return HARD_RULES.has(ruleType);
}
