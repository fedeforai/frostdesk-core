import { describe, it, expect } from 'vitest';
import {
  validateBookingRules,
  isHardRule,
  type BookingValidationInput,
} from './booking_rules_validator.js';
import type { InstructorBookingRule } from './booking_rules_repository.js';
import type { MeetingPointTravelTime } from './travel_times_repository.js';

function createRule(
  ruleType: InstructorBookingRule['rule_type'],
  config: Record<string, unknown>,
  overrides?: Partial<InstructorBookingRule>
): InstructorBookingRule {
  return {
    id: `rule-${ruleType}`,
    instructor_id: 'instructor-1',
    rule_type: ruleType,
    config,
    valid_from: null,
    valid_to: null,
    priority: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createInput(
  overrides?: Partial<BookingValidationInput>
): BookingValidationInput {
  const now = new Date('2026-03-13T10:00:00Z');
  return {
    startTime: '2026-03-14T10:00:00Z',
    endTime: '2026-03-14T12:00:00Z',
    meetingPointId: null,
    instructorId: 'instructor-1',
    now,
    rules: [],
    existingBookings: [],
    travelTimes: [],
    ...overrides,
  };
}

describe('booking_rules_validator', () => {
  describe('isHardRule', () => {
    it('returns true for hard rules', () => {
      expect(isHardRule('min_duration')).toBe(true);
      expect(isHardRule('advance_booking')).toBe(true);
      expect(isHardRule('max_advance')).toBe(true);
      expect(isHardRule('daily_limit')).toBe(true);
      expect(isHardRule('weekly_limit')).toBe(true);
    });

    it('returns false for soft rules', () => {
      expect(isHardRule('travel_buffer')).toBe(false);
      expect(isHardRule('gap_protection')).toBe(false);
      expect(isHardRule('full_week_preference')).toBe(false);
    });
  });

  describe('validateBookingRules with no rules', () => {
    it('returns valid when no rules are configured', () => {
      const input = createInput();
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('returns invalid for invalid time range', () => {
      const input = createInput({
        startTime: '2026-03-14T12:00:00Z',
        endTime: '2026-03-14T10:00:00Z',
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('min_duration');
    });
  });

  describe('min_duration rule', () => {
    it('blocks booking shorter than minimum', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T10:30:00Z',
        rules: [createRule('min_duration', { min_hours: 1 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('min_duration');
      expect(result.errors[0].details).toEqual({ required: 1, actual: 0.5 });
    });

    it('allows booking at or above minimum', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        rules: [createRule('min_duration', { min_hours: 2 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('advance_booking rule', () => {
    it('blocks booking with insufficient advance notice', () => {
      const now = new Date('2026-03-14T09:00:00Z');
      const input = createInput({
        now,
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        rules: [createRule('advance_booking', { min_hours_advance: 24 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('advance_booking');
    });

    it('allows booking with sufficient advance notice', () => {
      const now = new Date('2026-03-13T08:00:00Z');
      const input = createInput({
        now,
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        rules: [createRule('advance_booking', { min_hours_advance: 24 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });
  });

  describe('max_advance rule', () => {
    it('blocks booking too far in advance', () => {
      const now = new Date('2026-03-13T10:00:00Z');
      const input = createInput({
        now,
        startTime: '2026-06-13T10:00:00Z',
        endTime: '2026-06-13T12:00:00Z',
        rules: [createRule('max_advance', { max_days_advance: 60 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('max_advance');
    });

    it('allows booking within max advance window', () => {
      const now = new Date('2026-03-13T10:00:00Z');
      const input = createInput({
        now,
        startTime: '2026-04-13T10:00:00Z',
        endTime: '2026-04-13T12:00:00Z',
        rules: [createRule('max_advance', { max_days_advance: 60 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });
  });

  describe('travel_buffer rule', () => {
    it('blocks booking without sufficient travel time (hard mode)', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:05:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: 'mp-2' },
        ],
        rules: [createRule('travel_buffer', { default_minutes: 15, enforce: 'hard' })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('travel_buffer');
    });

    it('allows booking with sufficient travel time', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:30:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: 'mp-2' },
        ],
        rules: [createRule('travel_buffer', { default_minutes: 15, enforce: 'hard' })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });

    it('uses smaller buffer for same location', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        meetingPointId: 'mp-1',
        existingBookings: [
          { start_time: '2026-03-14T12:05:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: 'mp-1' },
        ],
        rules: [createRule('travel_buffer', { default_minutes: 15, same_location_minutes: 5, enforce: 'hard' })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });

    it('uses travel times matrix when available', () => {
      const travelTimes: MeetingPointTravelTime[] = [
        {
          id: 'tt-1',
          instructor_id: 'instructor-1',
          from_meeting_point_id: null,
          to_meeting_point_id: null,
          travel_minutes: 30,
          is_default: true,
          created_at: new Date().toISOString(),
        },
      ];
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:20:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: 'mp-2' },
        ],
        travelTimes,
        rules: [createRule('travel_buffer', { default_minutes: 15, use_travel_times_matrix: true, enforce: 'hard' })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
    });

    it('returns warning in soft mode', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T12:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:05:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: 'mp-2' },
        ],
        rules: [createRule('travel_buffer', { default_minutes: 15, enforce: 'soft' })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].rule_type).toBe('travel_buffer');
      expect(result.warnings[0].can_override).toBe(true);
    });
  });

  describe('daily_limit rule', () => {
    it('blocks when exceeding daily hours limit', () => {
      const input = createInput({
        startTime: '2026-03-14T14:00:00Z',
        endTime: '2026-03-14T18:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T08:00:00Z', end_time: '2026-03-14T13:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('daily_limit', { max_hours_per_day: 8 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('daily_limit');
    });

    it('allows when within daily hours limit', () => {
      const input = createInput({
        startTime: '2026-03-14T14:00:00Z',
        endTime: '2026-03-14T16:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T08:00:00Z', end_time: '2026-03-14T12:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('daily_limit', { max_hours_per_day: 8 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });

    it('blocks when exceeding daily bookings limit', () => {
      const input = createInput({
        startTime: '2026-03-14T16:00:00Z',
        endTime: '2026-03-14T17:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T08:00:00Z', end_time: '2026-03-14T10:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-14T11:00:00Z', end_time: '2026-03-14T12:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-14T14:00:00Z', end_time: '2026-03-14T15:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('daily_limit', { max_bookings_per_day: 3 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('weekly_limit rule', () => {
    it('blocks when exceeding weekly hours limit', () => {
      const input = createInput({
        startTime: '2026-03-13T10:00:00Z',
        endTime: '2026-03-13T18:00:00Z',
        existingBookings: [
          { start_time: '2026-03-09T08:00:00Z', end_time: '2026-03-09T16:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-10T08:00:00Z', end_time: '2026-03-10T16:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-11T08:00:00Z', end_time: '2026-03-11T16:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-12T08:00:00Z', end_time: '2026-03-12T16:00:00Z', meeting_point_id: null },
          { start_time: '2026-03-13T08:00:00Z', end_time: '2026-03-13T10:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('weekly_limit', { max_hours_per_week: 40 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('weekly_limit');
    });

    it('allows when within weekly hours limit', () => {
      const input = createInput({
        startTime: '2026-03-13T14:00:00Z',
        endTime: '2026-03-13T16:00:00Z',
        existingBookings: [
          { start_time: '2026-03-09T08:00:00Z', end_time: '2026-03-09T16:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('weekly_limit', { max_hours_per_week: 40 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });
  });

  describe('gap_protection rule', () => {
    it('warns when creating a small gap', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T11:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:00:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('gap_protection', { min_useful_gap_hours: 2 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].rule_type).toBe('gap_protection');
    });

    it('does not warn when gap is large enough', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T11:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T14:00:00Z', end_time: '2026-03-14T16:00:00Z', meeting_point_id: null },
        ],
        rules: [createRule('gap_protection', { min_useful_gap_hours: 2 })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validation order', () => {
    it('stops at first hard error', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T10:30:00Z',
        rules: [
          createRule('min_duration', { min_hours: 1 }),
          createRule('advance_booking', { min_hours_advance: 48 }),
        ],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule_type).toBe('min_duration');
    });

    it('collects all soft warnings', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T11:00:00Z',
        existingBookings: [
          { start_time: '2026-03-14T12:00:00Z', end_time: '2026-03-14T14:00:00Z', meeting_point_id: null },
        ],
        rules: [
          createRule('travel_buffer', { default_minutes: 15, enforce: 'soft' }),
          createRule('gap_protection', { min_useful_gap_hours: 2 }),
        ],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('inactive rules', () => {
    it('ignores inactive rules', () => {
      const input = createInput({
        startTime: '2026-03-14T10:00:00Z',
        endTime: '2026-03-14T10:30:00Z',
        rules: [createRule('min_duration', { min_hours: 1 }, { is_active: false })],
      });
      const result = validateBookingRules(input);

      expect(result.valid).toBe(true);
    });
  });
});
